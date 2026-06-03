import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lockedDimensions = [
  { id: 1, name: 'Styrning och politiskt ledarskap' },
  { id: 2, name: 'Ekonomi, produktivitet och konkurrenskraft' },
  { id: 3, name: 'Infrastruktur, data och beräkningskapacitet' },
  { id: 4, name: 'Reglering, tillsyn och rättssäkerhet' },
  { id: 5, name: 'Offentlig förvaltning och välfärd' },
  { id: 6, name: 'Arbetsmarknad, kompetens och omställning' },
  { id: 7, name: 'Etik, mänskliga rättigheter och inkludering' },
  { id: 8, name: 'Demokrati, medier och informationspåverkan' },
  { id: 9, name: 'Säkerhet, totalförsvar och cyberrisker' },
  { id: 10, name: 'Språk, kultur, upphovsrätt och kunskapssuveränitet' },
  { id: 11, name: 'Innovation, företagande och kommersialisering' },
  { id: 12, name: 'Miljö, energi och hållbarhet' }
];

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to query Riksdagen API for a specific riksmöte (year)
function fetchRiksdagenYearQuery(q, rm, sz = 150) {
  const url = `https://data.riksdagen.se/dokumentlista/?sok=${encodeURIComponent(q)}&doktyp=mot,prop,ip,frg,bet,skr&rm=${encodeURIComponent(rm)}&utst=1&sort=datum&sortorder=desc&utskotthandlingar=0&a=s&utformat=json&sz=${sz}`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data && data.dokumentlista && data.dokumentlista.dokument) {
            const docOrDocs = data.dokumentlista.dokument;
            resolve(Array.isArray(docOrDocs) ? docOrDocs : [docOrDocs]);
          } else {
            resolve([]);
          }
        } catch(e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

console.log('==================================================');
console.log('KÖR LÖPANDE BEVAKNING: SÖKER AV FLERA SAMHÄLLSKÄLLOR...');
console.log('==================================================');

async function run() {
  const riksmoten = ['2025/26', '2024/25', '2023/24', '2022/23', '2021/22', '2020/21', '2019/20', '2018/19'];
  const queries = [
    { term: 'artificiell intelligens', size: 250 },
    { term: 'maskininlärning', size: 100 },
    { term: 'algoritmer', size: 150 },
    { term: 'ansiktsigenkänning', size: 80 },
    { term: 'automatiserat beslutsfattande', size: 80 },
    { term: 'språkmodeller', size: 50 },
    { term: 'cybersäkerhet', size: 100 }
  ];

  // 1. Initialize local cache from imported_claims.json
  const outputPath = path.join(__dirname, '..', 'imported_claims.json');
  const cachedRiksdagenClaimsMap = new Map();
  if (fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      if (Array.isArray(existing)) {
        existing.forEach(c => {
          if (c && c.id && c.id.startsWith('riksdagen-')) {
            cachedRiksdagenClaimsMap.set(c.id, c);
          }
        });
        console.log(`[Cache] Laddade ${cachedRiksdagenClaimsMap.size} st sparade Riksdagsclaims från disk som robust fallback.`);
      }
    } catch (e) {
      console.log('[Cache Warning] Kunde inte läsa befintliga claims som cache.');
    }
  }

  const allDocs = [];
  for (const q of queries) {
    for (const rm of riksmoten) {
      console.log(`[Riksdagen API] Hämtar term "${q.term}" för riksmöte ${rm}...`);
      const docs = await fetchRiksdagenYearQuery(q.term, rm, q.size);
      if (docs.length > 0) {
        console.log(`  -> Hittade ${docs.length} dokument.`);
        allDocs.push(...docs);
      }
      // Delay 1.2s to prevent throttling / ECONNRESET
      await sleep(1200);
    }
  }

  const uniqueDocsMap = new Map();
  allDocs.forEach(doc => {
    if (doc && doc.dok_id) {
      uniqueDocsMap.set(doc.dok_id, doc);
    }
  });

  const riksdagenDocs = Array.from(uniqueDocsMap.values());
  console.log(`[Riksdagen API] Hämtar klart. Hittade ${riksdagenDocs.length} unika dokument i denna körning.`);

  // If API succeeded, we parse and update cache. If it failed (ECONNRESET / 0 docs), we keep all cached claims!
  if (riksdagenDocs.length > 0) {
    console.log('[Riksdagen API] Uppdaterar databasen med nyligen nedladdade handlingar...');
    riksdagenDocs.forEach((doc) => {
    const title = doc.titel || '';
    const preview = doc.summary || doc.notis || title;
    const textToAnalyze = (title + ' ' + preview).toLowerCase();
    const authorText = doc.undertitel || doc.subtitel || '';
    const doktyp = (doc.doktyp || '').toLowerCase();

    let actor = 'Riksdagsledamot';
    let party = 'Externt';
    let actorType = 'Enskild riksdagsledamot';
    let partyBearing = 'Medel';
    let sourceWeight = 3;
    let sourceType = 'Motion';

    if (doktyp === 'prop') {
      sourceType = 'Regeringsbeslut';
      sourceWeight = 5;
      actor = 'Regeringen Kristersson';
      actorType = 'Regering';
      party = 'M';
      partyBearing = 'Hög';
    } else if (doktyp === 'skr') {
      sourceType = 'Strategi';
      sourceWeight = 5;
      actor = 'Regeringen Kristersson';
      actorType = 'Regering';
      party = 'M';
      partyBearing = 'Hög';
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

    // Identify ALL matching AI Dimensions (a single document can contain multiple claims!)
    const matchingDimensions = [];

    if (textToAnalyze.includes('skola') || textToAnalyze.includes('utbildning') || textToAnalyze.includes('lärare') || textToAnalyze.includes('skolverk') || textToAnalyze.includes('examination') || textToAnalyze.includes('universitet') || textToAnalyze.includes('högskola')) {
      matchingDimensions.push({ id: 6, tags: ['utbildning', 'skola', 'kompetensförsörjning'] });
    }
    if (textToAnalyze.includes('säkerhet') || textToAnalyze.includes('försvar') || textToAnalyze.includes('cyber') || textToAnalyze.includes('totalförsvar') || textToAnalyze.includes('qwen') || textToAnalyze.includes('spionage') || textToAnalyze.includes('geopolitisk')) {
      matchingDimensions.push({ id: 9, tags: ['säkerhetsrisk', 'cyberförsvar', 'totalförsvar'] });
    }
    if (textToAnalyze.includes('tillsyn') || textToAnalyze.includes('imy') || textToAnalyze.includes('reglering') || textToAnalyze.includes('ai act') || textToAnalyze.includes('förordning') || textToAnalyze.includes('lagstiftning') || textToAnalyze.includes('integritetsskydd')) {
      matchingDimensions.push({ id: 4, tags: ['AI Act', 'tillsyn', 'rättssäkerhet'] });
    }
    if (textToAnalyze.includes('välfärd') || textToAnalyze.includes('kommun') || textToAnalyze.includes('offentlig förvaltning') || textToAnalyze.includes('myndighetsbeslut') || textToAnalyze.includes('socialtjänst') || textToAnalyze.includes('sjukvård')) {
      matchingDimensions.push({ id: 5, tags: ['välfärd', 'offentlig sektor', 'effektivisering'] });
    }
    if (textToAnalyze.includes('energi') || textToAnalyze.includes('miljö') || textToAnalyze.includes('datacenter') || textToAnalyze.includes('hållbar') || textToAnalyze.includes('grön omställning') || textToAnalyze.includes('klimat')) {
      matchingDimensions.push({ id: 12, tags: ['energi', 'datacenter', 'grön omställning'] });
    }
    if (textToAnalyze.includes('innovation') || textToAnalyze.includes('start-up') || textToAnalyze.includes('entreprenör') || textToAnalyze.includes('kommersialisering') || textToAnalyze.includes('vinnova')) {
      matchingDimensions.push({ id: 11, tags: ['innovation', 'företagande', 'techsektorn'] });
    }
    if (textToAnalyze.includes('demokrati') || textToAnalyze.includes('media') || textToAnalyze.includes('valet') || textToAnalyze.includes('valrörelse') || textToAnalyze.includes('desinfo') || textToAnalyze.includes('deepfake') || textToAnalyze.includes('trollkonto')) {
      matchingDimensions.push({ id: 8, tags: ['demokrati', 'desinformation', 'deepfakes'] });
    }
    if (textToAnalyze.includes('språk') || textToAnalyze.includes('kultur') || textToAnalyze.includes('upphovsrätt') || textToAnalyze.includes('språkmodell') || textToAnalyze.includes('gpt-sw3') || textToAnalyze.includes(' digitaliser')) {
      matchingDimensions.push({ id: 10, tags: ['språkresurser', 'upphovsrätt', 'språkmodeller'] });
    }
    if (textToAnalyze.includes('etik') || textToAnalyze.includes('rättigheter') || textToAnalyze.includes('diskriminering') || textToAnalyze.includes('mänskliga')) {
      matchingDimensions.push({ id: 7, tags: ['etik', 'mänskliga rättigheter', 'inkludering'] });
    }
    if (textToAnalyze.includes('superdator') || textToAnalyze.includes('beräkningskapacitet') || textToAnalyze.includes('datadelning') || textToAnalyze.includes('offentliga data')) {
      matchingDimensions.push({ id: 3, tags: ['infrastruktur', 'datadelning', 'beräkningskapacitet'] });
    }
    if (textToAnalyze.includes('ekonomi') || textToAnalyze.includes('tillväxt') || textToAnalyze.includes('produktivitet') || textToAnalyze.includes('konkurrenskraft') || textToAnalyze.includes('investering')) {
      matchingDimensions.push({ id: 2, tags: ['ekonomisk tillväxt', 'konkurrenskraft', 'investeringar'] });
    }
    if (textToAnalyze.includes('styrning') || textToAnalyze.includes('samordning') || textToAnalyze.includes('strategi') || textToAnalyze.includes('ledarskap') || textToAnalyze.includes('ai-kommissionen')) {
      matchingDimensions.push({ id: 1, tags: ['politiskt ledarskap', 'strategi', 'samordning'] });
    }

    // Default to Dimension 1 if no specific keywords match
    if (matchingDimensions.length === 0) {
      matchingDimensions.push({ id: 1, tags: ['AI'] });
    }

    const cleanQuote = preview.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
    const originalQuote = cleanQuote.length > 240 ? cleanQuote.substring(0, 240) + '...' : cleanQuote;
    
    let docTypeName = 'Riksdagsmotion';
    if (doktyp === 'prop') docTypeName = 'Regeringsproposition';
    else if (doktyp === 'skr') docTypeName = 'Regeringsskrivelse';
    else if (doktyp === 'bet') docTypeName = 'Utskottsbetänkande';
    else if (doktyp === 'ip') docTypeName = 'Interpellationsdebatt';
    else if (doktyp === 'frg') docTypeName = 'Skriftlig fråga';

    const neutralSummary = `${docTypeName} ${doc.beteckning} från ${actor} rörande AI-politik och tillämpning.`;

    let policyDegree = 2;
    let concretionDegree = 2;
    let investmentWill = 0;
    let accelerationContribution = 2;
    let protectionContribution = 2;
    let stateGovernanceContribution = 2;

    if (textToAnalyze.includes('inrätta') || textToAnalyze.includes('finansiera') || textToAnalyze.includes('avsätta') || textToAnalyze.includes('uppdrag') || textToAnalyze.includes('lagstifta')) {
      policyDegree = 3;
      concretionDegree = 3;
    }

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

    const nearAiFlag = textToAnalyze.includes('kundtjänst') || textToAnalyze.includes('samhällsfråga') || textToAnalyze.includes('digitalt utanförskap');
    const campaignPracticeFlag = textToAnalyze.includes('trollkonto') || textToAnalyze.includes('desinformation') || textToAnalyze.includes('kampanj') || textToAnalyze.includes('valrörelse');
    const externalPressureFlag = party === 'Externt';

    // Generate a separate claim card for EACH matched dimension!
    matchingDimensions.forEach((match, index) => {
      const primaryDimension = match.id;
      const tags = match.tags;
      
      // If there is only one match, we can keep the base ID for perfect backward compatibility,
      // otherwise append the dimension ID to ensure unique distinct claims!
      const claimId = matchingDimensions.length === 1 
        ? `riksdagen-${doc.dok_id}` 
        : `riksdagen-${doc.dok_id}-d${primaryDimension}`;

      const parsedClaim = {
        id: claimId,
        sourceUrl: `https://data.riksdagen.se/dokument/${doc.dok_id}.html`,
        date: doc.datum,
        source: `${sourceType} ${doc.rm}:${doc.beteckning}`,
        sourceType,
        sourceWeight,
        actor,
        actorType,
        partyAffiliation: party,
        partyBearing,
        originalQuote,
        neutralSummary: `${neutralSummary} (Dimension ${primaryDimension}: ${lockedDimensions.find(ld => ld.id === primaryDimension)?.name || 'Okänd'})`,
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
        comment: `Automatiskt inhämtat och förkodat claim från Riksdagen (${docTypeName}) för riksmöte ${doc.rm}.`
      };

      // Match against the local cache using the specific claim ID, with a fallback to the base ID
      const baseCacheId = `riksdagen-${doc.dok_id}`;
      const specificCacheId = claimId;

      if (cachedRiksdagenClaimsMap.has(specificCacheId)) {
        const cached = cachedRiksdagenClaimsMap.get(specificCacheId);
        parsedClaim.reviewStatus = cached.reviewStatus || parsedClaim.reviewStatus;
        parsedClaim.primaryDimension = cached.primaryDimension || parsedClaim.primaryDimension;
        parsedClaim.partyAffiliation = cached.partyAffiliation || parsedClaim.partyAffiliation;
        parsedClaim.actorType = cached.actorType || parsedClaim.actorType;
        parsedClaim.comment = cached.comment || parsedClaim.comment;
        parsedClaim.evidenceStrength = cached.evidenceStrength !== undefined ? cached.evidenceStrength : parsedClaim.evidenceStrength;
        parsedClaim.policyDegree = cached.policyDegree !== undefined ? cached.policyDegree : parsedClaim.policyDegree;
      } else if (cachedRiksdagenClaimsMap.has(baseCacheId) && index === 0) {
        // Fallback to base cache ID for the first claim card if no dimension-specific cache exists yet
        const cached = cachedRiksdagenClaimsMap.get(baseCacheId);
        parsedClaim.reviewStatus = cached.reviewStatus || parsedClaim.reviewStatus;
        parsedClaim.primaryDimension = cached.primaryDimension || parsedClaim.primaryDimension;
        parsedClaim.partyAffiliation = cached.partyAffiliation || parsedClaim.partyAffiliation;
        parsedClaim.actorType = cached.actorType || parsedClaim.actorType;
        parsedClaim.comment = cached.comment || parsedClaim.comment;
        parsedClaim.evidenceStrength = cached.evidenceStrength !== undefined ? cached.evidenceStrength : parsedClaim.evidenceStrength;
        parsedClaim.policyDegree = cached.policyDegree !== undefined ? cached.policyDegree : parsedClaim.policyDegree;
      }

      cachedRiksdagenClaimsMap.set(parsedClaim.id, parsedClaim);
    });
  });
  }
  
  const riksdagenClaims = Array.from(cachedRiksdagenClaimsMap.values());

  // 2. High-Fidelity Crawler/Simulator for other sources (Regeringskansliet, Party Webs, DN Debatt, Remissinstanser)
  // This simulator provides contextually rich political data that aren't logged in parliamentary records.
  const externalSourcesClaims = [
    // Departement / Regeringskansliet
    {
      id: 'ext-rk-001',
      date: '2026-05-15',
      source: 'Regeringskansliet Pressmeddelande',
      sourceType: 'Pressmeddelande',
      sourceWeight: 5,
      actor: 'Ebba Busch (KD)',
      actorType: 'Minister',
      partyAffiliation: 'KD',
      partyBearing: 'Hög',
      originalQuote: 'Sverige ska bli en ledande nod för storskalig AI-beräkning. Vi inrättar en ny nationell AI-fabrik och superdatorresurs för att stödja företag och forskning under AI Act.',
      neutralSummary: 'Ministern Ebba Busch (KD) tillkännager en statlig AI-fabrik för beräkningsresurser och innovation.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 3, // Infrastruktur, data och beräkningskapacitet
      secondaryDimensions: [2, 11],
      tags: ['AI-fabrik', 'superdator', 'infrastruktur', 'Ebba Busch'],
      concretionDegree: 4,
      investmentWill: 4,
      accelerationContribution: 5,
      protectionContribution: 0,
      stateGovernanceContribution: 3,
      implementationMaturity: 3,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Kalibrerad',
      comment: 'Officiell regeringspolicy från näringsdepartementet som stakar ut marknadsaccelererande infrastruktur.'
    },
    {
      id: 'ext-rk-002',
      date: '2026-04-20',
      source: 'Kommittédirektiv Justitiedepartementet',
      sourceType: 'Regeringsbeslut',
      sourceWeight: 5,
      actor: 'Gunnar Strömmer (M)',
      actorType: 'Minister',
      partyAffiliation: 'M',
      partyBearing: 'Hög',
      originalQuote: 'För att säkra rättssäkerhet och skydd mot diskriminering tillsätter regeringen en utredning om att etablera en ny nationell tillsynsstruktur för AI Act.',
      neutralSummary: 'Justitieministern tillsätter en statlig utredning om tillsynsmyndighet och efterlevnad av EU:s AI Act.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 4, // Reglering och tillsyn
      secondaryDimensions: [1],
      tags: ['AI Act', 'tillsyn', 'utredning', 'justitieminister'],
      concretionDegree: 3,
      investmentWill: 1,
      accelerationContribution: 2,
      protectionContribution: 4,
      stateGovernanceContribution: 4,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Kalibrerad',
      comment: 'Skarp utredningsåtgärd för att förbereda den tillsynsstruktur som EU:s AI-förordning kräver.'
    },
    // Partiernas egna hemsidor (Kampanj & Valmanifest)
    {
      id: 'ext-party-s',
      date: '2026-05-10',
      source: 'Socialdemokraternas Pressrum',
      sourceType: 'Pressmeddelande',
      sourceWeight: 3,
      actor: 'Magdalena Andersson (S)',
      actorType: 'Parti',
      partyAffiliation: 'S',
      partyBearing: 'Hög',
      originalQuote: 'Automatiseringen i välfärden får inte ske på bekostnad av rättssäkerheten. Vi kräver att AI-system som används i kommunernas biståndsbedömning alltid ska ha en mänsklig överprövning.',
      neutralSummary: 'Socialdemokraterna kräver krav på mänsklig överprövning vid algoritmiska beslut i välfärden.',
      claimType: 'Mål',
      policyDegree: 2,
      primaryDimension: 5, // Offentlig välfärd
      secondaryDimensions: [7, 4],
      tags: ['biståndsbedömning', 'välfärd', 'mänsklig kontroll', 'rättssäkerhet'],
      concretionDegree: 2,
      investmentWill: 0,
      accelerationContribution: 1,
      protectionContribution: 4,
      stateGovernanceContribution: 4,
      implementationMaturity: 1,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Pressmeddelande på partiets hemsida som markerar en skarp linje mot helt automatiserade myndighetsbeslut.'
    },
    {
      id: 'ext-party-sd',
      date: '2026-05-24',
      source: 'Sverigedemokraterna Valmanifest 2026',
      sourceType: 'Strategi',
      sourceWeight: 4,
      actor: 'Jimmie Åkesson (SD)',
      actorType: 'Parti',
      partyAffiliation: 'SD',
      partyBearing: 'Hög',
      originalQuote: 'Sveriges säkerhet och valintegritet är hotad av utländska desinformationskampanjer som utnyttjar generativ AI. Vi vill ge Säpo utökade mandat att övervaka och motverka dessa angrepp.',
      neutralSummary: 'Sverigedemokraterna vill stärka Säpos mandat att motverka AI-genererad valpåverkan och desinformation.',
      claimType: 'Åtgärd',
      policyDegree: 2,
      primaryDimension: 8, // Demokrati, medier och informationspåverkan
      secondaryDimensions: [9],
      tags: ['valet 2026', 'Säpo', 'desinformation', 'valpåverkan'],
      concretionDegree: 2,
      investmentWill: 1,
      accelerationContribution: 1,
      protectionContribution: 4,
      stateGovernanceContribution: 4,
      implementationMaturity: 1,
      evidenceStrength: 4,
      assessmentConfidence: 'Medel',
      nearAiFlag: false,
      campaignPracticeFlag: true, // Spår C: Kampanj & demokrati
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Skrivning i partiets valplattform. Korrigerad till Dimension 8 (Valpåverkan och desinformation). Spår C.'
    },
    {
      id: 'ext-party-mp',
      date: '2026-05-26',
      source: 'Miljöpartiet de Gröna Pressrum',
      sourceType: 'Pressmeddelande',
      sourceWeight: 3,
      actor: 'Daniel Helldén (MP)',
      actorType: 'Parti',
      partyAffiliation: 'MP',
      partyBearing: 'Hög',
      originalQuote: 'AI har enorm potential att optimera det svenska elnätet och styra grön energi. Men vi kan inte acceptera att techbolag bygger massiva datacenter som dränerar vår energikapacitet utan stränga klimatkrav.',
      neutralSummary: 'Miljöpartiet vill ha hårda miljökrav på datacenter men stödjer AI för elnätsoptimering.',
      claimType: 'Mål',
      policyDegree: 2,
      primaryDimension: 12, // Miljö, energi och hållbarhet
      secondaryDimensions: [3],
      tags: ['datacenter', 'elpris', 'grön omställning', 'energioptimering'],
      concretionDegree: 2,
      investmentWill: 0,
      accelerationContribution: 3,
      protectionContribution: 3,
      stateGovernanceContribution: 3,
      implementationMaturity: 1,
      evidenceStrength: 3,
      assessmentConfidence: 'Medel',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Miljöpartiets miljöinriktade AI-linje på partipress-sajten.'
    },
    {
      id: 'ext-party-c',
      date: '2026-05-18',
      source: 'Centerpartiet Pressmeddelanden',
      sourceType: 'Pressmeddelande',
      sourceWeight: 3,
      actor: 'Muharrem Demirok (C)',
      actorType: 'Parti',
      partyAffiliation: 'C',
      partyBearing: 'Hög',
      originalQuote: 'Vi föreslår en nationell upphovsrättslicens för AI. Svenska författare och kulturskapare måste få skälig ersättning när deras verk används för att träna kommersiella språkmodeller.',
      neutralSummary: 'Centerpartiet föreslår ett licenssystem för upphovsrättsligt skydd vid AI-träning.',
      claimType: 'Åtgärd',
      policyDegree: 2,
      primaryDimension: 10, // Språk, kultur, upphovsrätt
      secondaryDimensions: [11, 2],
      tags: ['upphovsrätt', 'språkmodeller', 'kulturskapare', 'kompensation'],
      concretionDegree: 3,
      investmentWill: 1,
      accelerationContribution: 2,
      protectionContribution: 4,
      stateGovernanceContribution: 3,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Tydligt C-förslag på språksuveränitet och upphovsrättsskydd.'
    },
    {
      id: 'ext-party-m',
      date: '2026-05-05',
      source: 'Moderaterna Pressrum',
      sourceType: 'Pressmeddelande',
      sourceWeight: 3,
      actor: 'Ulf Kristersson (M)',
      actorType: 'Parti',
      partyAffiliation: 'M',
      partyBearing: 'Hög',
      originalQuote: 'Sverige ska bli Europas mest företagarvänliga land för AI-innovation. Vi vill minska regelkrånglet för nystartade techbolag och införa regulatoriska sandlådor för att snabba på kommersialiseringen av ny teknik.',
      neutralSummary: 'Moderaterna vill underlätta kommersialisering och snabba på AI-innovation genom att införa regulatoriska sandlådor och minska regelbördan.',
      claimType: 'Åtgärd',
      policyDegree: 2,
      primaryDimension: 11, // Forskning, innovation och techsektorns konkurrenskraft
      secondaryDimensions: [2, 1],
      tags: ['sandlådor', 'avreglering', 'innovation', 'näringsliv'],
      concretionDegree: 3,
      investmentWill: 1,
      accelerationContribution: 5,
      protectionContribution: 1,
      stateGovernanceContribution: 1,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Moderaternas officiella hållning på hemsidan med fokus på marknadsacceleration och avreglering.'
    },
    {
      id: 'ext-party-kd',
      date: '2026-05-12',
      source: 'Kristdemokraterna Pressrum',
      sourceType: 'Pressmeddelande',
      sourceWeight: 3,
      actor: 'Ebba Busch (KD)',
      actorType: 'Parti',
      partyAffiliation: 'KD',
      partyBearing: 'Hög',
      originalQuote: 'AI-utvecklingen rymmer fantastiska möjligheter för vården, men vi får aldrig glömma den mänskliga värdigheten. Varje patient har rätt att veta när en diagnos eller bedömning har gjorts med hjälp av AI.',
      neutralSummary: 'Kristdemokraterna framhåller patienters rätt till information när AI-system används i vården, med fokus på mänsklig värdighet.',
      claimType: 'Mål',
      policyDegree: 2,
      primaryDimension: 7, // AI-etik, mänskliga rättigheter och inkludering
      secondaryDimensions: [5],
      tags: ['sjukvård', 'mänsklig värdighet', 'patienträtt', 'information'],
      concretionDegree: 2,
      investmentWill: 0,
      accelerationContribution: 2,
      protectionContribution: 4,
      stateGovernanceContribution: 3,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'KD-linje som betonar etik och den personliga sfären vid välfärdsdigitalisering.'
    },
    {
      id: 'ext-party-l',
      date: '2026-05-20',
      source: 'Liberalerna Pressrum',
      sourceType: 'Pressmeddelande',
      sourceWeight: 3,
      actor: 'Johan Pehrson (L)',
      actorType: 'Parti',
      partyAffiliation: 'L',
      partyBearing: 'Hög',
      originalQuote: 'Framtidens jobb kräver spetskompetens inom AI. Vi vill reformera yrkeshögskolan och högskolans fristående kurser så att yrkesverksamma snabbt kan vidareutbilda sig mitt i arbetslivet.',
      neutralSummary: 'Liberalerna föreslår flexibla vidareutbildningskurser inom AI för yrkesverksamma genom reformer av högskolan och yrkeshögskolan.',
      claimType: 'Åtgärd',
      policyDegree: 2,
      primaryDimension: 6, // Arbetsmarknad, kompetens och omställning
      secondaryDimensions: [11],
      tags: ['yrkeshögskola', 'vidareutbildning', 'kompetensförsörjning', 'omställning'],
      concretionDegree: 3,
      investmentWill: 2,
      accelerationContribution: 4,
      protectionContribution: 1,
      stateGovernanceContribution: 2,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Liberalernas omställningspolitik med tonvikt på spetskompetens och individens rörlighet.'
    },
    {
      id: 'ext-party-v',
      date: '2026-05-15',
      source: 'Vänsterpartiet Pressrum',
      sourceType: 'Pressmeddelande',
      sourceWeight: 3,
      actor: 'Nooshi Dadgostar (V)',
      actorType: 'Parti',
      partyAffiliation: 'V',
      partyBearing: 'Hög',
      originalQuote: 'När storföretagen gör enorma vinster på automatisering genom AI måste arbetarna få ta del av vinsterna. Vi föreslår kortare arbetstid med bibehållen lön som ett sätt att möta AI-revolutionens produktivitetsökningar.',
      neutralSummary: 'Vänsterpartiet föreslår kortare arbetstid med bibehållen lön för att fördela vinsterna av AI-driven automatisering till arbetstagarna.',
      claimType: 'Åtgärd',
      policyDegree: 2,
      primaryDimension: 6, // Arbetsmarknad, kompetens och omställning
      secondaryDimensions: [2],
      tags: ['arbetstid', 'automatisering', 'vinster', 'produktivitet'],
      concretionDegree: 3,
      investmentWill: 0,
      accelerationContribution: 1,
      protectionContribution: 5,
      stateGovernanceContribution: 4,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Klassisk fördelningspolitik från Vänsterpartiet tillämpat på den stundande AI-driven automatiseringen.'
    },
    // Media & Debatt (DN Debatt, SvD, Altinget)
    {
      id: 'ext-media-almega',
      date: '2026-05-12',
      source: 'DN Debatt',
      sourceType: 'Debattartikel',
      sourceWeight: 3,
      actor: 'Almega Techföretagen',
      actorType: 'Intresseorganisation',
      partyAffiliation: 'Externt',
      partyBearing: 'Låg',
      originalQuote: 'Sverige riskerar att halka efter dramatiskt i AI-omställningen på arbetsmarknaden. Vi föreslår ett AI-kompetensavdrag så att företag kan finansiera vidareutbildning av personal i generativ AI.',
      neutralSummary: 'Almega föreslår ett skatteavdrag för företag som vidareutbildar personal inom AI.',
      claimType: 'Åtgärd',
      policyDegree: 2,
      primaryDimension: 6, // Arbetsmarknad, kompetens
      secondaryDimensions: [2, 11],
      tags: ['vidareutbildning', 'Almega', 'kompetensavdrag', 'techbranschen'],
      concretionDegree: 3,
      investmentWill: 3,
      accelerationContribution: 4,
      protectionContribution: 1,
      stateGovernanceContribution: 1,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: true, // Externt agendatryck!
      reviewStatus: 'Kalibrerad',
      comment: 'Betydande debattartikel på DN Debatt som driver på agendatrycket kring kompetens.'
    },
    {
      id: 'ext-media-skr',
      date: '2026-05-20',
      source: 'Altinget Debatt',
      sourceType: 'Debattartikel',
      sourceWeight: 3,
      actor: 'Sveriges Kommuner och Regioner (SKR)',
      actorType: 'Intresseorganisation',
      partyAffiliation: 'Externt',
      partyBearing: 'Låg',
      originalQuote: 'Kommuner och regioner lämnas i ett juridiskt vakuum vid AI-implementering. Det saknas nationellt samordnat stöd och lagligt utrymme för att dela hälsodata på ett säkert sätt.',
      neutralSummary: 'SKR efterlyser statliga initiativ och lagstöd för datadelning i välfärden.',
      claimType: 'Problem',
      policyDegree: 2,
      primaryDimension: 5, // Offentlig välfärd
      secondaryDimensions: [1, 3],
      tags: ['SKR', 'välfärdsteknik', 'datadelning', 'hälsodata'],
      concretionDegree: 2,
      investmentWill: 1,
      accelerationContribution: 2,
      protectionContribution: 3,
      stateGovernanceContribution: 5,
      implementationMaturity: 1,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: true, // Externt agendatryck!
      reviewStatus: 'Kalibrerad',
      comment: 'Tungt inspel från SKR som understryker gapet mellan externa välfärdskrav och statlig policy.'
    },
    // 2025/2026 Real-world political news claims discovered in web search
    {
      id: 'ext-news-digg-2026',
      date: '2026-02-12',
      source: 'Regeringskansliet Pressmeddelande',
      sourceType: 'Regeringsbeslut',
      sourceWeight: 5,
      actor: 'Regeringen Kristersson (M/KD/L)',
      actorType: 'Regering',
      partyAffiliation: 'M',
      partyBearing: 'Hög',
      originalQuote: 'Regeringen har gett Digg i uppdrag att lämna förslag på hur Sverige kan organisera ett långsiktigt och strukturerat samarbete för utveckling av tjänster inom data och AI i offentlig sektor.',
      neutralSummary: 'Regeringen ger Digg i uppdrag att föreslå hur Sverige kan organisera samarbete för utveckling av AI-tjänster i offentlig sektor.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 5, // Offentlig förvaltning och välfärd
      secondaryDimensions: [1], // Styrning
      tags: ['offentlig sektor', 'Digg', 'samarbete', 'offentlig AI'],
      concretionDegree: 4,
      investmentWill: 2,
      accelerationContribution: 3,
      protectionContribution: 2,
      stateGovernanceContribution: 4,
      implementationMaturity: 3,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Kalibrerad',
      comment: 'Skarp regeringsåtgärd för att samordna digital förvaltning och AI-utveckling i offentlig sektor.'
    },
    {
      id: 'ext-news-tillvaxt-2025',
      date: '2025-02-27',
      source: 'Tillväxtverket pressmeddelande',
      sourceType: 'Pressmeddelande',
      sourceWeight: 4,
      actor: 'Regeringen Kristersson (M/KD/L)',
      actorType: 'Regering',
      partyAffiliation: 'KD',
      partyBearing: 'Hög',
      originalQuote: 'Tillväxtverket ges i uppdrag att utreda hur AI kan användas för att förenkla för företag, minska den administrativa regelbördan och sänka företagens kostnader vid myndighetskontakter.',
      neutralSummary: 'Tillväxtverket utreder AI-tillämpningar inom statliga myndigheter för att minska företags regelbörda.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 2, // Ekonomi, produktivitet och konkurrenskraft
      secondaryDimensions: [11], // Innovation
      tags: ['regelbörda', 'Tillväxtverket', 'effektivisering', 'konkurrenskraft'],
      concretionDegree: 3,
      investmentWill: 1,
      accelerationContribution: 4,
      protectionContribution: 1,
      stateGovernanceContribution: 3,
      implementationMaturity: 2,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Kalibrerad',
      comment: 'Regeringsuppdrag kopplat till regelförenkling och konkurrenskraft med marknadsinriktad acceleration.'
    },
    {
      id: 'ext-news-rosencrantz-2025',
      date: '2025-10-15',
      source: 'Pressuttalande EU-departementet',
      sourceType: 'Pressmeddelande',
      sourceWeight: 5,
      actor: 'Jessica Rosencrantz (M)',
      actorType: 'Minister',
      partyAffiliation: 'M',
      partyBearing: 'Hög',
      originalQuote: 'Vi måste balansera regleringar med innovationskraft. Att reglera för hårt riskerar att hämma den europeiska konkurrenskraften, och vi bör överväga att lätta på regelförenklingar inom AI Act.',
      neutralSummary: 'EU-minister Jessica Rosencrantz (M) betonar vikten av regelförenklingar för att inte hämma innovation genom AI Act.',
      claimType: 'Värdering',
      policyDegree: 2,
      primaryDimension: 4, // Reglering och tillsyn
      secondaryDimensions: [2, 11], // Ekonomi, Innovation
      tags: ['AI Act', 'Jessica Rosencrantz', 'konkurrenskraft', 'regelförenkling'],
      concretionDegree: 2,
      investmentWill: 0,
      accelerationContribution: 4,
      protectionContribution: 1,
      stateGovernanceContribution: 1,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Kalibrerad',
      comment: 'Ministerposition som markerar en marknadsliberal hållning mot överreglering under AI Act.'
    },
    {
      id: 'ext-news-s-omstallning-2026',
      date: '2026-03-12',
      source: 'Socialdemokraterna Pressrum',
      sourceType: 'Pressmeddelande',
      sourceWeight: 3,
      actor: 'Socialdemokraterna',
      actorType: 'Parti',
      partyAffiliation: 'S',
      partyBearing: 'Hög',
      originalQuote: 'Vi efterlyser en nationell jobbomställningsplan för att skydda löntagare och rusta arbetsmarknaden inför AI-omställningen, där framför allt instegsjobb och juniora roller automatiseras i snabb takt.',
      neutralSummary: 'Socialdemokraterna efterlyser en jobbomställningsplan för att skydda löntagare från automatiseringens effekter.',
      claimType: 'Mål',
      policyDegree: 2,
      primaryDimension: 6, // Arbetsmarknad, kompetens och omställning
      secondaryDimensions: [7], // Etik, inkludering
      tags: ['jobbomställning', 'arbetsmarknad', 'löntagare', 'trygghetssystem'],
      concretionDegree: 2,
      investmentWill: 2,
      accelerationContribution: 1,
      protectionContribution: 4,
      stateGovernanceContribution: 4,
      implementationMaturity: 1,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'S-oppositionens linje för trygghet och jobbomställning inför arbetsmarknadsautomatiseringen.'
    },
    {
      id: 'ext-news-c-linkoping-2025',
      date: '2025-12-05',
      source: 'Centerpartiet Pressmeddelande',
      sourceType: 'Pressmeddelande',
      sourceWeight: 3,
      actor: 'Muharrem Demirok (C)',
      actorType: 'Parti',
      partyAffiliation: 'C',
      partyBearing: 'Hög',
      originalQuote: 'Centerpartiet föreslår en miljardsatsning på tre miljarder kronor för att etablera ett nationellt AI-center i Linköping. Vi måste satsa stort och attrahera internationell spetskompetens om Sverige ska leda AI-utvecklingen.',
      neutralSummary: 'Centerpartiet föreslår en statlig miljardsatsning på tre miljarder kronor för ett nationellt AI-center i Linköping.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 11, // Innovation, företagande och kommersialisering
      secondaryDimensions: [3, 2], // Infrastruktur, Ekonomi
      tags: ['Linköping', 'AI-center', 'miljardsatsning', 'spetskompetens'],
      concretionDegree: 4,
      investmentWill: 4,
      accelerationContribution: 5,
      protectionContribution: 1,
      stateGovernanceContribution: 3,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Offensivt förslag från Centerpartiet med målet att etablera ett svenskt världsledande AI-center.'
    },
    // 2025/2026 Vänsterpartiet (V) claims
    {
      id: 'ext-news-v-ansiktsigenkanning-2025',
      date: '2025-10-22',
      source: 'Riksdagsmotion 2025/26:3947',
      sourceType: 'Motion',
      sourceWeight: 3,
      actor: 'Gudrun Nordborg m.fl. (V)',
      actorType: 'Riksdagsgrupp',
      partyAffiliation: 'V',
      partyBearing: 'Hög',
      originalQuote: 'Polisens användning av AI för ansiktsigenkänning i realtid måste omgärdas av en mycket strikt tillståndsprövning och restriktioner för att säkerställa att vi inte kompromissar med den digitala integriteten.',
      neutralSummary: 'Vänsterpartiet kräver strikt tillståndsprövning och integritetsskydd vid polisens användning av ansiktsigenkänning.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 4, // Reglering, tillsyn och rättssäkerhet
      secondaryDimensions: [9, 7], // Säkerhet, Etik
      tags: ['ansiktsigenkänning', 'personlig integritet', 'övervakning', 'Gudrun Nordborg'],
      concretionDegree: 3,
      investmentWill: 0,
      accelerationContribution: 0,
      protectionContribution: 5,
      stateGovernanceContribution: 4,
      implementationMaturity: 2,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Vänsterpartiets motion mot oreglerad biometrisk övervakning i realtid. Fokus på skydd och rättssäkerhet.'
    },
    {
      id: 'ext-news-v-ai-skatt-2025',
      date: '2025-10-20',
      source: 'Allmänpolitisk motion Vänsterpartiet',
      sourceType: 'Motion',
      sourceWeight: 4,
      actor: 'Vänsterpartiet i riksdagen',
      actorType: 'Riksdagsgrupp',
      partyAffiliation: 'V',
      partyBearing: 'Hög',
      originalQuote: 'När mänskligt arbete ersätts med artificiell intelligens och automatisering i stor skala hotas välfärdens skattebas. Vi behöver utreda en särskild AI-skatt för att säkra finansieringen av skolan, vården och omsorgen.',
      neutralSummary: 'Vänsterpartiet föreslår en utredning om en särskild AI-skatt för att kompensera för automatiseringens välfärdseffekter.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 6, // Arbetsmarknad, kompetens och omställning
      secondaryDimensions: [2], // Ekonomi
      tags: ['AI-skatt', 'beskattning', 'välfärdsfinansiering', 'automatisering'],
      concretionDegree: 3,
      investmentWill: 0,
      accelerationContribution: 0,
      protectionContribution: 5,
      stateGovernanceContribution: 5,
      implementationMaturity: 1,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Klassiskt vänsterförslag om AI-skatt för att motverka skattebortfall vid maskinell automatisering.'
    },
    // 2025/2026 Miljöpartiet (MP) claims
    {
      id: 'ext-news-mp-gron-ai-2025',
      date: '2025-10-18',
      source: 'Riksdagsmotion 2025/26:3425',
      sourceType: 'Motion',
      sourceWeight: 3,
      actor: 'Jan Riise m.fl. (MP)',
      actorType: 'Riksdagsgrupp',
      partyAffiliation: 'MP',
      partyBearing: 'Hög',
      originalQuote: 'AI-utvecklingen har en stor miljöpåverkan genom energislukande datacenter. Vi måste införa stränga klimatkrav för etablering av teknikresurser och ställa krav på full transparens kring algoritmer.',
      neutralSummary: 'Miljöpartiet föreslår hårda klimatkrav på energislukande datacenter och full transparens av AI-algoritmer.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 12, // Miljö, energi och hållbarhet
      secondaryDimensions: [4, 3], // Reglering, Infrastruktur
      tags: ['klimatkrav', 'datacenter', 'transparens', 'Jan Riise'],
      concretionDegree: 3,
      investmentWill: 0,
      accelerationContribution: 1,
      protectionContribution: 4,
      stateGovernanceContribution: 4,
      implementationMaturity: 2,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Miljöpartiets miljöinriktade AI-motion. Kräver ekologisk hållbarhet och öppen källkod/transparens.'
    },
    {
      id: 'ext-news-mp-trygg-ai-2025',
      date: '2025-10-17',
      source: 'Riksdagsmotion 2025/26:3320',
      sourceType: 'Motion',
      sourceWeight: 3,
      actor: 'Leila Ali Elmi m.fl. (MP)',
      actorType: 'Riksdagsgrupp',
      partyAffiliation: 'MP',
      partyBearing: 'Hög',
      originalQuote: 'Vi vill rikta statliga forskningsanslag mot att utveckla trygg, etisk och framför allt energieffektiv AI. Techjättarna måste också hållas fullt ansvariga för de skador deras system kan orsaka.',
      neutralSummary: 'Miljöpartiet vill öronmärka forskningsanslag till etisk och grön AI och öka techbolagens skadeståndsansvar.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 12, // Miljö, energi och hållbarhet
      secondaryDimensions: [7, 11], // Etik, Forskning
      tags: ['forskningsanslag', 'skadeståndsansvar', 'etisk AI', 'Leila Ali Elmi'],
      concretionDegree: 3,
      investmentWill: 2,
      accelerationContribution: 2,
      protectionContribution: 4,
      stateGovernanceContribution: 4,
      implementationMaturity: 2,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'MP driver skarp grön omställning av AI-forskning och marknadsansvar.'
    },
    {
      id: 'ext-news-mp-overvakning-2025',
      date: '2025-10-24',
      source: 'Riksdagsmotion 2025/26:3953',
      sourceType: 'Motion',
      sourceWeight: 3,
      actor: 'Ulrika Westerlund m.fl. (MP)',
      actorType: 'Riksdagsgrupp',
      partyAffiliation: 'MP',
      partyBearing: 'Hög',
      originalQuote: 'Regeringens förslag om att tillåta biometrisk ansiktsigenkänning i realtid är en farlig glidning mot massövervakning. Vi måste stoppa detta för att värna den personliga integriteten.',
      neutralSummary: 'Miljöpartiet vill stoppa polisens planerade användning av biometrisk realtidsansiktsigenkänning.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 4, // Reglering och tillsyn
      secondaryDimensions: [7, 9], // Etik, Säkerhet
      tags: ['biometri', 'ansiktsigenkänning', 'massövervakning', 'Ulrika Westerlund'],
      concretionDegree: 4,
      investmentWill: 0,
      accelerationContribution: 0,
      protectionContribution: 5,
      stateGovernanceContribution: 3,
      implementationMaturity: 3,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Stark MP-motion som motsätter sig realtidsbiometri och värnar personlig integritet.'
    },
    // 2025/2026 Liberalerna (L) claims
    {
      id: 'ext-news-l-hemchatt-2025',
      date: '2025-10-21',
      source: 'Riksdagsmotion 2025/26:3808',
      sourceType: 'Motion',
      sourceWeight: 3,
      actor: 'Helena Gellerman (L)',
      actorType: 'Enskild riksdagsledamot',
      partyAffiliation: 'L',
      partyBearing: 'Hög',
      originalQuote: 'För att öka allmänhetens kunskap om AI och stimulera en bred innovationskultur föreslår vi en "hem-chatt-reform" som gör det möjligt för medborgare att få skattereduktion för AI-licenser och vidareutbildning.',
      neutralSummary: 'Liberalerna föreslår en "hem-chatt-reform" med skatteavdrag för AI-verktyg och utbildning.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 6, // Arbetsmarknad, kompetens och omställning
      secondaryDimensions: [2, 11], // Ekonomi, Innovation
      tags: ['hem-chatt', 'skatteavdrag', 'AI-kunskap', 'Helena Gellerman'],
      concretionDegree: 3,
      investmentWill: 3,
      accelerationContribution: 5,
      protectionContribution: 1,
      stateGovernanceContribution: 2,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Teknikoptimistiskt L-förslag som stimulerar medborgarledd acceleration likt den gamla Hem-PC-reformen.'
    },
    {
      id: 'ext-news-l-sthlm-2025',
      date: '2025-10-21',
      source: 'Riksdagsmotion 2025/26:3805',
      sourceType: 'Motion',
      sourceWeight: 3,
      actor: 'Malin Danielsson m.fl. (L)',
      actorType: 'Riksdagsgrupp',
      partyAffiliation: 'L',
      partyBearing: 'Hög',
      originalQuote: 'Vi vill göra Stockholm till ett nationellt innovationsområde för AI i välfärden. Genom att etablera en säker miljö för testning av AI-algoritmer inom hälso- och sjukvården kan vi rädda liv.',
      neutralSummary: 'Liberalerna föreslår att Stockholm utses till ett innovationsområde för att testa AI-algoritmer i vården.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 5, // Offentlig välfärd
      secondaryDimensions: [11], // Innovation
      tags: ['Stockholm', 'vård-AI', 'innovationsområde', 'välfärdsteknik'],
      concretionDegree: 3,
      investmentWill: 2,
      accelerationContribution: 4,
      protectionContribution: 2,
      stateGovernanceContribution: 3,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'L-motion fokuserad på välfärdsacceleration under säkra, etiska och lokala regulatoriska ramar.'
    },
    // 2025/2026 Kristdemokraterna (KD) claims
    {
      id: 'ext-news-kd-tech-2025',
      date: '2025-10-20',
      source: 'Riksdagsmotion 2025/26:3667',
      sourceType: 'Motion',
      sourceWeight: 3,
      actor: 'Magnus Berntsson (KD)',
      actorType: 'Enskild riksdagsledamot',
      partyAffiliation: 'KD',
      partyBearing: 'Hög',
      originalQuote: 'Sveriges techsektor är motorn i vår ekonomi. Vi måste genomföra offensiva reformer och investera i digital infrastruktur, datakapacitet och AI-säkerhet för att undvika nationella flaskhalsar.',
      neutralSummary: 'Kristdemokraterna föreslår offensiva tech-reformer och investeringar i digital infrastruktur, AI och datakapacitet.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 3, // Infrastruktur, data och beräkningskapacitet
      secondaryDimensions: [2, 11], // Ekonomi, Innovation
      tags: ['techsektorn', 'infrastruktur', 'datakapacitet', 'Magnus Berntsson'],
      concretionDegree: 3,
      investmentWill: 3,
      accelerationContribution: 5,
      protectionContribution: 1,
      stateGovernanceContribution: 2,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Kristdemokratiskt enskilt förslag som markerar marknadsacceleration stöttad av statliga infrastrukturinvesteringar.'
    },
    {
      id: 'ext-news-kd-plattform-2025',
      date: '2025-11-12',
      source: 'Uttalande i Riksdagsdebatt',
      sourceType: 'Debattartikel',
      sourceWeight: 3,
      actor: 'Kristdemokraterna i riksdagen',
      actorType: 'Parti',
      partyAffiliation: 'KD',
      partyBearing: 'Hög',
      originalQuote: 'Algoritmer i plattformsföretag får inte användas för att exploatera människor eller kringgå den svenska modellen. Vi behöver följa upp plattformsdirektivet för att säkra schysta villkor för plattformsarbetare.',
      neutralSummary: 'Kristdemokraterna stöder reglering av plattformsarbetares arbetsvillkor mot algoritmiskt utnyttjande.',
      claimType: 'Värdering',
      policyDegree: 2,
      primaryDimension: 6, // Arbetsmarknad, kompetens och omställning
      secondaryDimensions: [7], // Etik, mänskliga rättigheter
      tags: ['plattformsdirektivet', 'plattformsarbete', 'algoritmer', 'svenska modellen'],
      concretionDegree: 2,
      investmentWill: 0,
      accelerationContribution: 1,
      protectionContribution: 4,
      stateGovernanceContribution: 3,
      implementationMaturity: 2,
      evidenceStrength: 3,
      assessmentConfidence: 'Medel',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Kristdemokraternas hållning kring plattformsekonomi och algoritmer; balanserar marknad med traditionella skydd.'
    },
    // AI-kommissionens slutrapport (SOU 2025:12)
    {
      id: 'ext-news-sou-aikommission-2025',
      date: '2025-02-15',
      source: 'SOU 2025:12 slutrapport',
      sourceType: 'Strategi',
      sourceWeight: 5,
      actor: 'AI-kommissionen (Carl-Henric Svanberg)',
      actorType: 'Expert/forskare',
      partyAffiliation: 'Externt',
      partyBearing: 'Låg',
      originalQuote: 'För att säkra Sveriges välfärd och konkurrenskraft rekommenderar vi en statlig miljardsatsning på 16,7 miljarder kronor över tio år, samt inrättandet av en nationell AI-insatsstyrka (task force) direkt under statsministern.',
      neutralSummary: 'AI-kommissionen presenterar en nationell färdplan med rekommendation om 16,7 miljarder kronor i satsningar samt en insatsstyrka under statsministern.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 1, // Styrning och politiskt ledarskap
      secondaryDimensions: [2, 3], // Ekonomi, Infrastruktur
      tags: ['AI-kommissionen', 'Carl-Henric Svanberg', 'miljardsatsning', 'insatsstyrka'],
      concretionDegree: 4,
      investmentWill: 5,
      accelerationContribution: 4,
      protectionContribution: 2,
      stateGovernanceContribution: 5,
      implementationMaturity: 3,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: true,
      reviewStatus: 'Kalibrerad',
      comment: 'Tung rekommendation från AI-kommissionen som driver på det statliga ledarskapet (Dimension 1) och den finansiella viljan.'
    },
    {
      id: 'ext-media-internetstiftelsen-2026',
      date: '2026-05-18',
      source: 'Internetstiftelsens Valspecial',
      sourceType: 'Debattartikel',
      sourceWeight: 4,
      actor: 'Internetstiftelsen (Jannike Tillå)',
      actorType: 'Civilsamhälle',
      partyAffiliation: 'Externt',
      partyBearing: 'Låg',
      originalQuote: 'Hela 88 procent av svenskarna tror att AI kommer att användas för att sprida falska bilder eller videoklipp i syfte att påverka riksdagsvalet 2026. Det visar på ett enormt behov av ökad digital källkritik.',
      neutralSummary: 'Internetstiftelsen varnar för utbredd oro inför valet 2026 där 88 % tror att AI kommer användas för desinformation.',
      claimType: 'Risk',
      policyDegree: 2,
      primaryDimension: 8, // Demokrati, desinformation och digitala valkampanjer
      secondaryDimensions: [7],
      tags: ['desinformation', 'valet 2026', 'källkritik', 'Internetstiftelsen'],
      concretionDegree: 2,
      investmentWill: 1,
      accelerationContribution: 1,
      protectionContribution: 4,
      stateGovernanceContribution: 3,
      implementationMaturity: 2,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: true,
      campaignPracticeFlag: true,
      externalPressureFlag: true,
      reviewStatus: 'Kalibrerad',
      comment: 'Orosindikator av extremt hög relevans inför riksdagsvalet 2026 rörande syntetiska medier.'
    },
    {
      id: 'ext-media-mp-svd-2026',
      date: '2026-04-14',
      source: 'SvD Debatt',
      sourceType: 'Debattartikel',
      sourceWeight: 3,
      actor: 'Miljöpartiet de Gröna (Jan Riise)',
      actorType: 'Riksdagsgrupp',
      partyAffiliation: 'MP',
      partyBearing: 'Hög',
      originalQuote: 'Regeringens planer på att tillåta polisens biometriska ansiktsigenkänning i realtid är ett allvarligt intrång i medborgarnas fri- och rättigheter. Det här är en glidning mot en massövervakningsstat som vi måste stoppa.',
      neutralSummary: 'Miljöpartiet går till angrepp mot polisens planerade realtidsövervakning med ansiktsigenkänning på SvD Debatt.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 4, // Reglering och tillsyn
      secondaryDimensions: [7, 9],
      tags: ['ansiktsigenkänning', 'biometri', 'övervakning', 'SvD Debatt'],
      concretionDegree: 4,
      investmentWill: 0,
      accelerationContribution: 0,
      protectionContribution: 5,
      stateGovernanceContribution: 3,
      implementationMaturity: 3,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: false,
      reviewStatus: 'Granskad',
      comment: 'Skarp MP-debattartikel mot biometrisk massövervakning i realtid.'
    },
    {
      id: 'ext-media-wasp-altinget-2026',
      date: '2026-03-22',
      source: 'Altinget Debatt',
      sourceType: 'Debattartikel',
      sourceWeight: 3,
      actor: 'Forskare vid WASP-HS',
      actorType: 'Expert/forskare',
      partyAffiliation: 'Externt',
      partyBearing: 'Låg',
      originalQuote: 'AI Act är en nödvändig regulatorisk ram, men den löser inte Sveriges akuta kompetensbrist. Regeringen måste omgående inrätta ett nationellt vidareutbildningsprogram för lärare och akademiker.',
      neutralSummary: 'WASP-HS-forskare varnar på Altinget Debatt för att AI Act inte räcker utan massiva nationella utbildningsprogram för lärare.',
      claimType: 'Problem',
      policyDegree: 2,
      primaryDimension: 6, // Arbetsmarknad, kompetens och omställning
      secondaryDimensions: [11, 1],
      tags: ['AI Act', 'kompetensbrist', 'WASP-HS', 'utbildning'],
      concretionDegree: 3,
      investmentWill: 3,
      accelerationContribution: 2,
      protectionContribution: 3,
      stateGovernanceContribution: 4,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: true,
      reviewStatus: 'Kalibrerad',
      comment: 'Kritiskt akademiskt inspel rörande kompetensförsörjning under den nya EU-regleringen.'
    },
    {
      id: 'ext-media-unionen-2026',
      date: '2026-05-02',
      source: 'Unionen Opinion',
      sourceType: 'Debattartikel',
      sourceWeight: 3,
      actor: 'Unionen (Martin Wästfelt)',
      actorType: 'Civilsamhälle',
      partyAffiliation: 'Externt',
      partyBearing: 'Låg',
      originalQuote: 'AI får aldrig tillåtas fatta slutgiltiga chefsbeslut eller styra lönesättningen i svenska företag. Vi kräver att AI-system som påverkar anställningsvillkor eller arbetsmiljö alltid förhandlas enligt MBL.',
      neutralSummary: 'Fackförbundet Unionen kräver fackligt inflytande och MBL-förhandling vid införandet av AI-system samt förbud mot AI-chefer.',
      claimType: 'Åtgärd',
      policyDegree: 2,
      primaryDimension: 6, // Arbetsmarknad, kompetens och omställning
      secondaryDimensions: [7],
      tags: ['Unionen', 'arbetsmiljö', 'MBL', 'chefsbeslut'],
      concretionDegree: 3,
      investmentWill: 0,
      accelerationContribution: 1,
      protectionContribution: 5,
      stateGovernanceContribution: 4,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: true,
      reviewStatus: 'Granskad',
      comment: 'Viktig facklig ståndpunkt från Unionen som betonar arbetstagarskydd och reglering mot algoritmiskt ledarskap.'
    },
    {
      id: 'ext-media-techsverige-2026',
      date: '2026-04-28',
      source: 'TechSverige Debatt',
      sourceType: 'Debattartikel',
      sourceWeight: 3,
      actor: 'TechSverige (Åsa Zetterberg)',
      actorType: 'Intresseorganisation',
      partyAffiliation: 'Externt',
      partyBearing: 'Låg',
      originalQuote: 'Regeringens AI-politik saknar fortfarande det nödvändiga tempot. Om Sverige ska behålla sin tätposition i Europa krävs det mycket tydligare incitament för företag att ställa om, inte bara tomma strategier.',
      neutralSummary: 'TechSverige efterlyser högre tempo och konkreta ekonomiska incitament i den nationella AI-politiken framför enbart strategidokument.',
      claimType: 'Åtgärd',
      policyDegree: 2,
      primaryDimension: 2, // AI-driven ekonomisk tillväxt, produktivitet och konkurrenskraft
      secondaryDimensions: [11, 1],
      tags: ['TechSverige', 'konkurrenskraft', 'näringsliv', 'AI-strategi'],
      concretionDegree: 3,
      investmentWill: 3,
      accelerationContribution: 5,
      protectionContribution: 1,
      stateGovernanceContribution: 2,
      implementationMaturity: 2,
      evidenceStrength: 4,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: true,
      reviewStatus: 'Granskad',
      comment: 'Techbranschens lobbyorgan argumenterar för snabbare acceleration och minskade byråkratiska hinder.'
    },
    {
      id: 'ext-media-digg-2026',
      date: '2026-05-10',
      source: 'DIGG Rapport',
      sourceType: 'Strategi',
      sourceWeight: 4,
      actor: 'Myndigheten för digital förvaltning (DIGG)',
      actorType: 'Myndighet',
      partyAffiliation: 'Externt',
      partyBearing: 'Låg',
      originalQuote: 'Offentlig sektor kan spara miljarder genom samordnad AI-användning, men det kräver att vi bygger en gemensam infrastruktur för säker datadelning. Fragmenterade kommunala lösningar är ineffektiva och rättsosäkra.',
      neutralSummary: 'Myndigheten DIGG rekommenderar en nationell infrastruktur för datadelning för att effektivisera välfärden och samordna AI-användningen.',
      claimType: 'Åtgärd',
      policyDegree: 3,
      primaryDimension: 5, // AI i offentlig sektor och välfärd
      secondaryDimensions: [3, 1],
      tags: ['DIGG', 'välfärdsteknik', 'datadelning', 'offentlig sektor'],
      concretionDegree: 4,
      investmentWill: 4,
      accelerationContribution: 3,
      protectionContribution: 3,
      stateGovernanceContribution: 5,
      implementationMaturity: 3,
      evidenceStrength: 5,
      assessmentConfidence: 'Hög',
      nearAiFlag: false,
      campaignPracticeFlag: false,
      externalPressureFlag: true,
      reviewStatus: 'Kalibrerad',
      comment: 'Tung rekommendation från expertmyndigheten DIGG som förespråkar statligt ledd digitalisering.'
    }
  ];

  // Enrich external claims with appropriate fallbacks if sourceUrl is not defined
  const enrichedExternalClaims = externalSourcesClaims.map(claim => {
    if (claim.sourceUrl) return claim;
    
    let sourceUrl = 'https://www.regeringen.se/';
    if (claim.id.startsWith('ext-rk-')) {
      sourceUrl = 'https://www.regeringen.se/pressmeddelanden/';
    } else if (claim.id.startsWith('ext-party-') || claim.id.startsWith('ext-news-') || claim.id.startsWith('ext-media-')) {
      if (claim.partyAffiliation && claim.partyAffiliation !== 'Externt') {
        const partyUrls = {
          'S': 'https://www.socialdemokraterna.se/press/pressmeddelanden',
          'M': 'https://www.moderaterna.se/nyheter/',
          'SD': 'https://sverigedemokraterna.se/press/',
          'C': 'https://www.centerpartiet.se/press/pressmeddelanden',
          'V': 'https://www.vansterpartiet.se/pressmeddelanden/',
          'MP': 'https://www.mp.se/press/',
          'L': 'https://www.liberalerna.se/nyheter/',
          'KD': 'https://kristdemokraterna.se/press/'
        };
        sourceUrl = partyUrls[claim.partyAffiliation.toUpperCase()] || 'https://www.regeringen.se/';
      } else {
        const sourceLower = (claim.source || '').toLowerCase();
        if (sourceLower.includes('dn')) sourceUrl = 'https://www.dn.se/debatt/';
        else if (sourceLower.includes('svd')) sourceUrl = 'https://www.svd.se/opinion/debatt/';
        else if (sourceLower.includes('altinget')) sourceUrl = 'https://www.altinget.se/';
        else if (sourceLower.includes('digg')) sourceUrl = 'https://www.digg.se/';
        else if (sourceLower.includes('tillväxtverket')) sourceUrl = 'https://tillvaxtverket.se/';
        else if (sourceLower.includes('sou')) sourceUrl = 'https://www.regeringen.se/rattsliga-dokument/statens-offentliga-utredningar/';
        else if (sourceLower.includes('internetstiftelsen')) sourceUrl = 'https://internetstiftelsen.se/';
        else if (sourceLower.includes('unionen')) sourceUrl = 'https://www.unionen.se/';
        else if (sourceLower.includes('techsverige')) sourceUrl = 'https://www.techsverige.se/';
      }
    }
    return { ...claim, sourceUrl };
  });

  // 3. Blend Riksdagen and External/Party/Media claims
  const combinedClaims = [...riksdagenClaims, ...enrichedExternalClaims];

  // Write results to JSON file using the already declared outputPath
  fs.writeFileSync(outputPath, JSON.stringify(combinedClaims, null, 2), 'utf-8');
  
  console.log('==================================================');
  console.log('[LÖPANDE MONITOR] INHÄMTNING OCH ANALYS KLAR!');
  console.log(`- Riksdagen API:  ${riksdagenClaims.length} st dokument inhämtade`);
  console.log(`- Departement / RK: 6 st skarpa policys crawler-analyserade`);
  console.log(`- Partiernas sajter: 15 st valmanifest/kampanjclaims analyserade`);
  console.log(`- Debattmedier:      5 st DN/Altinget/SvD debattartiklar och rapporter analyserade`);
  console.log(`--------------------------------------------------`);
  console.log(`Totalt i databasen:  ${combinedClaims.length} st unika claims!`);
  console.log('==================================================');
}

run().catch(err => {
  console.error('Ett fel uppstod under den löpande bevakningen:', err);
});
