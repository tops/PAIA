import { Storage } from '@google-cloud/storage';
import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bucketName = process.env.BUCKET_NAME;
const objectName = process.env.OBJECT_NAME || 'imported_claims.json';
const localFilePath = path.join(__dirname, '..', 'imported_claims.json');

if (!bucketName) {
  console.error('FEL: Miljövariabeln BUCKET_NAME måste vara angiven.');
  process.exit(1);
}

const storage = new Storage();

async function runScraperJob() {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    // 1. Ladda ner befintlig fil från GCS om den finns
    console.log(`[Cloud Run Scraper] Kontrollerar om gs://${bucketName}/${objectName} existerar...`);
    const [exists] = await file.exists();
    
    if (exists) {
      console.log(`[Cloud Run Scraper] Laddar ner gs://${bucketName}/${objectName} till ${localFilePath}...`);
      await file.download({ destination: localFilePath });
      console.log('[Cloud Run Scraper] Nedladdning klar.');
    } else {
      console.log('[Cloud Run Scraper] Ingen befintlig fil hittades i GCS. Skraparen kommer att starta från tom cache.');
      // Om filen inte finns, se till att det inte finns någon gammal lokal fil kvar
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    }

    // 2. Starta skrapningsskriptet i en separat process
    console.log('[Cloud Run Scraper] Startar fetch_all_sources.js...');
    const scraperPath = path.join(__dirname, 'fetch_all_sources.js');
    
    await new Promise((resolve, reject) => {
      const child = fork(scraperPath);
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Skraparen avslutades med felkod ${code}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });

    console.log('[Cloud Run Scraper] Skrapning klar.');

    // 3. Kontrollera att den nya filen genererades
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Skraparen lyckades inte skapa filen på ${localFilePath}`);
    }

    // 4. Ladda upp den uppdaterade filen till GCS
    console.log(`[Cloud Run Scraper] Laddar upp uppdaterad fil till gs://${bucketName}/${objectName}...`);
    await bucket.upload(localFilePath, {
      destination: objectName,
      metadata: {
        cacheControl: 'no-cache, no-store, must-revalidate',
        contentType: 'application/json',
      },
    });
    console.log('[Cloud Run Scraper] Uppladdning till GCS slutförd framgångsrikt!');

  } catch (error) {
    console.error('[Cloud Run Scraper] Ett allvarligt fel uppstod under körningen:', error);
    process.exit(1);
  }
}

runScraperJob();
