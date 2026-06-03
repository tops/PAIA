import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.join(__dirname, '..', 'imported_claims.json');

const committeeNames = {
  'FiU': 'Finansutskottet',
  'UU': 'Utrikesutskottet',
  'NU': 'Näringsutskottet',
  'MJU': 'Miljö- och jordbruksutskottet',
  'UbU': 'Utbildningsutskottet',
  'SoU': 'Socialutskottet',
  'TU': 'Trafikutskottet',
  'SfU': 'Socialförsäkringsutskottet',
  'KrU': 'Kulturutskottet',
  'AU': 'Arbetsmarknadsutskottet',
  'KU': 'Konstitutionsutskottet',
  'SkU': 'Skatteutskottet',
  'JuU': 'Justitieutskottet',
  'CU': 'Civilutskottet',
  'FöU': 'Försvarsutskottet',
  'CiU': 'Civilutskottet'
};

async function run() {
  if (!fs.existsSync(databasePath)) {
    console.error('Database file not found!');
    return;
  }

  const claims = JSON.parse(fs.readFileSync(databasePath, 'utf-8'));
  console.log(`Laddade ${claims.length} claims från databasen.`);

  const utskottClaims = claims.filter(c => c.actor === 'Riksdagsutskottet');
  console.log(`Hittade ${utskottClaims.length} st claims taggade som "Riksdagsutskottet".`);

  let correctedCount = 0;

  for (const claim of utskottClaims) {
    const sourceText = claim.source || '';
    // E.g. "Strategi 2019/20:FiU20"
    const match = sourceText.match(/:([A-Za-zåäöÅÄÖ]+)\d+/);
    
    if (match) {
      const code = match[1];
      const realName = committeeNames[code] || `${code}-utskottet`;
      
      console.log(`Uppdaterar ${claim.id}: ${claim.source} -> ${realName}`);
      
      claim.actor = realName;
      claim.actorType = 'Riksdagsutskott';
      claim.neutralSummary = claim.neutralSummary
        .replace('Riksdagsutskottet', realName)
        .replace('riksdagsutskottet', realName);
      correctedCount++;
    } else {
      // Fallback from ID
      const idMatch = claim.id.match(/H\d+([A-Za-z]+)\d+/);
      if (idMatch) {
        const code = idMatch[1];
        const realName = committeeNames[code] || `${code}-utskottet`;
        console.log(`Uppdaterar via ID ${claim.id} -> ${realName}`);
        
        claim.actor = realName;
        claim.actorType = 'Riksdagsutskott';
        claim.neutralSummary = claim.neutralSummary
          .replace('Riksdagsutskottet', realName)
          .replace('riksdagsutskottet', realName);
        correctedCount++;
      }
    }
  }

  if (correctedCount > 0) {
    fs.writeFileSync(databasePath, JSON.stringify(claims, null, 2), 'utf-8');
    console.log(`Klar! Uppdaterade ${correctedCount} claims i imported_claims.json.`);
  } else {
    console.log('Inga ändringar gjordes.');
  }
}

run();
