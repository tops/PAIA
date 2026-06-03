import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectId = 'pai-monitor-2026';
const bucketName = 'pai-claims-data-2026';
const region = 'europe-west1';
const repoName = 'pai-repo';
const imageName = `europe-west1-docker.pkg.dev/${projectId}/${repoName}/scraper:latest`;
const jobId = 'pai-scraper-job';

function getAccessToken() {
  try {
    const configPath = '/Users/tops/.config/configstore/firebase-tools.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.tokens?.access_token;
    if (!token) throw new Error('Hittade inget access_token.');
    return token;
  } catch (err) {
    console.error('Kunde inte hämta access_token:', err.message);
    process.exit(1);
  }
}

async function apiRequest(url, method = 'GET', body = null, headers = {}) {
  const token = getAccessToken();
  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    ...headers
  };

  // Only default to application/json if no Content-Type is provided
  if (!defaultHeaders['Content-Type'] && !defaultHeaders['content-type']) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const options = { method, headers: defaultHeaders };
  if (body) {
    if (Buffer.isBuffer(body)) {
      options.body = body;
    } else {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  const response = await fetch(url, options);
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`HTTP Fel ${response.status}: ${text}`);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return { status: 'success', raw: text };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    console.log('==================================================');
    console.log('DEPLOY SCRAPER: STARTAR DISTRIBUERING TILL CLOUD RUN...');
    console.log('==================================================');

    // Hämta projektets nummer först så vi har det tillgängligt
    console.log('Hämtar projektnummer...');
    const projectDetailsUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`;
    const projectDetails = await apiRequest(projectDetailsUrl, 'GET');
    const projectNumber = projectDetails.projectNumber;
    console.log(` -> Projektnummer: ${projectNumber}`);

    // 1. Aktivera API:er
    const apis = [
      'cloudbuild.googleapis.com',
      'artifactregistry.googleapis.com',
      'run.googleapis.com',
      'cloudscheduler.googleapis.com'
    ];
    
    for (const api of apis) {
      console.log(`1. Aktiverar API: ${api}...`);
      const url = `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${api}:enable`;
      await apiRequest(url, 'POST');
    }
    console.log(' -> Alla API:er är aktiverade/köade.');
    console.log('Väntar 10 sekunder på att API-aktiveringarna ska propageras...');
    await sleep(10000);

    // 2. Skapa Artifact Registry Repository
    console.log(`2. Skapar Artifact Registry-repository "${repoName}"...`);
    const repoUrl = `https://artifactregistry.googleapis.com/v1/projects/${projectId}/locations/${region}/repositories?repositoryId=${repoName}`;
    try {
      await apiRequest(repoUrl, 'POST', {
        format: 'DOCKER',
        description: 'Repository för PAI Scraper'
      });
      console.log(' -> Repository skapat.');
    } catch (err) {
      if (err.message.includes('AlreadyExists') || err.message.includes('already exists')) {
        console.log(' -> Repository finns redan. Fortsätter...');
      } else {
        throw err;
      }
    }

    // 3. Paketera källkoden till tar.gz
    console.log('3. Paketerar källkoden (scripts, Dockerfile, package.json)...');
    const tarPath = path.join(__dirname, '..', 'source.tar.gz');
    execSync(`COPYFILE_DISABLE=1 tar --exclude="node_modules" --exclude=".git" --exclude="dist" -czf "${tarPath}" Dockerfile package.json package-lock.json scripts/`, {
      cwd: path.join(__dirname, '..')
    });
    console.log(' -> Källkod paketerad i source.tar.gz.');

    // 4. Ladda upp tar.gz till GCS
    console.log(`4. Laddar upp source.tar.gz till gs://${bucketName}/source.tar.gz...`);
    const fileContent = fs.readFileSync(tarPath);
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=source.tar.gz`;
    await apiRequest(uploadUrl, 'POST', fileContent, {
      'Content-Type': 'application/gzip'
    });
    console.log(' -> source.tar.gz uppladdad till GCS.');
    
    // Städa upp lokal tar.gz fil
    fs.unlinkSync(tarPath);

    // 4.5 Konfigurerar IAM-rättigheter på GCS-bucketen för Cloud Build
    console.log('4.5 Konfigurerar IAM-rättigheter på GCS-bucketen för Cloud Build...');
    const iamUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/iam`;
    const currentIamPolicy = await apiRequest(iamUrl, 'GET');
    
    // Hitta eller skapa binding för roles/storage.objectViewer
    if (!currentIamPolicy.bindings) currentIamPolicy.bindings = [];
    let viewerBinding = currentIamPolicy.bindings.find(b => b.role === 'roles/storage.objectViewer');
    if (!viewerBinding) {
      viewerBinding = { role: 'roles/storage.objectViewer', members: [] };
      currentIamPolicy.bindings.push(viewerBinding);
    }
    
    const serviceAccounts = [
      `serviceAccount:${projectNumber}@cloudbuild.gserviceaccount.com`,
      `serviceAccount:service-${projectNumber}@gcp-sa-cloudbuild.iam.gserviceaccount.com`,
      `serviceAccount:${projectNumber}-compute@developer.gserviceaccount.com`
    ];
    
    serviceAccounts.forEach(sa => {
      if (!viewerBinding.members.includes(sa)) {
        viewerBinding.members.push(sa);
      }
    });
    
    await apiRequest(iamUrl, 'PUT', currentIamPolicy);
    console.log(' -> IAM-rättigheter uppdaterade. Cloud Build har nu läsbehörighet.');

    // 5. Starta Google Cloud Build
    console.log('5. Startar Google Cloud Build för att bygga containern...');
    const buildUrl = `https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds`;
    const buildJob = await apiRequest(buildUrl, 'POST', {
      source: {
        storageSource: {
          bucket: bucketName,
          object: 'source.tar.gz'
        }
      },
      steps: [
        {
          name: 'gcr.io/cloud-builders/docker',
          args: ['build', '-t', imageName, '.']
        }
      ],
      images: [imageName]
    });
    
    const buildId = buildJob.metadata.build.id;
    console.log(` -> Bygge startat med Build ID: ${buildId}`);
    
    // Polla bygget tills det är klart
    console.log('Väntar på att Cloud Build ska bygga containern (detta tar ca 1-2 minuter)...');
    let buildComplete = false;
    const statusUrl = `https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds/${buildId}`;
    
    while (!buildComplete) {
      await sleep(15000); // Vänta 15s
      const buildStatus = await apiRequest(statusUrl, 'GET');
      const status = buildStatus.status;
      console.log(`   -> Status: ${status}`);
      if (status === 'SUCCESS') {
        buildComplete = true;
        console.log(' -> Cloud Build lyckades! Container sparad i Artifact Registry.');
      } else if (['FAILURE', 'INTERNAL_ERROR', 'TIMEOUT', 'CANCELLED'].includes(status)) {
        throw new Error(`Cloud Build misslyckades med status: ${status}`);
      }
    }

    // 6. Skapa Cloud Run Jobb
    console.log(`6. Skapar/Uppdaterar Cloud Run Jobb "${jobId}"...`);
    const runUrl = `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs`;
    
    // Kontrollera om jobbet redan finns
    let jobExists = false;
    try {
      await apiRequest(`${runUrl}/${jobId}`, 'GET');
      jobExists = true;
    } catch (e) {
      // Jobbet finns inte, vi skapar det
    }

    const jobConfig = {
      template: {
        template: {
          containers: [
            {
              image: imageName,
              env: [
                {
                  name: 'BUCKET_NAME',
                  value: bucketName
                }
              ]
            }
          ]
        }
      }
    };

    if (jobExists) {
      console.log(' -> Uppdaterar befintligt Cloud Run-jobb...');
      await apiRequest(`${runUrl}/${jobId}`, 'PATCH', jobConfig);
    } else {
      console.log(' -> Skapar nytt Cloud Run-jobb...');
      await apiRequest(`${runUrl}?jobId=${jobId}`, 'POST', jobConfig);
    }
    console.log(' -> Cloud Run-jobb konfigurerat.');

    // 7. Cloud Run-jobb klart
    console.log('7. Cloud Run-jobb har skapats/uppdaterats.');

    // 8. Skapa Cloud Scheduler Jobb för att trigga körning varje dygn (04:00 UTC)
    console.log('8. Skapar/Uppdaterar Cloud Scheduler-jobb...');
    const schedulerUrl = `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/${region}/jobs`;
    const schedulerJobId = 'pai-daily-scraper-trigger';
    
    let schedulerExists = false;
    try {
      await apiRequest(`${schedulerUrl}/${schedulerJobId}`, 'GET');
      schedulerExists = true;
    } catch (e) {
      // Finns inte
    }

    // Service Account e-post som ska användas för att trigga jobbet (det krävs OIDC token)
    const serviceAccountEmail = `${projectNumber}-compute@developer.gserviceaccount.com`;

    const schedulerConfig = {
      name: `projects/${projectId}/locations/${region}/jobs/${schedulerJobId}`,
      description: 'Triggar PAI Scraper-jobbet varje natt',
      schedule: '0 4 * * *', // Varje natt kl 04:00
      timeZone: 'Europe/Stockholm',
      httpTarget: {
        uri: `https://${region}-run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobId}:run`,
        httpMethod: 'POST',
        headers: {
          'User-Agent': 'Google-Cloud-Scheduler'
        },
        oidcToken: {
          serviceAccountEmail,
          audience: `https://${region}-run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobId}:run`
        }
      }
    };

    if (schedulerExists) {
      console.log(' -> Uppdaterar befintligt Cloud Scheduler-jobb...');
      await apiRequest(`${schedulerUrl}/${schedulerJobId}`, 'PATCH', schedulerConfig);
    } else {
      console.log(' -> Skapar nytt Cloud Scheduler-jobb...');
      await apiRequest(`${schedulerUrl}`, 'POST', schedulerConfig);
    }
    
    console.log('==================================================');
    console.log('DISTRIBUERING OCH SCHEMALÄGGNING KLAR!');
    console.log(`- Container-avbildning: ${imageName}`);
    console.log(`- Cloud Run Job:       ${jobId}`);
    console.log(`- Schemaläggning:      Varje natt kl 04:00 (via Cloud Scheduler)`);
    console.log('==================================================');

  } catch (error) {
    console.error('FEL under driftsättning av skraparen:', error);
    process.exit(1);
  }
}

main();
