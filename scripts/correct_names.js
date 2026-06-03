import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.join(__dirname, '..', 'imported_claims.json');

// Helper to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fetch document
function fetchDoc(id) {
  const url = `https://data.riksdagen.se/dokumentlista/?sok=${id}&utformat=json`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data && data.dokumentlista && data.dokumentlista.dokument) {
            const doc = data.dokumentlista.dokument;
            resolve(Array.isArray(doc) ? doc[0] : doc);
          } else {
            resolve(null);
          }
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  if (!fs.existsSync(databasePath)) {
    console.error('Database file not found!');
    return;
  }
  
  const claims = JSON.parse(fs.readFileSync(databasePath, 'utf-8'));
  console.log(`Laddade ${claims.length} claims från databasen.`);
  
  const genericClaims = claims.filter(c => c.id.startsWith('riksdagen-') && c.actor === 'Riksdagsledamot');
  console.log(`Hittade ${genericClaims.length} st claims taggade som "Riksdagsledamot".`);
  
  let correctedCount = 0;
  
  for (let i = 0; i < genericClaims.length; i++) {
    const claim = genericClaims[i];
    const docId = claim.id.replace('riksdagen-', '');
    
    console.log(`[${i+1}/${genericClaims.length}] Hämtar detaljer för ${docId}...`);
    const doc = await fetchDoc(docId);
    
    if (doc) {
      let realName = '';
      let realParty = '';
      
      // 1. Try dokintressent
      if (doc.dokintressent && doc.dokintressent.intressent) {
        const intr = doc.dokintressent.intressent;
        const intressenter = Array.isArray(intr) ? intr : [intr];
        const undertecknare = intressenter.find(i => i.roll === 'undertecknare');
        if (undertecknare && undertecknare.namn) {
          realName = undertecknare.namn.trim();
          if (undertecknare.partibet) {
            realParty = undertecknare.partibet.trim().toUpperCase();
          }
        }
      }
      
      // 2. Fallback to undertitel regex
      if (!realName) {
        const authorText = doc.undertitel || doc.subtitel || '';
        const partyMatch = authorText.match(/\((S|M|SD|C|V|MP|L|KD)\)/i);
        if (partyMatch) {
          realParty = partyMatch[1].toUpperCase();
          const nameMatch = authorText.match(/av\s+([^(\n]+)/i);
          if (nameMatch) {
            realName = nameMatch[1].trim().replace(/\s+m\.fl\./i, '');
          } else {
            const prePartyMatch = authorText.match(/^([^(\n]+)/i);
            if (prePartyMatch) {
              realName = prePartyMatch[1].trim().replace(/\s+m\.fl\./i, '');
            }
          }
        }
      }
      
      if (realName) {
        console.log(`  -> Hittade: ${realName} (${realParty || claim.partyAffiliation})`);
        
        // Find in original claims list and update
        const origClaim = claims.find(c => c.id === claim.id);
        if (origClaim) {
          origClaim.actor = realName;
          if (realParty) {
            origClaim.partyAffiliation = realParty;
          }
          origClaim.neutralSummary = origClaim.neutralSummary.replace('Riksdagsledamot', realName);
          correctedCount++;
        }
      } else {
        console.log(`  -> Kunde inte bestämma namnet för ${docId}.`);
      }
    } else {
      console.log(`  -> Misslyckades att hämta dokument ${docId}.`);
    }
    
    // Tiny delay to prevent throttling
    await sleep(250);
  }
  
  if (correctedCount > 0) {
    fs.writeFileSync(databasePath, JSON.stringify(claims, null, 2), 'utf-8');
    console.log(`Klar! Uppdaterade ${correctedCount} claims i imported_claims.json.`);
  } else {
    console.log('Inga ändringar gjordes.');
  }
}

run();
