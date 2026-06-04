import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectId = 'pai-monitor-2026';
const bucketName = 'pai-claims-data-2026';
const localFilePath = path.join(__dirname, '..', 'public', 'imported_claims.json');

// Läs Firebase CLI:s access token
function getAccessToken() {
  try {
    const configPath = '/Users/tops/.config/configstore/firebase-tools.json';
    if (!fs.existsSync(configPath)) {
      throw new Error(`Hittade inte Firebase-konfigurationen på ${configPath}`);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.tokens?.access_token;
    if (!token) {
      throw new Error('Hittade inget access_token i Firebase-konfigurationen.');
    }
    return token;
  } catch (err) {
    console.error('Kunde inte läsa inloggningsuppgifter:', err.message);
    process.exit(1);
  }
}

async function apiRequest(url, method = 'GET', body = null, headers = {}) {
  const token = getAccessToken();
  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...headers
  };

  const options = {
    method,
    headers: defaultHeaders
  };

  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP Fel ${response.status}: ${text}`);
  }
  return response.json();
}

async function main() {
  try {
    console.log('==================================================');
    console.log('GCP STORAGE SETUP: SKAPAR OCH KONFIGURERAR BUCKET...');
    console.log('==================================================');

    // 1. Skapa bucket
    console.log(`1. Försöker skapa GCS-bucket "${bucketName}" i region "EU"...`);
    try {
      const createUrl = `https://storage.googleapis.com/storage/v1/b?project=${projectId}`;
      await apiRequest(createUrl, 'POST', {
        name: bucketName,
        location: 'EU',
        storageClass: 'STANDARD'
      });
      console.log(' -> Bucket skapad framgångsrikt!');
    } catch (err) {
      const errMsg = err.message.toLowerCase();
      if (errMsg.includes('already own') || errMsg.includes('conflict')) {
        console.log(' -> Bucketen finns redan (eller ägs redan av dig). Fortsätter...');
      } else {
        throw err;
      }
    }

    // 2. Sätt CORS-inställningar
    console.log('2. Konfigurerar CORS på bucketen...');
    const corsUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}`;
    await apiRequest(corsUrl, 'PATCH', {
      cors: [
        {
          origin: ['*'],
          method: ['GET', 'HEAD', 'OPTIONS'],
          responseHeader: ['Content-Type', 'Cache-Control'],
          maxAgeSeconds: 3600
        }
      ]
    });
    console.log(' -> CORS konfigurerat för alla domäner (*).');

    // 3. Ladda upp start-JSON
    console.log(`3. Laddar upp startfil ${localFilePath}...`);
    const fileContent = fs.readFileSync(localFilePath, 'utf8');
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=imported_claims.json`;
    await apiRequest(uploadUrl, 'POST', fileContent, {
      'Content-Type': 'application/json'
    });
    console.log(' -> Startfil uppladdad.');

    // 3.5 Sätt metadata för att förhindra cachelagring
    console.log('3.5 Sätter Cache-Control på filen...');
    const metaUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/imported_claims.json`;
    await apiRequest(metaUrl, 'PATCH', {
      cacheControl: 'no-cache, no-store, must-revalidate'
    });
    console.log(' -> Cache-Control satt till no-cache, no-store, must-revalidate.');

    // 4. Gör filen offentligt läsbar (allUsers: READER)
    console.log('4. Konfigurerar filen som offentligt läsbar (allUsers -> READER)...');
    const aclUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/imported_claims.json/acl`;
    await apiRequest(aclUrl, 'POST', {
      entity: 'allUsers',
      role: 'READER'
    });
    console.log(' -> Filen är nu tillgänglig offentligt!');
    console.log(`URL: https://storage.googleapis.com/${bucketName}/imported_claims.json`);
    console.log('==================================================');

  } catch (error) {
    console.error('FEL under konfigurationen:', error);
    process.exit(1);
  }
}

main();
