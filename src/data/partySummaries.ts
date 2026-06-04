import type { PartyAffiliation } from '../types';

export const partyDimensionSummaries: Record<number, Record<Exclude<PartyAffiliation, 'Externt'>, string>> = {
  1: {
    S: 'Vill att AI-utvecklingen samordnas genom offentliga organ för att säkra demokratisk kontroll och rättssäkerhet. Förespråkar en stark koppling mellan digitalisering och välfärd.',
    M: 'Leder regeringsarbetet under digitaliseringsministern. Vill underlätta för innovation genom regelförenklingar och partnerskap med näringslivet snarare än centralbyråkrati.',
    SD: 'Fokuserar det politiska ledarskapet på nationell säkerhet, cyberförsvar och kontroll av utländska AI-aktörers etablering.',
    C: 'Vill inrätta en nationell AI-kommission under statsministern för att samordna satsningar mellan stat, akademi och näringsliv.',
    V: 'Kräver stark demokratisk kontroll och medborgerlig insyn samt inrättandet av oberoende granskningsorgan med etiskt mandat.',
    MP: 'Driver linjen att staten måste styra AI med etiska skyddsräcken och öppna källkodskrav för att förhindra risker och monopolisering.',
    L: 'Vill se ett aktivt statligt ledarskap som driver på digitaliseringen och öppnar upp för testmiljöer i välfärden.',
    KD: 'Fokuserar på praktisk digitalisering och nationell samordning för att minska splittringen mellan regioner och kommuner.'
  },
  2: {
    S: 'Vill införa generösa omställningsstöd och skatteavdrag för anställdas AI-vidareutbildning. Kritisk till att automatiseringen ökar klyftorna.',
    M: 'Betonar AI som en avgörande tillväxtmotor. Vill sänka skatter för techinvesteringar och hålla arbetsmarknadsreglerna flexibla.',
    SD: 'Motsätter sig snabba strukturförändringar som hotar svenska jobb och vill utreda trygghetssystemens beredskap vid automatisering.',
    C: 'Vill stärka den ekonomiska konkurrenskraften genom miljardsatsningar på tillämpad AI-forskning och innovationsstöd till bolag.',
    V: 'Vill utreda en statlig AI-skatt på automatiserat kapital för att trygga välfärdens finansiering när jobb ersätts av algoritmer.',
    MP: 'Vill att ekonomiskt innovationsstöd villkoras med krav på kollektivavtal, klimathänsyn och etisk teknik.',
    L: 'Förespråkar skattelättnader för livslångt lärande inom tech och vill locka globala AI-talanger till Sverige.',
    KD: 'Vill införa riktade skatteavdrag för småföretag som investerar i AI-driven effektivisering.'
  },
  3: {
    S: 'Förespråkar delning av hälsodata under strikt statlig kontroll. Vill bygga en säker nationell molninfrastruktur.',
    M: 'Vill öppna upp offentliga data snabbt för att ge svenska företag en konkurrensfördel, i linje med EU-lagstiftning.',
    SD: 'Kräver att känsliga svenska myndighetsdata lagras på svensk mark under strikt kontroll, utan inblandning av utländska molnbolag.',
    C: 'Vill göra stora statliga investeringar i beräkningskapacitet och superdatorer (t.ex. Linköping) tillgängliga för småbolag.',
    V: 'Kräver att all offentlig IT bygger på öppen källkod för att garantera transparens och oberoende från globala techjättar.',
    MP: 'Vill finansiera öppen digital infrastruktur men med hårda miljö- och hållbarhetskrav på den beräkningskapacitet som byggs.',
    L: 'Vill främja regionala testbäddar där forskare och företag delar data under tillsyn av regulatoriska myndigheter.',
    KD: 'Fokuserar på att samordna hälsodata nationellt för att skapa en gemensam plattform för medicinsk AI-träning.'
  },
  4: {
    S: 'Vill ha en stark tillsynsstruktur (t.ex. under IMY) och kräver mänsklig överprövning vid helautomatiserade myndighetsbeslut.',
    M: 'Vill implementera EU:s AI Act med fokus på att inte strypa innovation. Förespråkar flexibla regulatoriska sandlådor.',
    SD: 'Stöder regleringar som motverkar risker men vill undvika att regelverken försvagar polisens möjligheter att använda ny teknik.',
    C: 'Förespråkar en balanserad reglering med tydliga riktlinjer för immaterialrätt och dataskydd som ger förutsägbarhet för bolag.',
    V: 'Kräver stenhård reglering mot automatiserade beslut i myndighetsutövning som kan leda till diskriminering.',
    MP: 'Driver linjen att statliga myndigheter endast får använda certifierade och helt öppna algoritmer som kan granskas offentligt.',
    L: 'Vill skapa innovationszoner där myndigheter kan testa AI-lösningar under tillsyn utan att hindras av oklara lagtolkningar.',
    KD: 'Vill införa tydliga lagkrav på spårbarhet och mänskligt ansvar för alla algoritmer som används i förvaltningen.'
  },
  5: {
    S: 'Vill integrera AI i välfärden för att avlasta personalen, men med strikta krav på patientsäkerhet och personlig kontakt.',
    M: 'Förespråkar att privata välfärdsleverantörer ska kunna tävla fritt om att ta fram effektiva AI-stöd för vård och omsorg.',
    SD: 'Vill använda AI för att rationalisera byråkrati i välfärden, men motsätter sig att digitala verktyg ersätter det mänskliga mötet.',
    C: 'Vill öronmärka medel för att stödja kommunernas upphandling av AI-verktyg för att utjämna skillnader i välfärd.',
    V: 'Vill stoppa privata vinstdrivande AI-lösningar i välfärden och istället bygga gemensamma, statligt ägda plattformar.',
    MP: 'Vill bromsa införandet av AI-system i skola och omsorg tills riskerna för digitalt utanförskap är helt utredda.',
    L: 'Vill se skolan och sjukvården som testbäddar för ny teknik, exempelvis genom AI-baserat lärstöd och tidig diagnostik.',
    KD: 'Driver på för AI-stöd inom cancerdiagnostik och vill centralisera journalsystemen för att ge alla regioner tillgång till AI-vård.'
  },
  6: {
    S: 'Vill lagstifta om algoritmiskt arbetarskydd för att hindra att plattformsbolag övervakar och stressar personal via AI.',
    M: 'Vill hålla arbetsmarknaden flexibel och tror på näringslivets förmåga att självt kompetensutveckla personalen.',
    SD: 'Vill anpassa yrkesutbildningar efter framtidens AI-behov för att förhindra att arbetslösa saknar relevant kompetens.',
    C: 'Vill reformera CSN och erbjuda livslångt lärande-checkar så att yrkesverksamma kan ställa om till AI-relaterade jobb.',
    V: 'Kräver facklig vetorätt mot personalstyrande algoritmer och vill begränsa arbetsgivares rätt att övervaka anställda.',
    MP: 'Vill integrera grundläggande digital källkritik och förståelse för generativ AI i skolans läroplaner.',
    L: 'Förespråkar en "hem-chatt-reform" med skatteavdrag för anställda som går AI-utbildningar på fritiden.',
    KD: 'Vill ge stöd till yrkeshögskolor för att ta fram korta, flexibla kurser i praktisk AI-användning för företag.'
  },
  7: {
    S: 'Vill inrätta en statlig diskrimineringsombudsman för algoritmer som granskar bias i offentliga beslutssystem.',
    M: 'Anser att etisk AI bäst säkras genom att företagen själva tar ansvar inom ramen för EU:s lagstiftning.',
    SD: 'Stöder polisanvändning av ansiktsigenkänning och anser att brottsbekämpning måste prioriteras framför strikt etisk oro.',
    C: 'Vill kräva att högrisksystem genomgår oberoende etiska revisioner innan de får lanseras på marknaden.',
    V: 'Kräver ett absolut förbud mot biometrisk realtidsövervakning hos polisen för att skydda de mänskliga rättigheterna.',
    MP: 'Vill att alla offentligt finansierade AI-system ska genomgå en obligatorisk konsekvensanalys gällande mänskliga rättigheter.',
    L: 'Vill ha strikt domstolsprövning vid polisens användning av ansiktsigenkänning för att säkra rättssäkerheten.',
    KD: 'Betonar den personliga integriteten men anser att begränsad ansiktsigenkänning behövs för att bekämpa gängkriminaliteten.'
  },
  8: {
    S: 'Vill ge Myndigheten för psykologiskt försvar (MPF) ökat mandat att spåra och flagga AI-genererad utländsk propaganda.',
    M: 'Vill att mediebolag och techjättar själva utvecklar metoder för att verifiera innehåll; vill undvika statlig censur.',
    SD: 'Kräver skarpa åtgärder mot utländsk valpåverkan men är kritisk till att statliga myndigheter ges mandat att definiera "sanning".',
    C: 'Förespråkar tvingande regler om att allt AI-genererat politiskt material på nätet måste ha en digital vattenstämpel.',
    V: 'Vill hålla globala techplattformar juridiskt ansvariga om deras algoritmer sprider AI-genererad desinformation i Sverige.',
    MP: 'Vill ge ekonomiskt stöd till oberoende medier för att utveckla verktyg som granskar och avslöjar AI-genererat fusk.',
    L: 'Vill stärka medborgarnas digitala källkritik genom folkbildning och informationskampanjer om deepfakes.',
    KD: 'Stöder reglering mot deepfakes som hotar den personliga integriteten eller sprider förtal.'
  },
  9: {
    S: 'Vill utveckla svenskt cyberförsvar i nära samarbete med statliga myndigheter och NATO. Kritisk till utländskt molnberoende.',
    M: 'Vill satsa på att integrera AI i det militära försvaret och öka samarbetet med svenska försvarsinnovatörer (t.ex. Saab).',
    SD: 'Vill ge utökade befogenheter och resurser till Säpo för att möta utländskt spionage och cyberhot riktade mot Sverige.',
    C: 'Förespråkar en restriktiv linje mot utländska (särskilt kinesiska) modeller i känslig svensk infrastruktur.',
    V: 'Motsätter sig utveckling av helt autonoma vapensystem och kräver ett globalt avtal om mänsklig kontroll över militär AI.',
    MP: 'Vill att försvarets AI-utveckling sker under strikt insyn och att Sverige driver på för internationella förbud mot dödliga autonoma vapen.',
    L: 'Vill att Sverige utvecklar defensiv AI-kapacitet tillsammans med NATO-allierade för att skydda kritisk infrastruktur.',
    KD: 'Vill att FOI (Totalförsvarets forskningsinstitut) leder utvecklingen av säkra, nationella cyberförsvarssystem.'
  },
  10: {
    S: 'Vill skydda det svenska språket och stöder utvecklingen av en nationell språkmodell, men med respekt för upphovsrätten.',
    M: 'Anser att kommersiella språkteknologiska framsteg inte får blockeras av alltför restriktiva upphovsrättstolkningar.',
    SD: 'Betonar skyddet av det svenska språket och kulturarvet genom att utveckla nationellt kontrollerade språkmodeller.',
    C: 'Föreslår en kollektiv licensmodell (likt Copyswede) för att ge svenska författare betalt när deras verk används för AI-träning.',
    V: 'Kräver starkt skydd för kulturskapare; techbolag måste ha explicit samtycke (opt-in) för att få träna modeller på svensk kultur.',
    MP: 'Vill ge Kungliga Biblioteket anslag att digitalisera arkiv för AI-träning under förutsättning att modellerna blir open source.',
    L: 'Vill säkra svensk kunskapssuveränitet genom att stödja akademisk forskning kring svenska språkmodeller.',
    KD: 'Stöder ersättningsmodeller till författare och läromedelsproducenter som drabbas av AI-kopiering.'
  },
  11: {
    S: 'Vill erbjuda statliga innovationscheckar, men kräver att företag som får stöd följer svenska spelregler och kollektivavtal.',
    M: 'Vill radikalt förenkla regler och sänka bolagsskatter för att göra Sverige till Europas mest attraktiva land för AI-startups.',
    SD: 'Vill prioritera innovationsstöd till bolag vars AI-tjänster kan stärka svensk industri och välfärd, framför globala plattformar.',
    C: 'Vill satsa statligt riskkapital i tidiga skeden och underlätta för universitetsforskare att starta kommersiella AI-bolag.',
    V: 'Kritisk till att statliga medier eller riskkapital går till privata techbolag utan garantier om samhällsnytta och insyn.',
    MP: 'Vill öronmärka innovationsstöd till startups som utvecklar grön AI och öppna lösningar för klimatomställningen.',
    L: 'Vill reformera lärarundantaget och underlätta för forskare att kommersialisera spetsforskning från akademin.',
    KD: 'Vill främja regionala tillväxtzoner med lägre skatt för att stimulera AI-entreprenörskap utanför storstäderna.'
  },
  12: {
    S: 'Vill underlätta datacenteretablering men med krav på att de ansluts till fjärrvärmenätet för att återvinna spillvärme.',
    M: 'Uppmuntra etableringar av datacenter genom låga elskatter för att säkra utländska techinvesteringar till Sverige.',
    SD: 'Anser att elförsörjningen till svenska hushåll och kärnindustri måste gå före energislukande utländska datacenter.',
    C: 'Vill styra datacenter genom ekonomiska incitament för att avlasta elnätet och placera dem där elöverskott finns.',
    V: 'Motsätter sig skatterabatter på el till utländska serverhallar och kräver att elen sparas till klimatomställningen.',
    MP: 'Kräver stenhårda tvingande miljökrav, spillvärmeåtervinning och elprioritering för att skydda elnätet och klimatmålen.',
    L: 'Stöder etableringarna men vill bygga ut kärnkraften för att säkra ren el till både datacenter och svensk industri.',
    KD: 'Vill kombinera datacenter med grön industriutveckling och främja AI för att optimera det svenska elnätet.'
  }
};
