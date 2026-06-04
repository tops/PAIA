import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import dns from 'dns';

// Force Node.js to resolve IPv4 first to avoid IPv6 timeouts on Google News / external servers
dns.setDefaultResultOrder('ipv4first');

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
  const cachedClaimsMap = new Map();
  if (fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      if (Array.isArray(existing)) {
        existing.forEach(c => {
          if (c && c.id) {
            cachedClaimsMap.set(c.id, c);
          }
        });
        console.log(`[Cache] Laddade ${cachedClaimsMap.size} st sparade claims från disk.`);
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

      // Identify ALL matching AI Dimensions
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

        if (cachedClaimsMap.has(specificCacheId)) {
          const cached = cachedClaimsMap.get(specificCacheId);
          parsedClaim.reviewStatus = cached.reviewStatus || parsedClaim.reviewStatus;
          parsedClaim.primaryDimension = cached.primaryDimension || parsedClaim.primaryDimension;
          parsedClaim.partyAffiliation = cached.partyAffiliation || parsedClaim.partyAffiliation;
          parsedClaim.actorType = cached.actorType || parsedClaim.actorType;
          parsedClaim.comment = cached.comment || parsedClaim.comment;
          parsedClaim.evidenceStrength = cached.evidenceStrength !== undefined ? cached.evidenceStrength : parsedClaim.evidenceStrength;
          parsedClaim.policyDegree = cached.policyDegree !== undefined ? cached.policyDegree : parsedClaim.policyDegree;
        } else if (cachedClaimsMap.has(baseCacheId) && index === 0) {
          // Fallback to base cache ID for the first claim card if no dimension-specific cache exists yet
          const cached = cachedClaimsMap.get(baseCacheId);
          parsedClaim.reviewStatus = cached.reviewStatus || parsedClaim.reviewStatus;
          parsedClaim.primaryDimension = cached.primaryDimension || parsedClaim.primaryDimension;
          parsedClaim.partyAffiliation = cached.partyAffiliation || parsedClaim.partyAffiliation;
          parsedClaim.actorType = cached.actorType || parsedClaim.actorType;
          parsedClaim.comment = cached.comment || parsedClaim.comment;
          parsedClaim.evidenceStrength = cached.evidenceStrength !== undefined ? cached.evidenceStrength : parsedClaim.evidenceStrength;
          parsedClaim.policyDegree = cached.policyDegree !== undefined ? cached.policyDegree : parsedClaim.policyDegree;
        }

        cachedClaimsMap.set(parsedClaim.id, parsedClaim);
      });
    });
  }

  // 2. Dynamic fetching of other sources (Regeringskansliet, Party Websites via Google News)
  console.log('==================================================');
  console.log('STARTAR DYNAMISK BEVAKNING AV EXTERNA KÄLLOR...');
  console.log('==================================================');

  const rssParser = new Parser();
  let externalClaimsCount = 0;

  // Helper to format date
  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      return d.toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }
  // Helper to detect actor, party and actor type from text
  function detectActorAndParty(text, defaultParty = 'Externt', dateStr = '') {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('ebba busch')) {
      return { actor: 'Ebba Busch (KD)', party: 'KD', actorType: 'Minister' };
    }
    if (textLower.includes('ulf kristersson')) {
      return { actor: 'Ulf Kristersson (M)', party: 'M', actorType: 'Minister' };
    }
    if (textLower.includes('johan pehrson')) {
      return { actor: 'Johan Pehrson (L)', party: 'L', actorType: 'Minister' };
    }
    if (textLower.includes('gunnar strömmer')) {
      return { actor: 'Gunnar Strömmer (M)', party: 'M', actorType: 'Minister' };
    }
    if (textLower.includes('erik slottner')) {
      return { actor: 'Erik Slottner (KD)', party: 'KD', actorType: 'Minister' };
    }
    if (textLower.includes('carl-oskar bohlin')) {
      return { actor: 'Carl-Oskar Bohlin (M)', party: 'M', actorType: 'Minister' };
    }
    if (textLower.includes('magdalena andersson')) {
      return { actor: 'Magdalena Andersson (S)', party: 'S', actorType: 'Partiledare' };
    }
    if (textLower.includes('jimmie åkesson')) {
      return { actor: 'Jimmie Åkesson (SD)', party: 'SD', actorType: 'Partiledare' };
    }
    if (textLower.includes('muharrem demirok')) {
      return { actor: 'Muharrem Demirok (C)', party: 'C', actorType: 'Partiledare' };
    }
    if (textLower.includes('nooshi dadgostar')) {
      return { actor: 'Nooshi Dadgostar (V)', party: 'V', actorType: 'Partiledare' };
    }
    if (textLower.includes('daniel helldén') || textLower.includes('amanda lind')) {
      const name = textLower.includes('daniel helldén') ? 'Daniel Helldén (MP)' : 'Amanda Lind (MP)';
      return { actor: name, party: 'MP', actorType: 'Partiledare' };
    }
    
    if (defaultParty === 'Externt') {
      if (dateStr && dateStr < '2021-11-30') {
        return { actor: 'Regeringen Löfven', party: 'S', actorType: 'Regering' };
      } else if (dateStr && dateStr < '2022-10-18') {
        return { actor: 'Regeringen Andersson', party: 'S', actorType: 'Regering' };
      } else {
        return { actor: 'Regeringen Kristersson', party: 'M', actorType: 'Regering' };
      }
    }

    const partyActors = {
      'S': 'Socialdemokraterna',
      'M': 'Moderaterna',
      'SD': 'Sverigedemokraterna',
      'C': 'Centerpartiet',
      'V': 'Vänsterpartiet',
      'MP': 'Miljöpartiet',
      'L': 'Liberalerna',
      'KD': 'Kristdemokraterna'
    };
    
    return { 
      actor: partyActors[defaultParty] || 'Politisk aktör', 
      party: defaultParty, 
      actorType: 'Parti' 
    };
  }

  // Generate unique, stable ID based on URL or title
  function generateStableId(prefix, item) {
    const rawString = item.link || item.guid || item.title || '';
    let slug = rawString
      .replace(/^https?:\/\//i, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)
      .toLowerCase();
    
    if (!slug) {
      slug = Math.random().toString(36).substring(2, 10);
    }
    return `${prefix}-${slug}`;
  }

  // Helper to fetch feed
  async function fetchRssFeedItems(parser, url) {
    try {
      const feed = await parser.parseURL(url);
      return feed.items || [];
    } catch (err) {
      console.log(`  [RSS Warning] Kunde inte hämta/parsa ${url}:`, err.message);
      return [];
    }
  }

  // Main processing function for feed items
  function processFeedItem(item, idPrefix, defaultParty) {
    const title = item.title || '';
    const snippet = item.contentSnippet || item.content || title;
    const link = item.link || '';
    const textToAnalyze = (title + ' ' + snippet).toLowerCase();

    // Identify AI Dimensions
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

    if (matchingDimensions.length === 0) {
      matchingDimensions.push({ id: 1, tags: ['AI'] });
    }

    const cleanQuote = snippet.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
    const originalQuote = cleanQuote.length > 240 ? cleanQuote.substring(0, 240) + '...' : cleanQuote;

    const itemDate = formatDate(item.pubDate);
    const actorInfo = detectActorAndParty(title + ' ' + snippet, defaultParty, itemDate);
    const party = actorInfo.party;
    const actor = actorInfo.actor;
    const actorType = actorInfo.actorType;

    let sourceType = 'Nyhet';
    let sourceWeight = 3;
    let partyBearing = 'Medel';
    let sourceName = `Nyheter (${defaultParty})`;

    if (idPrefix === 'rk') {
      sourceType = 'Pressmeddelande';
      sourceWeight = 4;
      partyBearing = 'Hög';
      sourceName = 'Regeringskansliet Pressmeddelande';
    } else {
      sourceType = 'Pressmeddelande';
      sourceWeight = 3;
      partyBearing = 'Hög';
      sourceName = `Partiutspel ${party}`;
    }

    const cleanTitle = title.replace(/\s+-\s+.*$/, '').trim();

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

    matchingDimensions.forEach((match, index) => {
      const primaryDimension = match.id;
      const tags = match.tags;
      
      const baseId = generateStableId(`ext-${idPrefix}`, item);
      const claimId = matchingDimensions.length === 1 
        ? baseId
        : `${baseId}-d${primaryDimension}`;

      const parsedClaim = {
        id: claimId,
        sourceUrl: link,
        date: formatDate(item.pubDate),
        source: sourceName,
        sourceType,
        sourceWeight,
        actor,
        actorType,
        partyAffiliation: party,
        partyBearing,
        originalQuote,
        neutralSummary: `${cleanTitle} (Dimension ${primaryDimension}: ${lockedDimensions.find(ld => ld.id === primaryDimension)?.name || 'Okänd'})`,
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
        reviewStatus: 'Ny',
        comment: `Automatiskt inhämtat från RSS (${sourceName}).`
      };

      const baseCacheId = baseId;
      const specificCacheId = claimId;

      // Preserve cached user reviews/edits
      if (cachedClaimsMap.has(specificCacheId)) {
        const cached = cachedClaimsMap.get(specificCacheId);
        parsedClaim.reviewStatus = cached.reviewStatus || parsedClaim.reviewStatus;
        parsedClaim.primaryDimension = cached.primaryDimension || parsedClaim.primaryDimension;
        parsedClaim.partyAffiliation = cached.partyAffiliation || parsedClaim.partyAffiliation;
        parsedClaim.actorType = cached.actorType || parsedClaim.actorType;
        parsedClaim.comment = cached.comment || parsedClaim.comment;
        parsedClaim.evidenceStrength = cached.evidenceStrength !== undefined ? cached.evidenceStrength : parsedClaim.evidenceStrength;
        parsedClaim.policyDegree = cached.policyDegree !== undefined ? cached.policyDegree : parsedClaim.policyDegree;
      } else if (cachedClaimsMap.has(baseCacheId) && index === 0) {
        const cached = cachedClaimsMap.get(baseCacheId);
        parsedClaim.reviewStatus = cached.reviewStatus || parsedClaim.reviewStatus;
        parsedClaim.primaryDimension = cached.primaryDimension || parsedClaim.primaryDimension;
        parsedClaim.partyAffiliation = cached.partyAffiliation || parsedClaim.partyAffiliation;
        parsedClaim.actorType = cached.actorType || parsedClaim.actorType;
        parsedClaim.comment = cached.comment || parsedClaim.comment;
        parsedClaim.evidenceStrength = cached.evidenceStrength !== undefined ? cached.evidenceStrength : parsedClaim.evidenceStrength;
        parsedClaim.policyDegree = cached.policyDegree !== undefined ? cached.policyDegree : parsedClaim.policyDegree;
      }

      cachedClaimsMap.set(parsedClaim.id, parsedClaim);
      externalClaimsCount++;
    });
  }

  // A. Fetch from Regeringskansliet via Google News RSS Search
  console.log('[Regeringskansliet via Google News RSS] Hämtar pressmeddelanden om AI...');
  const rkQuery = 'site:regeringen.se ("artificiell intelligens" OR "AI" OR "maskininlärning" OR "språkmodeller" OR "algoritmer")';
  const rkUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(rkQuery)}&hl=sv&gl=SE&ceid=SE:sv`;
  const rkItems = await fetchRssFeedItems(rssParser, rkUrl);
  console.log(`  -> Hittade ${rkItems.length} pressmeddelanden.`);

  for (const item of rkItems) {
    processFeedItem(item, 'rk', 'Externt');
  }

  // B. Fetch from Google News RSS for each party
  const partiesToScan = [
    { name: 'S', domain: 'socialdemokraterna.se' },
    { name: 'M', domain: 'moderaterna.se' },
    { name: 'SD', domain: 'sd.se' },
    { name: 'C', domain: 'centerpartiet.se' },
    { name: 'V', domain: 'vansterpartiet.se' },
    { name: 'MP', domain: 'mp.se' },
    { name: 'L', domain: 'liberalerna.se' },
    { name: 'KD', domain: 'kristdemokraterna.se' }
  ];

  for (const party of partiesToScan) {
    console.log(`[Google News RSS] Söker partimaterial för ${party.name} (${party.domain})...`);
    const query = `site:${party.domain} ("artificiell intelligens" OR "AI" OR "maskininlärning" OR "språkmodeller" OR "algoritmer")`;
    const partyUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=sv&gl=SE&ceid=SE:sv`;
    const partyItems = await fetchRssFeedItems(rssParser, partyUrl);
    console.log(`  -> Hittade ${partyItems.length} artiklar.`);

    for (const item of partyItems) {
      processFeedItem(item, `party-${party.name.toLowerCase()}`, party.name);
    }
    
    // Throttle requests slightly
    await sleep(800);
  }

  const combinedClaims = Array.from(cachedClaimsMap.values());
  const riksdagenClaimsCount = combinedClaims.filter(c => c.id.startsWith('riksdagen-')).length;

  // Write results to JSON file using the already declared outputPath
  fs.writeFileSync(outputPath, JSON.stringify(combinedClaims, null, 2), 'utf-8');
  
  console.log('==================================================');
  console.log('[LÖPANDE MONITOR] INHÄMTNING OCH ANALYS KLAR!');
  console.log(`- Riksdagen API:     ${riksdagenClaimsCount} st claims i databasen`);
  console.log(`- Externa källor:    ${externalClaimsCount} st claims behandlade/uppdaterade i denna körning`);
  console.log(`--------------------------------------------------`);
  console.log(`Totalt i databasen:  ${combinedClaims.length} st unika claims!`);
  console.log('==================================================');
}

run().catch(err => {
  console.error('Ett fel uppstod under den löpande bevakningen:', err);
});
