export interface Option {
  text: string;
  accVal: number; // Främja & Accelerera (0-5)
  protVal: number; // Reglera & Skydda (0-5)
  govVal: number; // Offentlig Styrning & Välfärd (0-5)
}

export interface Question {
  id: number;
  dimensionId: number;
  category: string;
  question: string;
  options: Option[];
  isOptional?: boolean;
}

export const compassQuestions: Question[] = [
  // ==========================================
  // DIMENSION 1: Styrning och politiskt ledarskap
  // ==========================================
  {
    id: 1,
    dimensionId: 1,
    category: 'Politiskt ledarskap',
    question: 'Hur bör det nationella politiska ledarskapet för AI-omställningen organiseras i Sverige?',
    options: [
      { text: 'Låt marknadskrafterna och enskilda sektorer styra; staten bör inte bygga centraliserad byråkrati.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Inrätta en rådgivande AI-kommission under statsministern för strategiskt samarbete mellan näringsliv och stat.', accVal: 4, protVal: 3, govVal: 3.5 },
      { text: 'Inrätta en oberoende etisk AI-inspektion med mandat att stoppa riskfyllda eller icke-transparenta statliga system.', accVal: 1, protVal: 5, govVal: 3.5 },
      { text: 'Inrätta ett dedikerat AI- och digitaliseringsdepartement som centralt detaljstyr omställningen i offentlig sektor.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 13,
    dimensionId: 1,
    category: 'Politiskt ledarskap',
    question: 'Bör staten ställa upp tvingande etiska riktlinjer för alla myndigheters inköp och utveckling av AI?',
    isOptional: true,
    options: [
      { text: 'Nej, det skapar onödiga hinder och fördröjer implementeringen av effektiviseringsteknik.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Bör endast ske som rekommendationer och vägledningar för att inte hämma innovativt samarbete med näringslivet.', accVal: 4, protVal: 2.5, govVal: 3 },
      { text: 'Ja, etiska skyddsräcken måste gälla strikt för att garantera medborgarnas integritet och rättssäkerhet.', accVal: 1.5, protVal: 5, govVal: 3.5 },
      { text: 'Ja, och all AI-utveckling i staten ska granskas centralt av en statlig etisk tillsynsmyndighet.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 14,
    dimensionId: 1,
    category: 'Politiskt ledarskap',
    question: 'Hur bör civilsamhället och medborgarna få inflytande över statens långsiktiga AI-strategier?',
    isOptional: true,
    options: [
      { text: 'Genom konsumentval på den fria marknaden; medborgarna väljer de digitala tjänster de föredrar.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Genom öppna remissförfaranden och nära samverkan med näringslivsorganisationer.', accVal: 4, protVal: 2.5, govVal: 3 },
      { text: 'Genom att inrätta ett nationellt medborgarråd som granskar de etiska aspekterna av nya statliga AI-projekt.', accVal: 1.5, protVal: 5, govVal: 3.5 },
      { text: 'Genom lagstadgad insyn och demokratisk kontroll där fackförbund och intresseorganisationer har direkt beslutanderätt.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 15,
    dimensionId: 1,
    category: 'Politiskt ledarskap',
    question: 'Bör Sverige driva en gemensam, överstatlig AI-politik inom EU snarare än nationella särregler?',
    isOptional: true,
    options: [
      { text: 'Ja, en stark gemensam inre marknad utan nationella särregler är avgörande för europeisk konkurrenskraft.', accVal: 5, protVal: 1.5, govVal: 1.5 },
      { text: 'Ja, men Sverige bör behålla flexibilitet för att underlätta för inhemska startups och tillväxtbolag.', accVal: 4, protVal: 3, govVal: 2 },
      { text: 'Nej, Sverige måste ha möjlighet att sätta hårdare nationella integritets- och etikkrav än EU:s miniminivå.', accVal: 1, protVal: 5, govVal: 3 },
      { text: 'Nej, vi bör ha en stark statlig reglering anpassad efter den svenska förvaltningsmodellen och svensk välfärd.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 2: Ekonomi, produktivitet och konkurrenskraft
  // ==========================================
  {
    id: 2,
    dimensionId: 2,
    category: 'Ekonomisk omställning',
    question: 'Hur bör samhället möta risken för att mänskliga jobb automatiseras eller förändras av AI?',
    options: [
      { text: 'Marknaden anpassar sig bäst själv; statliga ingrepp riskerar bara att hämma den naturliga strukturomvandlingen.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Erbjud generösa skatteavdrag för företagsutbildningar och vidareutbildning i AI för anställda.', accVal: 4.5, protVal: 3, govVal: 3 },
      { text: 'Utred en särskild AI-skatt på företag som ersätter mänsklig arbetskraft med maskiner, för att trygga välfärdens finansiering.', accVal: 0.5, protVal: 5, govVal: 4 },
      { text: 'Genomför en statlig, nationell omställningsplan tillsammans med fackförbunden med garanterad omskolning för alla drabbade.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 16,
    dimensionId: 2,
    category: 'Ekonomisk omställning',
    question: 'Bör staten finansiera direkta produktivitetsstöd till företag som implementerar AI?',
    isOptional: true,
    options: [
      { text: 'Nej, marknadsdrivna företag ska finansiera sina egna teknikskiften; staten bör sänka bolagsskatterna istället.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Ja, genom riktade teknikcheckar till små och medelstora företag via regionala kluster.', accVal: 4.5, protVal: 2, govVal: 3.5 },
      { text: 'Endast om företagen uppfyller strikta krav på kollektivavtal, etisk AI-användning och klimathänsyn.', accVal: 2, protVal: 5, govVal: 3.5 },
      { text: 'Ja, staten bör ge storskaligt finansiellt stöd i form av strategiska industrisubventioner under statlig övervakning.', accVal: 3, protVal: 3, govVal: 5 }
    ]
  },
  {
    id: 17,
    dimensionId: 2,
    category: 'Ekonomisk omställning',
    question: 'Hur ser du på framtiden för medborgarlön (basinkomst) i ett samhälle där AI automatiserar en stor del av jobben?',
    isOptional: true,
    options: [
      { text: 'Det är en farlig väg som minskar drivkrafterna till arbete; marknaden kommer att skapa nya typer av jobb.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Det bör inte införas nu, men staten kan utreda anpassningar av trygghetssystemen för ökad flexibilitet.', accVal: 3.5, protVal: 2.5, govVal: 3 },
      { text: 'Vi bör aktivt planera för och utreda basinkomst för att skydda medborgarna mot extrem ojämlikhet vid utbredd automatisering.', accVal: 1.5, protVal: 5, govVal: 3.5 },
      { text: 'Vi bör inrätta en statlig jobbgaranti i offentlig sektor snarare än medborgarlön, så att alla har en samhällsnyttig roll.', accVal: 2, protVal: 3.5, govVal: 5 }
    ]
  },
  {
    id: 18,
    dimensionId: 2,
    category: 'Ekonomisk omställning',
    question: 'Bör staten tillåta mer flexibla anställningsformer (t.ex. i gig-ekonomin) för att locka utländska AI- och techplattformar?',
    isOptional: true,
    options: [
      { text: 'Ja, flexibla arbetsmarknadslagar är helt avgörande för att Sverige ska vara ett attraktivt och konkurrenskraftigt land.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Ja, men underlätta samtidigt för plattformarna att teckna enklare, kollektiva trygghetsavtal.', accVal: 4, protVal: 3, govVal: 2.5 },
      { text: 'Nej, den svenska modellen med starka kollektivavtal och anställningstrygghet får aldrig offras för techbolagens vinster.', accVal: 1, protVal: 5, govVal: 4 },
      { text: 'Nej, vi bör införa ett stenhårt regelverk för gig-plattformar och klassa alla gig-arbetare som tillsvidareanställda.', accVal: 1.5, protVal: 4.5, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 3: Infrastruktur, data och beräkningskapacitet
  // ==========================================
  {
    id: 3,
    dimensionId: 3,
    category: 'AI-infrastruktur',
    question: 'Vilket finansiellt ansvar har staten för att bygga AI-infrastruktur och beräkningskapacitet?',
    options: [
      { text: 'Det är marknadens roll; staten bör endast sänka skatter för techinvesteringar och erbjuda enklare skattelättnader.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Staten bör samfinansiera superdatorer (t.ex. Linköping) i nära samarbete med näringsliv och akademi.', accVal: 4.5, protVal: 2.5, govVal: 3.5 },
      { text: 'Staten kan bidra med finansiering, men endast om infrastrukturen bygger helt på öppen källkod och hållbara energilösningar.', accVal: 2.5, protVal: 5, govVal: 4 },
      { text: 'Staten bör bygga, äga och drifta en helstatlig, säker molninfrastruktur för att skydda känsliga svenska myndighetsdata.', accVal: 2, protVal: 4.5, govVal: 5 }
    ]
  },
  {
    id: 19,
    dimensionId: 3,
    category: 'AI-infrastruktur',
    question: 'Hur bör Sverige hantera delning av offentliga data (t.ex. hälsodata) för träning av AI-modeller?',
    isOptional: true,
    options: [
      { text: 'Öppna upp och dela all tillgänglig offentlig data fritt och snabbt för att ge svenska företag en konkurrensfördel.', accVal: 5, protVal: 1, govVal: 2 },
      { text: 'Dela anonymiserad hälsodata under säkra former genom statligt kontrollerade forskningsplattformar.', accVal: 4, protVal: 3.5, govVal: 4 },
      { text: 'Förbjud all delning av patient- och medborgardata för AI-träning för att garantera absolut integritet och sekretess.', accVal: 0.5, protVal: 5, govVal: 2.5 },
      { text: 'Tillåt datadelning och träning uteslutande för statliga välfärdsprojekt, med strikt statligt ägda och isolerade servrar.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 20,
    dimensionId: 3,
    category: 'AI-infrastruktur',
    question: 'Bör staten kräva att all AI-mjukvara som används i offentlig sektor baseras på öppen källkod?',
    isOptional: true,
    options: [
      { text: 'Nej, offentlig sektor bör fritt kunna upphandla de mest effektiva, proprietära kommersiella lösningarna på marknaden.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Det bör uppmuntras, men inte vara ett absolut krav som utestänger ledande globala leverantörer.', accVal: 4, protVal: 3, govVal: 3 },
      { text: 'Ja, öppen källkod är nödvändigt för att möjliggöra oberoende säkerhetsrevisioner, transparens och demokratisk granskning.', accVal: 2, protVal: 5, govVal: 4 },
      { text: 'Ja, statliga myndigheter ska bygga egna system på öppen källkod för att undvika beroende av utländska techjättar.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 21,
    dimensionId: 3,
    category: 'AI-infrastruktur',
    question: 'Hur ställer du dig till att lagra svenska myndigheters känsliga medborgardata i molntjänster ägda av utländska techbolag?',
    isOptional: true,
    options: [
      { text: 'Det är helt acceptabelt om det ger bäst prestanda och säkerhet till lägst kostnad på marknaden.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Det kan tillåtas under förutsättning att strikta krypterings- och dataskyddsavtal upprättas.', accVal: 4, protVal: 3, govVal: 3 },
      { text: 'Det bör undvikas på grund av risken för utländsk spionage och lagstiftning som ger utländska stater tillgång till svenska data.', accVal: 1, protVal: 5, govVal: 4 },
      { text: 'Det ska förbjudas helt i lag; all lagring av känsliga offentliga data måste ske på svensk mark i helstatliga datacenter.', accVal: 1.5, protVal: 4.5, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 4: Reglering, tillsyn och rättssäkerhet
  // ==========================================
  {
    id: 4,
    dimensionId: 4,
    category: 'Reglering & Rättssäkerhet',
    question: 'Hur bör Sverige förhålla sig till reglering av AI-system under EU:s nya AI Act?',
    options: [
      { text: 'Minimera byråkratiskt krångel, underlätta snabb marknadsomställning och undvika tillsynshinder för företag.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Främja snabb innovation med säkra regulatoriska sandlådor och proaktiv vägledning från tillsynsmyndigheter.', accVal: 4.5, protVal: 3.5, govVal: 3 },
      { text: 'Etablera en stenhård och oberoende tillsynsstruktur under IMY för att skydda grundläggande rättigheter och minimera risker.', accVal: 1, protVal: 5, govVal: 3 },
      { text: 'Skapa en central statlig AI-myndighet med mandat att förhandsgodkänna alla offentliga AI-system innan de tas i bruk.', accVal: 2, protVal: 4.5, govVal: 5 }
    ]
  },
  {
    id: 22,
    dimensionId: 4,
    category: 'Reglering & Rättssäkerhet',
    question: 'Hur bör Sverige förhålla sig till helautomatiserade beslut (algoritmer) i myndighetsutövning?',
    isOptional: true,
    options: [
      { text: 'Automatisera maximalt för att radikalt korta handläggningstider och minska offentliga kostnader.', accVal: 5, protVal: 1.5, govVal: 2 },
      { text: 'Automatisera i hög takt men kräv fullständig algoritmisk spårbarhet och mänsklig överklaganderätt.', accVal: 4, protVal: 3.5, govVal: 3.5 },
      { text: 'Stoppa all helautomatisk handläggning i känsliga ärenden (t.ex. socialtjänst) för att förhindra diskriminering.', accVal: 1, protVal: 5, govVal: 3 },
      { text: 'Tillåt endast statligt certifierade och helt öppna algoritmer som kontrolleras löpande av en statlig granskningsnämnd.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 23,
    dimensionId: 4,
    category: 'Reglering & Rättssäkerhet',
    question: 'Bör medborgare ha lagstadgad rätt till en begriplig mänsklig förklaring när ett beslut fattats med stöd av AI?',
    isOptional: true,
    options: [
      { text: 'Nej, det är tekniskt svårt att förklara djupa neurala nätverk och kraven riskerar att stoppa nödvändig effektivisering.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Ja, men endast för mer ingripande myndighetsbeslut; enklare rutinärenden bör kunna automatiseras utan strikta förklaringskrav.', accVal: 4, protVal: 3, govVal: 3 },
      { text: 'Ja, rättssäkerheten kräver att varje individ kan förstå grunderna för ett myndighetsbeslut och hur algoritmen vägt data.', accVal: 1.5, protVal: 5, govVal: 4 },
      { text: 'Ja, och staten bör utveckla ett standardiserat system för automatiska förklaringsrapporter som måste skickas ut med alla beslut.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 24,
    dimensionId: 4,
    category: 'Reglering & Rättssäkerhet',
    question: 'Hur ser du på användningen av regulatoriska sandlådor (där företag kan testa AI-teknik med tillfälliga undantag från lagar)?',
    isOptional: true,
    options: [
      { text: 'Det är ett utmärkt sätt att snabba på innovation; vi bör införa sådana sandlådor brett inom så många sektorer som möjligt.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Det är bra, men sandlådorna måste övervakas noga av tillsynsmyndigheter för att förhindra oavsiktliga skador.', accVal: 4.5, protVal: 3, govVal: 3 },
      { text: 'Vi bör vara mycket restriktiva; lagar om dataskydd och konsumentsäkerhet får inte försvagas ens under testperioder.', accVal: 1.5, protVal: 5, govVal: 3.5 },
      { text: 'Sandlådor bör endast tillåtas under statlig regi för projekt som direkt gynnar allmännyttan och den offentliga välfärden.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 5: Offentlig förvaltning och välfärd
  // ==========================================
  {
    id: 5,
    dimensionId: 5,
    category: 'Välfärd & Offentlig sektor',
    question: 'Hur bör vi bäst integrera AI i den kommunala och statliga välfärden?',
    options: [
      { text: 'Låt privata leverantörer konkurrera fritt om att leverera AI-tjänster till välfärden för att snabbt höja effektiviteten.', accVal: 5, protVal: 1, govVal: 1.5 },
      { text: 'Fasa in AI gradvis under vägledning av nationella sekretessriktlinjer och certifierade och granskade leverantörer.', accVal: 4, protVal: 3.5, govVal: 4 },
      { text: 'Bromsa införandet tills vi kan garantera 100% patientsäkerhet, sekretess och förhindra digitalt utanförskap.', accVal: 1, protVal: 5, govVal: 3.5 },
      { text: 'Bygg gemensamma, statliga välfärdsalgoritmer under ledning av Digg för att garantera demokratisk insyn och kontroll.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 25,
    dimensionId: 5,
    category: 'Välfärd & Offentlig sektor',
    question: 'Hur bör vi förhålla sig till AI-stöd för cancerdiagnostik och journalanalys i sjukvården?',
    isOptional: true,
    options: [
      { text: 'Snabba på alla godkännanden och implementeringar maximalt; AI räddar liv snabbare än traditionell byråkrati tillåter.', accVal: 5, protVal: 1, govVal: 2 },
      { text: 'Fasa in AI som kliniskt beslutsstöd för läkare, men behåll alltid det slutgiltiga ansvaret hos legitimerad vårdpersonal.', accVal: 4, protVal: 3.5, govVal: 4 },
      { text: 'Kräv rigorösa kliniska långtidsstudier och bias-tester av algoritmerna innan något diagnostiskt AI-verktyg godkänns för drift.', accVal: 1, protVal: 5, govVal: 3.5 },
      { text: 'Skapa en nationell diagnostikplattform ägd av Socialstyrelsen för att säkerställa att alla regioner har lika tillgång till AI-vård.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 26,
    dimensionId: 5,
    category: 'Välfärd & Offentlig sektor',
    question: 'Bör AI-system få användas för att självständigt prioritera patienter i vårdköer (triage)?',
    isOptional: true,
    options: [
      { text: 'Ja, algoritmer kan analysera data mer objektivt och effektivt än stressad personal och korta vårdköerna.', accVal: 5, protVal: 1, govVal: 2 },
      { text: 'Endast som ett rådgivande beslutsstöd; prioriteringar måste alltid godkännas och signeras av en mänsklig sjuksköterska.', accVal: 3.5, protVal: 3.5, govVal: 4 },
      { text: 'Nej, medicinska prioriteringar handlar om etiska bedömningar som aldrig får delegeras till ett opersonligt datasystem.', accVal: 0.5, protVal: 5, govVal: 3 },
      { text: 'Nej, och vi bör lagstadga om att all patientkontakt och triage i första hand ska skötas av legitimerad, mänsklig personal.', accVal: 1.5, protVal: 4.5, govVal: 5 }
    ]
  },
  {
    id: 27,
    dimensionId: 5,
    category: 'Välfärd & Offentlig sektor',
    question: 'Hur ställer du dig till AI-baserad behovsprövning i socialtjänsten (t.ex. för ekonomiskt bistånd)?',
    isOptional: true,
    options: [
      { text: 'Mycket positivt; det ger omedelbara svar till den sökande och frigör socialsekreterare till mer komplicerade fall.', accVal: 5, protVal: 1.5, govVal: 2.5 },
      { text: 'Det kan tillåtas för enklare ansökningar, men kräv alltid mänsklig prövning vid avslag eller komplicerade livssituationer.', accVal: 4, protVal: 3.5, govVal: 4 },
      { text: 'Negativt; riskerna för strukturell diskriminering och att utsatta människor hamnar i kläm i ett stelt system är för stora.', accVal: 1, protVal: 5, govVal: 3.5 },
      { text: 'Biståndsbeslut bör uteslutande fattas av människor; algoritmer ska endast användas för att flagga fusk och felaktiga utbetalningar.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 6: Arbetsmarknad, kompetens och omställning
  // ==========================================
  {
    id: 6,
    dimensionId: 6,
    category: 'Arbetsmarknad & Kompetens',
    question: 'Hur ska skolan förhålla sig till elevers användning av generativ AI (t.ex. ChatGPT) i skolarbetet?',
    options: [
      { text: 'Bejaka och integrera verktygen fullt ut; skolan ska spegla arbetslivets digitala verklighet utan restriktioner.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Tillåta AI-användning men utbilda eleverna i källkritik, etisk användning och förståelse för hur modeller fungerar.', accVal: 4, protVal: 3.5, govVal: 3.5 },
      { text: 'Begränsa AI-användning hårt under lektionstid; återgå till analoga salsskrivningar på papper och penna för att säkra eget tänkande.', accVal: 0.5, protVal: 5, govVal: 3 },
      { text: 'Låt Skolverket utveckla en statligt ägd skol-AI som är helt fri från reklam och spårning för att garantera en trygg skolmiljö.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 28,
    dimensionId: 6,
    category: 'Arbetsmarknad & Kompetens',
    question: 'Hur bör vi skydda anställda (t.ex. plattformsarbetare) som leds och styrs av AI-algoritmer?',
    isOptional: true,
    options: [
      { text: 'Låt parterna avtala fritt; för mycket detaljreglering riskerar att strypa innovativa affärsmodeller (t.ex. gig-ekonomin).', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Lagstifta om transparenskrav som tvingar bolag att redovisa hur deras algoritmer fördelar jobb och sätter löner.', accVal: 4, protVal: 3.5, govVal: 3 },
      { text: 'Förbjud helt alla former av automatiserad prestationsstyrning via algoritmer som ökar stress eller hotar anställdas hälsa.', accVal: 1, protVal: 5, govVal: 3 },
      { text: 'Låt Arbetsmiljöverket granska och certifiera alla personalstyrande och schemaläggande algoritmer i Sverige.', accVal: 2, protVal: 4.5, govVal: 5 }
    ]
  },
  {
    id: 29,
    dimensionId: 6,
    category: 'Arbetsmarknad & Kompetens',
    question: 'Bör universitet och yrkeshögskolor tvingas anpassa sina utbildningar så att alla studenter lär sig grundläggande AI?',
    isOptional: true,
    options: [
      { text: 'Det löser högskolorna bäst själva i direkt samverkan med näringslivets behov; staten ska inte toppstyr kurser.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Uppmuntra lärosätena genom riktade statliga forsknings- och utbildningsanslag inom AI.', accVal: 4.5, protVal: 2.5, govVal: 3.5 },
      { text: 'Ja, men fokus måste ligga på AI:s etiska, samhälleliga och filosofiska konsekvenser snarare än ren programmering.', accVal: 2, protVal: 5, govVal: 4 },
      { text: 'Ja, staten bör skriva in tvingande AI-kompetenskrav i högskoleförordningen för alla examina.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 30,
    dimensionId: 6,
    category: 'Arbetsmarknad & Kompetens',
    question: 'Ska staten ge ekonomiskt stöd till fackförbunden för att de ska kunna bygga upp kompetens kring AI på arbetsplatserna?',
    isOptional: true,
    options: [
      { text: 'Nej, fackförbunden är fristående organisationer som ska finansiera sin egen verksamhet via medlemsavgifter.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Nej, men staten kan stödja gemensamma partsgemensamma projekt där arbetsgivare och fack samverkar kring AI-utveckling.', accVal: 4.5, protVal: 2.5, govVal: 3.5 },
      { text: 'Ja, för att motverka maktobalansen på arbetsplatserna när arbetsgivare inför personalövervakande AI-system.', accVal: 1.5, protVal: 5, govVal: 4 },
      { text: 'Ja, och fackförbund bör ha lagstadgad vetorätt mot införande av AI-system som fundamentalt förändrar arbetsmiljön.', accVal: 2, protVal: 4.5, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 7: Etik, mänskliga rättigheter och inkludering
  // ==========================================
  {
    id: 7,
    dimensionId: 7,
    category: 'Etik & Mänskliga rättigheter',
    question: 'Hur bör vi bäst motverka fördomar, diskriminering och algoritmisk bias i AI-beslutssystem?',
    options: [
      { text: 'Låt marknadskrafterna lösa det; företag som bygger partiska eller diskriminerande system förlorar kunder naturligt.', accVal: 4.5, protVal: 1, govVal: 1 },
      { text: 'Kräv att alla företag som utvecklar eller använder högrisksystem genomför oberoende etiska konsekvensanalyser.', accVal: 4, protVal: 4, govVal: 3.5 },
      { text: 'Lagstifta om direkt skadeståndsrätt för individer som diskriminerats av en algoritm, med omvänd bevisbörda för techbolaget.', accVal: 1, protVal: 5, govVal: 3 },
      { text: 'Inrätta en statlig diskrimineringsombudsmannafunktion för AI med befogenhet att granska och provköra alla algoritmer.', accVal: 2, protVal: 4.5, govVal: 5 }
    ]
  },
  {
    id: 31,
    dimensionId: 7,
    category: 'Etik & Mänskliga rättigheter',
    question: 'Bör polisen få använda AI-baserad ansiktsigenkänning i realtid på allmänna platser?',
    isOptional: true,
    options: [
      { text: 'Ja, tekniken måste användas offensivt utan onödiga juridiska hinder för att effektivt bekämpa grov brottslighet.', accVal: 4.5, protVal: 1, govVal: 4.5 },
      { text: 'Ja, med strikt domstolsprövning och full loggning av användningen för att skydda mot missbruk.', accVal: 3, protVal: 3.5, govVal: 4 },
      { text: 'Nej, biometrisk realtidsövervakning hotar den personliga integriteten i grunden och bör förbjudas helt i offentliga miljöer.', accVal: 0.5, protVal: 5, govVal: 2.5 },
      { text: 'Tillåt tekniken men låt användningen kontrolleras och granskas i realtid av en oberoende statlig integritetsombudsperson.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 32,
    dimensionId: 7,
    category: 'Etik & Mänskliga rättigheter',
    question: 'Bör det finnas lagkrav på att alla AI-system som används i Sverige måste uppfylla tillgänglighetskrav för funktionsnedsatta?',
    isOptional: true,
    options: [
      { text: 'Nej, marknaden tar fram bäst lösningar naturligt; tvingande lagkrav riskerar att göra teknik dyrare och mer svårtillgänglig.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Ja, men endast för system som används av offentliga myndigheter eller i samhällskritisk verksamhet.', accVal: 4, protVal: 3, govVal: 3.5 },
      { text: 'Ja, digital delaktighet är en mänsklig rättighet och alla kommersiella AI-tjänster måste ha tillgänglighetsgarantier.', accVal: 2, protVal: 5, govVal: 3.5 },
      { text: 'Ja, och staten bör utveckla och erbjuda kostnadsfria verktyg till svenska företag för att kvalitetssäkra tillgängligheten.', accVal: 3, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 33,
    dimensionId: 7,
    category: 'Etik & Mänskliga rättigheter',
    question: 'Bör medborgarna ha en laglig rättighet att begära mänsklig handläggning istället för AI-handläggning i alla offentliga ärenden?',
    isOptional: true,
    options: [
      { text: 'Nej, det omkullkastar hela syftet med att digitalisera och sänka offentliga kostnader; en algoritm är opartisk.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Endast i mer allvarliga eller ingripande myndighetsbeslut (t.ex. inom vård eller rättsväsende).', accVal: 4, protVal: 3, govVal: 3.5 },
      { text: 'Ja, rätten till mänsklig kontakt och personlig bedömning är en grundpelare i ett humant välfärdssamhälle.', accVal: 1, protVal: 5, govVal: 4 },
      { text: 'Ja, och staten ska ha skyldighet att erbjuda personliga, fysiska möten för alla medborgare som önskar det.', accVal: 1.5, protVal: 4.5, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 8: Demokrati, medier och informationspåverkan
  // ==========================================
  {
    id: 8,
    dimensionId: 8,
    category: 'Demokrati & Media',
    question: 'Hur bör Sverige hantera risken för utländsk valpåverkan via AI-genererade deepfakes och trollkonton?',
    options: [
      { text: 'Uppmuntra techjättarna och mediebolagen att själva utveckla verifieringsmetoder; undvik statlig kontroll.', accVal: 4.5, protVal: 1.5, govVal: 1.5 },
      { text: 'Lagstifta om tvingande vattenmärkning av AI-innehåll och ge MPF ökat mandat att flagga desinformation.', accVal: 3, protVal: 4, govVal: 4.5 },
      { text: 'Kriminalisera spridning av olicensierat AI-genererat material som kan påverka opinionen, samt belägga plattformar med dryga böter.', accVal: 0.5, protVal: 5, govVal: 3.5 },
      { text: 'Etablera ett nationellt statligt granskningsråd för digitala medier med befogenhet att blockera misstänkta påverkanskampanjer.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 34,
    dimensionId: 8,
    category: 'Demokrati & Media',
    question: 'Bör all politisk reklam på internet som använder AI-genererade bilder eller röster ha en tvingande varningsstämpel?',
    isOptional: true,
    options: [
      { text: 'Nej, politiska kampanjer använder redan retuschering och effekter; vi bör inte införa speciallagar för just AI.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Bör ske på frivillig basis genom en branschkod och överenskommelser mellan partierna inför val.', accVal: 4, protVal: 3, govVal: 2 },
      { text: 'Ja, väljarna har rätt att veta vad som är äkta och vad som är digitalt manipulerat för att kunna göra informerade val.', accVal: 1.5, protVal: 5, govVal: 3.5 },
      { text: 'Ja, och valmyndigheten ska ha mandat att utdela dryga böter och dra in partistöd för partier som bryter mot reglerna.', accVal: 2, protVal: 4.5, govVal: 5 }
    ]
  },
  {
    id: 35,
    dimensionId: 8,
    category: 'Demokrati & Media',
    question: 'Ska sociala medier-plattformar (t.ex. TikTok eller Facebook) hållas juridiskt ansvariga för skador orsakade av deras AI-algoritmer?',
    isOptional: true,
    options: [
      { text: 'Nej, plattformarna är distributörer, inte publicister; hårdare ansvar riskerar att leda till överdriven censur.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Ja, men endast om de underlåter att agera efter att de har blivit flaggade för olagligt eller skadligt innehåll.', accVal: 4, protVal: 3, govVal: 3 },
      { text: 'Ja, deras rekommendationsalgoritmer är designade för att maximera engagemang och sprider medvetet polariserande material.', accVal: 1, protVal: 5, govVal: 4 },
      { text: 'Ja, och staten bör inrätta en granskningsnämnd med rätt att stänga ner plattformar i Sverige som vägrar öppna sina algoritmer för insyn.', accVal: 2, protVal: 4.5, govVal: 5 }
    ]
  },
  {
    id: 36,
    dimensionId: 8,
    category: 'Demokrati & Media',
    question: 'Bör staten ge särskilt presstöd eller innovationsstöd till oberoende svenska medier för att utveckla motverktyg mot AI-desinformation?',
    isOptional: true,
    options: [
      { text: 'Nej, mediemarknaden bör hantera detta själv; statliga bidrag riskerar att skapa snedvriden konkurrens.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Ja, genom tidsbegränsade teknikprojekt som oberoende medier kan söka i samarbete med universitet.', accVal: 4.5, protVal: 2.5, govVal: 3.5 },
      { text: 'Ja, en fri press är grundläggande för demokratin och behöver resurser för att kvalitetssäkra information i en AI-tid.', accVal: 2, protVal: 5, govVal: 4 },
      { text: 'Ja, och staten bör inrätta ett nationellt forsknings- och faktagranskningscenter under SVT/SR med fokus på AI.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 9: Säkerhet, totalförsvar och cyberrisker
  // ==========================================
  {
    id: 9,
    dimensionId: 9,
    category: 'Säkerhet & Försvar',
    question: 'Hur bör det svenska försvaret (Försvarsmakten) och FRA ställa sig till autonoma AI-vapensystem?',
    options: [
      { text: 'Satsa offensivt på att utveckla och integrera AI-kapabiliteter i vårt totalförsvar för att säkra geopolitisk överlevnad.', accVal: 5, protVal: 1, govVal: 2 },
      { text: 'Utveckla defensiv militär AI i nära samarbete med NATO och svenska försvarsföretag under full mänsklig kontroll.', accVal: 4.5, protVal: 3, govVal: 4 },
      { text: 'Vägra all militär AI utan ett globalt tvingande avtal mot autonoma vapen; behåll strikt analog mänsklig kontroll.', accVal: 1, protVal: 5, govVal: 3 },
      { text: 'Utveckla helstatliga, nationella och krypterade försvarssystem via FOI för att garantera fullständigt oberoende.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 37,
    dimensionId: 9,
    category: 'Säkerhet & Försvar',
    question: 'Hur bör Sverige hantera riskerna med att använda utländska AI-modeller (t.ex. amerikanska eller kinesiska) i känslig verksamhet?',
    isOptional: true,
    options: [
      { text: 'Använd de bästa och billigaste globala modellerna; marknadens effektivitet är viktigare än protektionistisk oro.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Tillåt utländska modeller men kräv lokalt isolerade instanser (on-premise) för att hindra läckage av känsliga svenska data.', accVal: 4, protVal: 3.5, govVal: 4 },
      { text: 'Förbjud kinesiska och utomeuropeiska AI-modeller i all offentlig verksamhet för att skydda nationella säkerhetsintressen.', accVal: 1, protVal: 5, govVal: 3.5 },
      { text: 'Finansiera en nationell, skyddad svensk molnmodell ägd av staten för alla myndigheter och kommuner.', accVal: 2.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 38,
    dimensionId: 9,
    category: 'Säkerhet & Försvar',
    question: 'Bör staten ha rätt att tvinga privata ägare av kritisk infrastruktur (t.ex. elnät eller telekom) att installera statliga AI-brandväggar?',
    isOptional: true,
    options: [
      { text: 'Nej, det är ett allvarligt ingrepp i privat äganderätt; bolagen kan bäst själva skydda sina nätverk.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Ja, men endast i nära samverkan med bolagen och med full ekonomisk kompensation för implementationskostnader.', accVal: 4, protVal: 3, govVal: 3.5 },
      { text: 'Ja, det nationella säkerhetsintresset väger tyngre än enskilda bolags självbestämmanderätt i kristider.', accVal: 2.5, protVal: 5, govVal: 4.5 },
      { text: 'Ja, och staten bör ta över ägandet och driften av alla kritiska IT-system i Sverige för att säkra totalförsvaret.', accVal: 1.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 39,
    dimensionId: 9,
    category: 'Säkerhet & Försvar',
    question: 'Hur ställer du dig till militär användning av AI för underrättelseanalys och övervakning hos FRA?',
    isOptional: true,
    options: [
      { text: 'Mycket positivt; FRA måste ha de skarpaste verktygen för att upptäcka och avvärja yttre hot i realtid.', accVal: 5, protVal: 1, govVal: 3 },
      { text: 'Positivt, men endast under strikt parlamentarisk kontroll och med oberoende tillsyn över medborgarnas integritet.', accVal: 3.5, protVal: 3.5, govVal: 4 },
      { text: 'Negativt; automatiserad massövervakning hotar grundläggande friheter och riskerar att leda till missbruk.', accVal: 0.5, protVal: 5, govVal: 2 },
      { text: 'Tillåt detta uteslutande för att spåra statligt sponsrade cyberattacker och spionage, med full insyn för riksdagen.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 10: Språk, kultur, upphovsrätt och kunskapssuveränitet
  // ==========================================
  {
    id: 10,
    dimensionId: 10,
    category: 'Språk, kultur & Upphovsrätt',
    question: 'Hur bör vi reglera när kommersiella AI-modeller tränas på upphovsrättsligt skyddat svenskt kulturmaterial?',
    options: [
      { text: 'Utvecklingen av svenska språkmodeller (t.ex. GPT-SW3) måste gå först; upphovsrätt får inte hämma digital framgång.', accVal: 5, protVal: 1, govVal: 2 },
      { text: 'Skapa en kollektiv licensmodell (likt Copyswede) som ger författare och kulturskapare skälig ekonomisk ersättning.', accVal: 4, protVal: 3.5, govVal: 4 },
      { text: 'Strikta skadeståndskrav måste gälla; kommersiella techbolag ska hållas fullt ansvariga och explicit samtycke (opt-in) krävs.', accVal: 1, protVal: 5, govVal: 3 },
      { text: 'Staten bör finansiera och äga en nationell språkmodell tränad på upphovsrättsligt godkänt och säkrat svenskt material.', accVal: 3, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 40,
    dimensionId: 10,
    category: 'Språk, kultur & Upphovsrätt',
    question: 'Bör staten ge särskilda anslag till Kungliga Biblioteket för att digitalisera svenska arkiv specifikt för AI-träning?',
    isOptional: true,
    options: [
      { text: 'Nej, det är slöseri med skattemedel; marknadens aktörer kommer att digitalisera det som är kommersiellt lönsamt.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Ja, men låt tillgången till de digitaliserade arkiven samfinansieras av privata svenska techaktörer.', accVal: 4.5, protVal: 2, govVal: 3.5 },
      { text: 'Ja, men endast under förutsättning att materialet görs fritt tillgängligt som open source och inte monopoliseras av techjättar.', accVal: 2.5, protVal: 5, govVal: 4 },
      { text: 'Ja, staten bör äga och kontrollera digitaliseringen fullt ut för att bevara och skydda det svenska kulturarvet.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 41,
    dimensionId: 10,
    category: 'Språk, kultur & Upphovsrätt',
    question: 'Ska svenska läromedelsförfattare ha laglig rätt att förbjuda att deras digitala böcker används för att träna AI-läromedel?',
    isOptional: true,
    options: [
      { text: 'Nej, information som finns tillgänglig digitalt bör kunna analyseras fritt för att utveckla smartare utbildningsverktyg.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'De bör ha rätt att tacka nej (opt-out), men staten kan underlätta för licensavtal som gör det lönsamt att dela materialet.', accVal: 4, protVal: 3, govVal: 3 },
      { text: 'Ja, upphovsrätten är absolut; att träna kommersiella modeller på författares livsverk utan explicit samtycke är stöld.', accVal: 1, protVal: 5, govVal: 3 },
      { text: 'Ja, och staten bör förbjuda privata AI-läromedel i skolan och istället erbjuda statligt granskade och godkända läromedel.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 42,
    dimensionId: 10,
    category: 'Språk, kultur & Upphovsrätt',
    question: 'Bör vi införa en särskild "kultur- och teknikavgift" på utländska techjättar som säljer AI-tjänster i Sverige?',
    isOptional: true,
    options: [
      { text: 'Nej, det är protektionistiskt och riskerar att leda till handelskrig samt fördyra tjänster för svenska konsumenter.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Det bör utredas på EU-nivå för att skapa en gemensam skatt på digitala tjänster.', accVal: 4, protVal: 3, govVal: 3 },
      { text: 'Ja, medlen bör gå direkt till en fond som stöttar svensk journalistik och kulturskapande som hotas av AI-automatisering.', accVal: 1.5, protVal: 5, govVal: 4 },
      { text: 'Ja, staten bör beskatta techjättarnas intäkter i Sverige hårt för att finansiera den statliga välfärden och kulturen.', accVal: 2, protVal: 4.5, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 11: Innovation, företagande och kommersialisering
  // ==========================================
  {
    id: 11,
    dimensionId: 11,
    category: 'Innovation & Företagande',
    question: 'Vilken typ av statligt stöd bör ges till startups och näringslivets AI-användning?',
    options: [
      { text: 'Sänk bolagsskatterna och avreglera marknaden så att näringslivet självt kan investera efter egna behov.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Erbjud statliga innovationscheckar och kompetensutbildning via Tillväxtverket för att stimulera kontrollerat breddinförande.', accVal: 4.5, protVal: 2.5, govVal: 4 },
      { text: 'Ge ekonomiskt stöd endast till företag som uppfyller strikta krav på etisk AI, öppen källkod och kollektivavtal.', accVal: 2, protVal: 5, govVal: 3.5 },
      { text: 'Fokusera helt på statliga upphandlingsprogram där staten köper upp svenska AI-tjänster för att bygga inhemska spetsbolag.', accVal: 3, protVal: 3.5, govVal: 5 }
    ]
  },
  {
    id: 43,
    dimensionId: 11,
    category: 'Innovation & Företagande',
    question: 'Bör vi underlätta för forskare vid svenska universitet att kommersialisera sin AI-forskning genom egna bolag?',
    isOptional: true,
    options: [
      { text: 'Ja, det så kallade lärarundantaget (där forskare äger sina egna uppfinningar) bör stärkas och skatterna på startup-aktier sänkas.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Ja, staten bör finansiera universitetsanknutna inkubatorer som stöttar forskarna i affärsutvecklingen.', accVal: 4.5, protVal: 2.5, govVal: 3.5 },
      { text: 'Ja, men kraven på att forskningen kommersialiseras på ett etiskt och samhällsnyttigt sätt måste vara styrande.', accVal: 2.5, protVal: 5, govVal: 3 },
      { text: 'Nej, forskning finansierad av skattemedel ska ägas av staten/universiteten och användas för gemensam nytta, inte privat vinst.', accVal: 1.5, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 44,
    dimensionId: 11,
    category: 'Innovation & Företagande',
    question: 'Hur ställer du dig till att inrätta "innovationszoner" med lägre skatt och enklare regler för att locka utländska AI-startups till Sverige?',
    isOptional: true,
    options: [
      { text: 'Mycket positivt; det är ett effektivt sätt att locka spetskompetens och kapital till Sverige framför andra länder.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Positivt, men zonerna bör endast inrättas i områden med hög arbetslöshet för att skapa nya lokala jobb.', accVal: 4, protVal: 3, govVal: 3.5 },
      { text: 'Negativt; skatteundantag skapar osund konkurrens och riskerar att locka bolag som inte följer svenska arbetsmiljöregler.', accVal: 1.5, protVal: 5, govVal: 3.5 },
      { text: 'Nej, vi bör ha samma lagar och skatter i hela landet; staten ska stödja svenska bolag framför utländska startups.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 45,
    dimensionId: 11,
    category: 'Innovation & Företagande',
    question: 'Bör statliga riskkapitalbolag (t.ex. Almi Invest) få öronmärkta miljardbelopp för att investera specifikt i svenska AI-bolag?',
    isOptional: true,
    options: [
      { text: 'Nej, privat riskkapital är mycket mer effektivt på att hitta och stötta livskraftiga bolag; undvik statlig kapitalallokering.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Ja, staten kan erbjuda garantier och saminvestera tillsammans med privata affärsänglar för att dela riskerna.', accVal: 4.5, protVal: 2.5, govVal: 3.5 },
      { text: 'Endast om investeringarna är strikt styrda mot etisk AI, öppen källkod och miljömässigt hållbar teknik.', accVal: 2.5, protVal: 5, govVal: 4 },
      { text: 'Ja, staten bör spela en aktiv roll och genom ett stort statligt AI-investmentbolag bygga upp nationella spetsbolag.', accVal: 3, protVal: 3.5, govVal: 5 }
    ]
  },

  // ==========================================
  // DIMENSION 12: Miljö, energi och hållbarhet
  // ==========================================
  {
    id: 12,
    dimensionId: 12,
    category: 'Miljö & Hållbarhet',
    question: 'Hur bör staten ställa sig till techjättars etablering av energislukande AI-datacenter i Sverige?',
    options: [
      { text: 'Uppmuntra etableringar genom att sänka energiskatter och förenkla miljöprövningar för att locka utländskt kapital.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Stödja etableringarna men styra dem genom ekonomiska incitament för spillvärmeåtervinning och elnätsoptimering.', accVal: 4, protVal: 3.5, govVal: 3.5 },
      { text: 'Sätt stenhårda, tvingande klimatkrav och elprioriteringsregler för att skydda det svenska elnätet och våra klimatmål.', accVal: 1, protVal: 5, govVal: 3 },
      { text: 'Tillåt endast etableringar som är statligt godkända och som direkt bidrar med grön spetskapacitet till svensk industri.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 46,
    dimensionId: 12,
    category: 'Miljö & Hållbarhet',
    question: 'Bör staten ge skatterabatter på el för datacenter?',
    isOptional: true,
    options: [
      { text: 'Ja, låga elskatter är ett av Sveriges viktigaste konkurrensverktyg för att locka globala techinvesteringar.', accVal: 5, protVal: 0.5, govVal: 1 },
      { text: 'Bör fasas ut gradvis, men behållas för datacenter som direkt levererar spillvärme till det kommunala fjärrvärmenätet.', accVal: 4, protVal: 3, govVal: 3.5 },
      { text: 'Nej, det är orimligt att techjättar får skatterabatter på miljontals kilowattimmar samtidigt som hushållen betalar full skatt.', accVal: 1, protVal: 5, govVal: 3.5 },
      { text: 'Nej, och vi bör införa en extra miljöavgift på all el som används för beräkningskapacitet som inte är samhällskritisk.', accVal: 1.5, protVal: 4.5, govVal: 5 }
    ]
  },
  {
    id: 47,
    dimensionId: 12,
    category: 'Miljö & Hållbarhet',
    question: 'Bör staten prioritera elanslutningar för AI-datacenter före traditionell industri om elnätet är ansträngt?',
    isOptional: true,
    options: [
      { text: 'Ja, den digitala ekonomin är framtiden och en förutsättning för att Sverige ska behålla sin ledande position.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Elnätet bör fördelas enligt marknadsmässiga principer; den som är beredd att betala och har högst effektivitet bör få ansluta.', accVal: 4, protVal: 2.5, govVal: 2.5 },
      { text: 'Nej, traditionell basindustri och tillverkning som säkrar fysiska svenska jobb måste alltid ha förtur framför serverhallar.', accVal: 1, protVal: 5, govVal: 3.5 },
      { text: 'Nej, och regeringen bör genom Svenska kraftnät detaljstyra elnätet så att elen i första hand går till välfärd och grön omställning.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  },
  {
    id: 48,
    dimensionId: 12,
    category: 'Miljö & Hållbarhet',
    question: 'Bör staten satsa skattemedel på att utveckla AI-system som specifikt ska hjälpa skogsbruket eller jordbruket att nå klimatmålen?',
    isOptional: true,
    options: [
      { text: 'Nej, det är upp till de privata bolagen i skogs- och jordbrukssektorn att köpa de AI-verktyg de behöver på marknaden.', accVal: 5, protVal: 1, govVal: 1 },
      { text: 'Ja, genom att finansiera forskningsprojekt och innovationshubbar där universitet och industri samverkar.', accVal: 4.5, protVal: 2.5, govVal: 3.5 },
      { text: 'Ja, men endast under förutsättning att alla utvecklade modeller och insamlade miljödata släpps fria för alla som open source.', accVal: 2.5, protVal: 5, govVal: 4 },
      { text: 'Ja, och staten bör äga och drifta dessa miljö-AI-system för att säkerställa en strikt vetenskaplig planering av våra naturresurser.', accVal: 2, protVal: 4, govVal: 5 }
    ]
  }
];
