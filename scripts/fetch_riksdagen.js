import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to query Riksdagen API
function fetchQuery(q, sz = 300) {
  const url = `https://data.riksdagen.se/dokumentlista/?sok=${encodeURIComponent(q)}&doktyp=mot,prop,ip,frg,bet,skr&rm=2025%2F26%2C2024%2F25%2C2023%2F24&utst=1&sort=datum&sortorder=desc&utskotthandlingar=0&a=s&utformat=json&sz=${sz}`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.dokumentlista.dokument || []);
        } catch(e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

console.log('Startar omfattande flerstegs-inhämtning från Riksdagens API...');

Promise.all([
  fetchQuery('artificiell intelligens', 300),
  fetchQuery('maskininlärning', 100),
  fetchQuery('algoritmer', 200)
]).then((results) => {
  const allDocs = [].concat(...results);
  const uniqueDocsMap = new Map();

  allDocs.forEach(doc => {
    if (doc && doc.dok_id) {
      uniqueDocsMap.set(doc.dok_id, doc);
    }
  });

  const docList = Array.from(uniqueDocsMap.values());
  console.log(`Hämtade totalt ${allDocs.length} dokument. Efter deduplicering har vi ${docList.length} unika politiska dokument!`);

  const mappedClaims = docList.map((doc) => {
    const title = doc.titel || '';
    const preview = doc.summary || doc.notis || title;
    const textToAnalyze = (title + ' ' + preview).toLowerCase();
    const authorText = doc.undertitel || doc.subtitel || '';
    const doktyp = (doc.doktyp || '').toLowerCase();

    // 1. Determine Actor, ActorType, Party & Weight based on Document Type
    let actor = 'Riksdagsledamot';
    let party = 'Externt';
    let actorType = 'Enskild riksdagsledamot';
    let partyBearing = 'Medel';
    let sourceWeight = 3;
    let sourceType = 'Motion';

    // Source Type Mapping
    if (doktyp === 'prop' || doktyp === 'skr') {
      sourceType = doktyp === 'prop' ? 'Regeringsbeslut' : 'Strategi';
      sourceWeight = 5;
      actorType = 'Regering';
      partyBearing = 'Hög';

      const docDate = doc.datum || '';
      if (docDate < '2021-11-30') {
        actor = 'Regeringen Löfven';
        party = 'S';
      } else if (docDate < '2022-10-18') {
        actor = 'Regeringen Andersson';
        party = 'S';
      } else {
        actor = 'Regeringen Kristersson';
        party = 'M';
      }
    } else if (doktyp === 'bet') {
      sourceType = 'Strategi';
      sourceWeight = 4;
      actorType = 'Riksdagsutskott';
      party = 'Externt';
      partyBearing = 'Medel';

      const sourceCode = (doc.detalj || doc.titel || doc.dok_id || '').trim();
      const commMatch = sourceCode.match(/([A-Za-zåäöÅÄÖ]+U)\d+/);
      let committeeName = 'Riksdagsutskottet';
      if (commMatch) {
        const code = commMatch[1];
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
        committeeName = committeeNames[code] || `${code}-utskottet`;
      }
      actor = committeeName;
    } else if (doktyp === 'ip') {
      sourceType = 'Intervju';
      sourceWeight = 3;
    } else if (doktyp === 'frg') {
      sourceType = 'Pressmeddelande';
      sourceWeight = 3;
    } else {
      sourceType = 'Motion';
      sourceWeight = 3;
    }

    // Try to parse individual author if not government/committee
    if (doktyp !== 'prop' && doktyp !== 'skr' && doktyp !== 'bet') {
      // 1. Try to parse using structured dokintressent if available
      let foundStructured = false;
      if (doc.dokintressent && doc.dokintressent.intressent) {
        const intr = doc.dokintressent.intressent;
        const intressenter = Array.isArray(intr) ? intr : [intr];
        const undertecknare = intressenter.find(i => i.roll === 'undertecknare');
        if (undertecknare && undertecknare.namn) {
          actor = undertecknare.namn.trim();
          if (undertecknare.partibet) {
            party = undertecknare.partibet.trim().toUpperCase();
            foundStructured = true;
          }
        }
      }

      // 2. Fallback to regex parsing if structured check failed
      if (!foundStructured) {
        const partyMatch = authorText.match(/\((S|M|SD|C|V|MP|L|KD)\)/i);
        if (partyMatch) {
          party = partyMatch[1].toUpperCase();
          const nameMatch = authorText.match(/av\s+([^(\n]+)/i);
          if (nameMatch) {
            actor = nameMatch[1].trim().replace(/\s+m\.fl\./i, '');
          } else {
            const prePartyMatch = authorText.match(/^([^(\n]+)/i);
            if (prePartyMatch) {
              actor = prePartyMatch[1].trim().replace(/\s+m\.fl\./i, '');
            }
          }
        }
      }

      const isMultiAuthor = authorText.includes('m.fl.') || 
                            authorText.includes('partimotion') || 
                            authorText.includes('kommittémotion') || 
                            (doc.dokintressent && Array.isArray(doc.dokintressent.intressent) && doc.dokintressent.intressent.filter(i => i.roll === 'undertecknare').length > 1);

      if (isMultiAuthor) {
        actorType = 'Riksdagsgrupp';
        partyBearing = 'Hög';
        sourceWeight = Math.max(sourceWeight, 4);
      }
    }

    // 2. Identify the Primary AI-Dimension (1-12) based on comprehensive keyword triggers
    let primaryDimension = 1; // Default: Styrning och politiskt ledarskap
    let tags = ['AI'];

    if (textToAnalyze.includes('skola') || textToAnalyze.includes('utbildning') || textToAnalyze.includes('lärare') || textToAnalyze.includes('skolverk') || textToAnalyze.includes('examination') || textToAnalyze.includes('universitet') || textToAnalyze.includes('högskola')) {
      primaryDimension = 6; // Arbetsmarknad och kompetens
      tags = ['utbildning', 'skola', 'kompetensförsörjning'];
    } else if (textToAnalyze.includes('säkerhet') || textToAnalyze.includes('försvar') || textToAnalyze.includes('cyber') || textToAnalyze.includes('totalförsvar') || textToAnalyze.includes('qwen') || textToAnalyze.includes('spionage') || textToAnalyze.includes('geopolitisk')) {
      primaryDimension = 9; // Säkerhet och totalförsvar
      tags = ['säkerhetsrisk', 'cyberförsvar', 'totalförsvar'];
    } else if (textToAnalyze.includes('tillsyn') || textToAnalyze.includes('imy') || textToAnalyze.includes('reglering') || textToAnalyze.includes('ai act') || textToAnalyze.includes('förordning') || textToAnalyze.includes('lagstiftning') || textToAnalyze.includes('integritetsskydd')) {
      primaryDimension = 4; // Reglering och tillsyn
      tags = ['AI Act', 'tillsyn', 'rättssäkerhet'];
    } else if (textToAnalyze.includes('välfärd') || textToAnalyze.includes('kommun') || textToAnalyze.includes('offentlig förvaltning') || textToAnalyze.includes('myndighetsbeslut') || textToAnalyze.includes('socialtjänst') || textToAnalyze.includes('sjukvård')) {
      primaryDimension = 5; // Offentlig förvaltning och välfärd
      tags = ['välfärd', 'offentlig sektor', 'effektivisering'];
    } else if (textToAnalyze.includes('energi') || textToAnalyze.includes('miljö') || textToAnalyze.includes('datacenter') || textToAnalyze.includes('hållbar') || textToAnalyze.includes('grön omställning') || textToAnalyze.includes('klimat')) {
      primaryDimension = 12; // Miljö, energi och hållbarhet
      tags = ['energi', 'datacenter', 'grön omställning'];
    } else if (textToAnalyze.includes('innovation') || textToAnalyze.includes('start-up') || textToAnalyze.includes('entreprenör') || textToAnalyze.includes('kommersialisering') || textToAnalyze.includes('vinnova')) {
      primaryDimension = 11; // Innovation, företagande och kommersialisering
      tags = ['innovation', 'företagande', 'techsektorn'];
    } else if (textToAnalyze.includes('demokrati') || textToAnalyze.includes('media') || textToAnalyze.includes('valet') || textToAnalyze.includes('valrörelse') || textToAnalyze.includes('desinfo') || textToAnalyze.includes('deepfake') || textToAnalyze.includes('trollkonto')) {
      primaryDimension = 8; // Demokrati, medier och informationspåverkan
      tags = ['demokrati', 'desinformation', 'deepfakes'];
    } else if (textToAnalyze.includes('språk') || textToAnalyze.includes('kultur') || textToAnalyze.includes('upphovsrätt') || textToAnalyze.includes('språkmodell') || textToAnalyze.includes('gpt-sw3') || textToAnalyze.includes(' digitaliser')) {
      primaryDimension = 10; // Språk, kultur, upphovsrätt och kunskapssuveränitet
      tags = ['språkresurser', 'upphovsrätt', 'språkmodeller'];
    } else if (textToAnalyze.includes('etik') || textToAnalyze.includes('rättigheter') || textToAnalyze.includes('diskriminering') || textToAnalyze.includes('mänskliga')) {
      primaryDimension = 7; // Etik, mänskliga rättigheter och inkludering
      tags = ['etik', 'mänskliga rättigheter', 'inkludering'];
    } else if (textToAnalyze.includes('superdator') || textToAnalyze.includes('beräkningskapacitet') || textToAnalyze.includes('datadelning') || textToAnalyze.includes('offentliga data')) {
      primaryDimension = 3; // Infrastruktur, data och beräkningskapacitet
      tags = ['infrastruktur', 'datadelning', 'beräkningskapacitet'];
    } else if (textToAnalyze.includes('ekonomi') || textToAnalyze.includes('tillväxt') || textToAnalyze.includes('produktivitet') || textToAnalyze.includes('konkurrenskraft') || textToAnalyze.includes('investering')) {
      primaryDimension = 2; // Ekonomi, produktivitet och konkurrenskraft
      tags = ['ekonomisk tillväxt', 'konkurrenskraft', 'investeringar'];
    } else if (textToAnalyze.includes('styrning') || textToAnalyze.includes('samordning') || textToAnalyze.includes('strategi') || textToAnalyze.includes('ledarskap') || textToAnalyze.includes('ai-kommissionen')) {
      primaryDimension = 1; // Styrning och politiskt ledarskap
      tags = ['politiskt ledarskap', 'strategi', 'samordning'];
    }

    // 3. Formulate Quote & Summary
    const cleanQuote = preview.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
    const originalQuote = cleanQuote.length > 240 ? cleanQuote.substring(0, 240) + '...' : cleanQuote;
    
    let docTypeName = 'Riksdagsmotion';
    if (doktyp === 'prop') docTypeName = 'Regeringsproposition';
    else if (doktyp === 'skr') docTypeName = 'Regeringsskrivelse';
    else if (doktyp === 'bet') docTypeName = 'Utskottsbetänkande';
    else if (doktyp === 'ip') docTypeName = 'Interpellationsdebatt';
    else if (doktyp === 'frg') docTypeName = 'Skriftlig fråga';

    const neutralSummary = `${docTypeName} ${doc.beteckning} från ${actor} rörande AI-politik och tillämpning.`;

    // 4. Decide Policygrad & index contributions
    let policyDegree = 2; // Default: Policyclaim
    let concretionDegree = 2;
    let investmentWill = 0;
    
    let accelerationContribution = 2;
    let protectionContribution = 2;
    let stateGovernanceContribution = 2;

    if (textToAnalyze.includes('inrätta') || textToAnalyze.includes('finansiera') || textToAnalyze.includes('avsätta') || textToAnalyze.includes('uppdrag') || textToAnalyze.includes('lagstifta')) {
      policyDegree = 3; // Skarp åtgärd
      concretionDegree = 3;
    }

    // Specific party patterns for acceleration, protection & state governance
    if (['M', 'KD', 'L'].includes(party)) {
      accelerationContribution = 4;
      protectionContribution = 1;
      stateGovernanceContribution = 2;
    } else if (['S', 'V', 'MP'].includes(party)) {
      accelerationContribution = 1;
      protectionContribution = 4;
      stateGovernanceContribution = 4;
    } else if (party === 'SD') {
      accelerationContribution = 2;
      protectionContribution = 4;
      stateGovernanceContribution = 3;
    } else if (party === 'C') {
      accelerationContribution = 3;
      protectionContribution = 3;
      stateGovernanceContribution = 2;
    }

    // Determine special AI track flags
    const nearAiFlag = textToAnalyze.includes('kundtjänst') || textToAnalyze.includes('samhällsfråga') || textToAnalyze.includes('digitalt utanförskap');
    const campaignPracticeFlag = textToAnalyze.includes('trollkonto') || textToAnalyze.includes('desinformation') || textToAnalyze.includes('kampanj') || textToAnalyze.includes('valrörelse');
    const externalPressureFlag = party === 'Externt';

    return {
      id: `riksdagen-${doc.dok_id}`,
      date: doc.datum,
      source: `${sourceType} ${doc.rm}:${doc.beteckning}`,
      sourceType,
      sourceWeight,
      actor,
      actorType,
      partyAffiliation: party,
      partyBearing,
      originalQuote,
      neutralSummary,
      claimType: textToAnalyze.includes('risk') ? 'Risk' : (policyDegree === 3 ? 'Åtgärd' : 'Värdering'),
      policyDegree,
      primaryDimension,
      secondaryDimensions: [],
      tags,
      concretionDegree,
      investmentWill,
      accelerationContribution,
      protectionContribution,
      stateGovernanceContribution,
      implementationMaturity: 1,
      evidenceStrength: 3,
      assessmentConfidence: 'Medel',
      nearAiFlag,
      campaignPracticeFlag,
      externalPressureFlag,
      reviewStatus: 'Ny', // Pre-coded claims land as "Ny" for human review
      comment: `Automatiskt inhämtat och förkodat claim från Riksdagen (${docTypeName}) för riksmöte ${doc.rm}.`
    };
  });

  // Write results to JSON file
  const outputPath = path.join(__dirname, '..', 'imported_claims.json');
  fs.writeFileSync(outputPath, JSON.stringify(mappedClaims, null, 2), 'utf-8');
  
  console.log('--------------------------------------------------');
  console.log(`Skarp data sparades framgångsrikt i: imported_claims.json`);
  console.log(`Totalt exporterades ${mappedClaims.length} st claims!`);
  console.log('Du kan nu ladda in dessa data direkt i Dashboarden med knappen "Återställ Standard" eller "Importera DB".');
  console.log('--------------------------------------------------');
}).catch(err => {
  console.error('Ett fel uppstod under flerstegs-inhämtningen:', err);
});
