import React, { useState, useEffect } from 'react';
import { 
  Compass, ChevronRight, RotateCcw, User, Edit, ArrowRight
} from 'lucide-react';
import type { ClaimCard, UserStance, PartyAffiliation } from '../types';
import { aggregatePartyProfiles } from '../utils/scoring';
import { PartyLogo } from '../utils/partyAssets';
import { partyColorMap, partyNames } from '../utils/partyConstants';

interface AiCompassProps {
  userStance: UserStance | null;
  onUpdateStance: (stance: UserStance | null) => void;
  claims: ClaimCard[];
  onNavigate: (tab: string) => void;
}

interface Option {
  text: string;
  accVal: number;
  protVal: number;
  govVal: number;
}

interface Question {
  id: number;
  category: string;
  question: string;
  options: Option[];
  isOptional?: boolean;
}

const quizQuestions: Question[] = [
  // HUVUDOMRÅDE 1: Styrning & Reglering (Dim 1 & 4)
  {
    id: 1,
    category: 'Reglering & Tillsyn',
    question: 'Hur bör Sverige förhålla sig till reglering av AI-system under EU:s nya AI Act?',
    options: [
      {
        text: 'Minimera byråkratiskt krångel, underlätta snabb marknadsomställning och undvika tillsynshinder för företag.',
        accVal: 5, protVal: 1, govVal: 1
      },
      {
        text: 'Främja snabb innovation med säkra regulatoriska sandlådor och proaktiv vägledning från tillsynsmyndigheter.',
        accVal: 4.5, protVal: 3.5, govVal: 3
      },
      {
        text: 'Etablera en stenhård och oberoende tillsynsstruktur under IMY för att skydda grundläggande rättigheter och minimera risker.',
        accVal: 1, protVal: 5, govVal: 3
      },
      {
        text: 'Skapa en central statlig AI-myndighet med mandat att förhandsgodkänna alla offentliga AI-system innan de tas i bruk.',
        accVal: 2, protVal: 4.5, govVal: 5
      }
    ]
  },
  {
    id: 7,
    category: 'Algoritmiskt Beslutsfattande',
    question: 'Hur bör Sverige förhålla sig till helautomatiserade beslut (algoritmer) i myndighetsutövning?',
    isOptional: true,
    options: [
      {
        text: 'Automatisera maximalt för att radikalt korta handläggningstider och minska offentliga kostnader.',
        accVal: 5, protVal: 1.5, govVal: 2
      },
      {
        text: 'Automatisera i hög takt men kräv fullständig algoritmisk spårbarhet och mänsklig överklaganderätt.',
        accVal: 4, protVal: 3.5, govVal: 3.5
      },
      {
        text: 'Stoppa all helautomatisk handläggning i känsliga ärenden (t.ex. socialtjänst) för att förhindra diskriminering.',
        accVal: 1, protVal: 5, govVal: 3
      },
      {
        text: 'Tillåt endast statligt certifierade och helt öppna algoritmer som kontrolleras löpande av en statlig granskningsnämnd.',
        accVal: 2, protVal: 4, govVal: 5
      }
    ]
  },
  {
    id: 8,
    category: 'Politiskt Ledarskap',
    question: 'Hur bör det nationella politiska ledarskapet för AI-omställningen organiseras i Sverige?',
    isOptional: true,
    options: [
      {
        text: 'Låt enskilda sektorer och marknadskrafterna driva på digitaliseringen; undvik centralbyråkrati eller nya statliga organ.',
        accVal: 4.5, protVal: 1, govVal: 1
      },
      {
        text: 'Inrätta en nationell AI-kommission under statsministern för att underlätta strategiskt samarbete mellan näringsliv och stat.',
        accVal: 4.5, protVal: 3, govVal: 3.5
      },
      {
        text: 'Skapa en oberoende etisk AI-inspektion bestående av forskare och medborgare med rätt att stoppa riskabla statliga projekt.',
        accVal: 1, protVal: 5, govVal: 4
      },
      {
        text: 'Inrätta ett dedikerat AI- och digitaliseringsdepartement med skarpt mandat att detaljstyra hela den offentliga sektorns omställning.',
        accVal: 2.5, protVal: 4, govVal: 5
      }
    ]
  },

  // HUVUDOMRÅDE 2: Infrastruktur & Innovation (Dim 3 & 11)
  {
    id: 2,
    category: 'Statliga Investeringar',
    question: 'Vilket finansiellt ansvar har staten för att bygga AI-infrastruktur och beräkningskapacitet?',
    options: [
      {
        text: 'Det är marknadens roll; staten bör endast sänka skatter för techinvesteringar och erbjuda enklare skattelättnader.',
        accVal: 5, protVal: 0.5, govVal: 1
      },
      {
        text: 'Staten bör samfinansiera superdatorer (t.ex. Linköping) i nära samarbete med näringsliv och akademi.',
        accVal: 4.5, protVal: 2.5, govVal: 3.5
      },
      {
        text: 'Staten kan bidra med finansiering, men endast om infrastrukturen bygger helt på öppen källkod och hållbara energilösningar.',
        accVal: 2.5, protVal: 5, govVal: 4
      },
      {
        text: 'Staten bör bygga, äga och drifta en helstatlig, säker molninfrastruktur för att skydda känsliga svenska myndighetsdata.',
        accVal: 2, protVal: 4.5, govVal: 5
      }
    ]
  },
  {
    id: 9,
    category: 'Datadelning & Register',
    question: 'Hur bör Sverige hantera delning av offentliga data (t.ex. hälsodata) för träning av AI-modeller?',
    isOptional: true,
    options: [
      {
        text: 'Öppna upp och dela all tillgänglig offentlig data fritt och snabbt för att ge svenska företag en konkurrensfördel.',
        accVal: 5, protVal: 1, govVal: 2
      },
      {
        text: 'Dela anonymiserad hälsodata under säkra former genom statligt kontrollerade forskningsplattformar.',
        accVal: 4, protVal: 3.5, govVal: 4
      },
      {
        text: 'Förbjud all delning av patient- och medborgardata för AI-träning för att garantera absolut integritet och sekretess.',
        accVal: 0.5, protVal: 5, govVal: 2.5
      },
      {
        text: 'Tillåt datadelning och träning uteslutande för statliga välfärdsprojekt, med strikt statligt ägda och isolerade servrar.',
        accVal: 2, protVal: 4, govVal: 5
      }
    ]
  },
  {
    id: 10,
    category: 'Företagsstimulanser',
    question: 'Vilken typ av statligt stöd bör ges till startups och näringslivets AI-användning?',
    isOptional: true,
    options: [
      {
        text: 'Sänk bolagsskatterna och avreglera marknaden så att näringslivet självt kan investera efter egna behov.',
        accVal: 5, protVal: 0.5, govVal: 1
      },
      {
        text: 'Erbjud statliga innovationscheckar och kompetensutbildning via Tillväxtverket för att stimulera kontrollerat breddinförande.',
        accVal: 4.5, protVal: 2.5, govVal: 4
      },
      {
        text: 'Ge ekonomiskt stöd endast till företag som uppfyller strikta krav på etisk AI, öppen källkod och kollektivavtal.',
        accVal: 2, protVal: 5, govVal: 3.5
      },
      {
        text: 'Fokusera helt på statliga upphandlingsprogram där staten köper upp svenska AI-tjänster för att bygga inhemska spetsbolag.',
        accVal: 3, protVal: 3.5, govVal: 5
      }
    ]
  },

  // HUVUDOMRÅDE 3: Samhälle & Arbetsmarknad (Dim 2 & 6)
  {
    id: 3,
    category: 'Automatisering & Kompetens',
    question: 'Hur bör samhället möta risken för att mänskliga jobb automatiseras eller förändras av AI?',
    options: [
      {
        text: 'Marknaden anpassar sig bäst själv; statliga omställningsprogram eller bidrag hämmar bara den naturliga rörligheten.',
        accVal: 5, protVal: 1, govVal: 1
      },
      {
        text: 'Inför generösa skatteavdrag för företagsutbildningar och statligt stödda vidareutbildningar i AI för anställda.',
        accVal: 4.5, protVal: 3.5, govVal: 3.5
      },
      {
        text: 'Utred en särskild AI-skatt på företag som ersätter mänsklig arbetskraft med maskiner, för att trygga välfärdens skattebas.',
        accVal: 0.5, protVal: 5, govVal: 4.5
      },
      {
        text: 'Genomför en nationell statlig omställningsplan tillsammans med fackförbunden med garanterad omskolning för alla drabbade.',
        accVal: 2.5, protVal: 4.5, govVal: 5
      }
    ]
  },
  {
    id: 11,
    category: 'Algoritmiskt Arbetarskydd',
    question: 'Hur bör vi skydda anställda (t.ex. plattformsarbetare) som leds och styrs av AI-algoritmer?',
    isOptional: true,
    options: [
      {
        text: 'Låt parterna avtala fritt; för mycket detaljreglering riskerar att strypa innovativa affärsmodeller (t.ex. gig-ekonomin).',
        accVal: 5, protVal: 1, govVal: 1
      },
      {
        text: 'Lagstifta om transparenskrav som tvingar bolag att redovisa hur deras algoritmer fördelar jobb och sätter löner.',
        accVal: 4, protVal: 3.5, govVal: 3
      },
      {
        text: 'Förbjud helt alla former av automatiserad prestationsstyrning via algoritmer som ökar stress eller hotar anställdas hälsa.',
        accVal: 1, protVal: 5, govVal: 3
      },
      {
        text: 'Låt Arbetsmiljöverket granska och certifiera alla personalstyrande och schemaläggande algoritmer i Sverige.',
        accVal: 2, protVal: 4.5, govVal: 5
      }
    ]
  },
  {
    id: 12,
    category: 'Miljö & Datacenter',
    question: 'Hur bör staten ställa sig till techjättars etablering av energislukande AI-datacenter i Sverige?',
    isOptional: true,
    options: [
      {
        text: 'Uppmuntra etableringar genom att sänka energiskatter och förenkla miljöprövningar för att locka utländskt kapital.',
        accVal: 5, protVal: 0.5, govVal: 1
      },
      {
        text: 'Stödja etableringarna men styra dem genom ekonomiska incitament för spillvärmeåtervinning och elnätsoptimering.',
        accVal: 4, protVal: 3.5, govVal: 3.5
      },
      {
        text: 'Sätt stenhårda, tvingande klimatkrav och elprioriteringsregler för att skydda det svenska elnätet och våra klimatmål.',
        accVal: 1, protVal: 5, govVal: 3
      },
      {
        text: 'Tillåt endast etableringar som är statligt godkända och som direkt bidrar med grön spetskapacitet till svensk industri.',
        accVal: 2, protVal: 4, govVal: 5
      }
    ]
  },

  // HUVUDOMRÅDE 4: Integritet, Etik & Kultur (Dim 7 & 10)
  {
    id: 4,
    category: 'Biometrisk Övervakning',
    question: 'Bör polisen få använda AI-baserad ansiktsigenkänning i realtid på allmänna platser?',
    options: [
      {
        text: 'Ja, tekniken måste användas offensivt utan onödiga juridiska hinder för att effektivt bekämpa grov brottslighet.',
        accVal: 4.5, protVal: 1, govVal: 4.5
      },
      {
        text: 'Ja, med strikt domstolsprövning och full loggning av användningen för att skydda mot missbruk.',
        accVal: 3, protVal: 3.5, govVal: 4
      },
      {
        text: 'Nej, biometrisk realtidsövervakning hotar den personliga integriteten i grunden och bör förbjudas helt i offentliga miljöer.',
        accVal: 0.5, protVal: 5, govVal: 2.5
      },
      {
        text: 'Tillåt tekniken men låt användningen kontrolleras och granskas i realtid av en oberoende statlig integritetsombudsperson.',
        accVal: 2, protVal: 4, govVal: 5
      }
    ]
  },
  {
    id: 13,
    category: 'Upphovsrätt & AI-träning',
    question: 'Hur bör vi reglera när kommersiella AI-modeller tränas på upphovsrättsligt skyddat svenskt kulturmaterial?',
    isOptional: true,
    options: [
      {
        text: 'Utvecklingen av svenska språkmodeller (t.ex. GPT-SW3) måste gå först; upphovsrätt får inte hämma digital framgång.',
        accVal: 5, protVal: 1, govVal: 2
      },
      {
        text: 'Skapa en kollektiv licensmodell (likt Copyswede) som ger författare och kulturskapare skälig ekonomisk ersättning.',
        accVal: 4, protVal: 3.5, govVal: 4
      },
      {
        text: 'Strikta skadeståndskrav måste gälla; kommersiella techbolag ska hållas fullt ansvariga och explicit samtycke (opt-in) krävs.',
        accVal: 1, protVal: 5, govVal: 3
      },
      {
        text: 'Staten bör finansiera och äga en nationell språkmodell tränad på upphovsrättsligt godkänt och säkrat svenskt material.',
        accVal: 3, protVal: 4, govVal: 5
      }
    ]
  },
  {
    id: 14,
    category: 'Diskriminering & Bias',
    question: 'Hur bör vi bäst motverka fördomar, diskriminering och algoritmisk bias i AI-beslutssystem?',
    isOptional: true,
    options: [
      {
        text: 'Låt marknadskrafterna lösa det; företag som bygger partiska eller diskriminerande system förlorar kunder naturligt.',
        accVal: 4.5, protVal: 1, govVal: 1
      },
      {
        text: 'Kräv att alla företag som utvecklar eller använder högrisksystem genomför oberoende etiska konsekvensanalyser.',
        accVal: 4, protVal: 4, govVal: 3.5
      },
      {
        text: 'Lagstifta om direkt skadeståndsrätt för individer som diskriminerats av en algoritm, med omvänd bevisbörda för techbolaget.',
        accVal: 1, protVal: 5, govVal: 3
      },
      {
        text: 'Inrätta en statlig diskrimineringsombudsmannafunktion för AI med befogenhet att granska och provköra alla algoritmer.',
        accVal: 2, protVal: 4.5, govVal: 5
      }
    ]
  },

  // HUVUDOMRÅDE 5: Skola, Vård & Välfärd (Dim 5)
  {
    id: 5,
    category: 'AI i Välfärden',
    question: 'Hur bör vi bäst integrera AI i den kommunala och statliga välfärden?',
    options: [
      {
        text: 'Låt privata leverantörer konkurrera fritt om att leverera AI-tjänster till välfärden för att snabbt höja effektiviteten.',
        accVal: 5, protVal: 1, govVal: 1.5
      },
      {
        text: 'Fasa in AI gradvis under vägledning av nationella sekretessriktlinjer och certifierade och granskade leverantörer.',
        accVal: 4, protVal: 3.5, govVal: 4
      },
      {
        text: 'Bromsa införandet tills vi kan garantera 100% patientsäkerhet, sekretess och förhindra digitalt utanförskap.',
        accVal: 1, protVal: 5, govVal: 3.5
      },
      {
        text: 'Bygg gemensamma, statliga välfärdsalgoritmer under ledning av Digg för att garantera demokratisk insyn och kontroll.',
        accVal: 2.5, protVal: 4, govVal: 5
      }
    ]
  },
  {
    id: 15,
    category: 'Skola & ChatGPT',
    question: 'Hur ska skolan förhålla sig till elevers användning av generativ AI (t.ex. ChatGPT) i skolarbetet?',
    isOptional: true,
    options: [
      {
        text: 'Bejaka och integrera verktygen fullt ut; skolan ska spegla arbetslivets digitala verklighet utan restriktioner.',
        accVal: 5, protVal: 1, govVal: 1
      },
      {
        text: 'Tillåta AI-användning men utbilda eleverna i källkritik, etisk användning och förståelse för hur modeller fungerar.',
        accVal: 4, protVal: 3.5, govVal: 3.5
      },
      {
        text: 'Begränsa AI-användning hårt under lektionstid; återgå till analoga salsskrivningar på papper och penna för att säkra eget tänkande.',
        accVal: 0.5, protVal: 5, govVal: 3
      },
      {
        text: 'Låt Skolverket utveckla en statligt ägd skol-AI som är helt fri från reklam och spårning för att garantera en trygg skolmiljö.',
        accVal: 2.5, protVal: 4, govVal: 5
      }
    ]
  },
  {
    id: 16,
    category: 'Sjukvård & Diagnostik',
    question: 'Hur bör vi hantera införandet av AI-stöd för cancerdiagnostik och journalanalys i sjukvården?',
    isOptional: true,
    options: [
      {
        text: 'Snabba på alla godkännanden och implementeringar maximalt; AI kan rädda liv snabbare än traditionell byråkrati tillåter.',
        accVal: 5, protVal: 1, govVal: 2
      },
      {
        text: 'Fasa in AI som kliniskt beslutsstöd för läkare, men behåll alltid det slutgiltiga ansvaret hos legitimerad vårdpersonal.',
        accVal: 4, protVal: 3.5, govVal: 4
      },
      {
        text: 'Kräv rigorösa kliniska långtidsstudier och bias-tester av algoritmerna innan något diagnostiskt AI-verktyg godkänns för drift.',
        accVal: 1, protVal: 5, govVal: 3.5
      },
      {
        text: 'Skapa en nationell diagnostikplattform ägd av Socialstyrelsen för att säkerställa att alla regioner har lika tillgång till AI-vård.',
        accVal: 2.5, protVal: 4, govVal: 5
      }
    ]
  },

  // HUVUDOMRÅDE 6: Säkerhet, Demokrati & Miljö (Dim 8, 9 & 12)
  {
    id: 6,
    category: 'Demokrati & Trollkonton',
    question: 'Hur bör Sverige hantera risken för utländsk valpåverkan via AI-genererade deepfakes och trollkonton?',
    options: [
      {
        text: 'Uppmuntra techjättarna och mediebolagen att själva utveckla verifieringsmetoder; undvik statlig kontroll och censur.',
        accVal: 4.5, protVal: 1.5, govVal: 1.5
      },
      {
        text: 'Lagstifta om tvingande vattenmärkning av AI-innehåll och ge Myndigheten för psykologiskt försvar (MPF) ökat mandat att flagga falskt innehåll.',
        accVal: 3, protVal: 4, govVal: 4.5
      },
      {
        text: 'Kriminalisera spridning av olicensierat AI-genererat material som kan påverka opinionen, samt belägga plattformar med dryga böter.',
        accVal: 0.5, protVal: 5, govVal: 3.5
      },
      {
        text: 'Etablera ett nationellt statligt granskningsråd för digitala medier med befogenhet att blockera och rensa misstänkta påverkanskampanjer.',
        accVal: 2, protVal: 4, govVal: 5
      }
    ]
  },
  {
    id: 17,
    category: 'Cybersäkerhet & Försvar',
    question: 'Hur bör det svenska försvaret (Försvarsmakten) och FRA ställa sig till autonoma AI-vapensystem?',
    isOptional: true,
    options: [
      {
        text: 'Satsa offensivt på att utveckla och integrera AI-kapabiliteter i vårt totalförsvar för att säkra geopolitisk överlevnad.',
        accVal: 5, protVal: 1, govVal: 2
      },
      {
        text: 'Utveckla defensiv militär AI i nära samarbete med NATO och svenska försvarsföretag under full mänsklig kontroll.',
        accVal: 4.5, protVal: 3, govVal: 4
      },
      {
        text: 'Vägra all militär AI utan ett globalt tvingande avtal mot autonoma vapen; behåll strikt analog mänsklig kontroll över vapensystem.',
        accVal: 1, protVal: 5, govVal: 3
      },
      {
        text: 'Utveckla helstatliga, nationella och krypterade försvarssystem via FOI för att garantera fullständigt oberoende.',
        accVal: 2.5, protVal: 4, govVal: 5
      }
    ]
  },
  {
    id: 18,
    category: 'Geopolitiska Cyberrisker',
    question: 'Hur bör Sverige hantera riskerna med att använda utländska AI-modeller (t.ex. amerikanska eller kinesiska) i känslig verksamhet?',
    isOptional: true,
    options: [
      {
        text: 'Använd de bästa och billigaste globala modellerna; marknadens effektivitet och tillväxt är viktigare än protektionistisk oro.',
        accVal: 5, protVal: 0.5, govVal: 1
      },
      {
        text: 'Tillåt utländska modeller men kräv lokalt isolerade instanser (on-premise) för att hindra läckage av känsliga svenska data.',
        accVal: 4, protVal: 3.5, govVal: 4
      },
      {
        text: 'Förbjud kinesiska och utomeuropeiska AI-modeller i all offentlig verksamhet för att skydda nationella säkerhetsintressen.',
        accVal: 1, protVal: 5, govVal: 3.5
      },
      {
        text: 'Finansiera en nationell, skyddad svensk molnmodell ägd av staten för alla myndigheter och kommuner.',
        accVal: 2.5, protVal: 4, govVal: 5
      }
    ]
  }
];

// Removed local duplicate dictionaries for partyColorMap and partyNames

export const AiCompass: React.FC<AiCompassProps> = ({ 
  userStance, 
  onUpdateStance, 
  claims, 
  onNavigate 
}) => {
  const [inQuiz, setInQuiz] = useState<boolean>(false);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizWeights, setQuizWeights] = useState<Record<number, number>>({});
  const [activeOptionalQId, setActiveOptionalQId] = useState<number | null>(null);
  const [activeWeight, setActiveWeight] = useState<number>(1.0);
  const [showWeightWarning, setShowWeightWarning] = useState<number | null>(null);

  // Automatic schema version check and migration
  useEffect(() => {
    if (userStance && userStance.schemaVersion !== 'v3.4') {
      onUpdateStance(null); // Safely clear outdated local storage quiz stance
    }
  }, [userStance, onUpdateStance]);

  // Helper to dynamically recalculate stances based on all answered questions and weights
  const recalculateStance = (currAnswers: Record<number, number>, currWeights: Record<number, number> = {}) => {
    let accelSum = 0;
    let protSum = 0;
    let govSum = 0;
    let weightTotal = 0;

    quizQuestions.forEach((q) => {
      if (currAnswers[q.id] !== undefined) {
        const optIdx = currAnswers[q.id];
        const opt = q.options[optIdx];
        const w = currWeights[q.id] !== undefined ? currWeights[q.id] : 1.0;
        
        accelSum += opt.accVal * w;
        protSum += opt.protVal * w;
        govSum += opt.govVal * w;
        weightTotal += w;
      }
    });

    if (weightTotal === 0) return { accelerationScore: 0, protectionScore: 0, governanceScore: 0 };

    return {
      accelerationScore: Math.round((accelSum / weightTotal) * 100) / 100,
      protectionScore: Math.round((protSum / weightTotal) * 100) / 100,
      governanceScore: Math.round((govSum / weightTotal) * 100) / 100
    };
  };

  const handleStart = () => {
    setAnswers([]);
    setQuizWeights({});
    setCurrentIdx(0);
    setInQuiz(true);
    setActiveOptionalQId(null);
    setActiveWeight(1.0);
    setShowWeightWarning(null);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    const nextAnswers = [...answers, optionIndex];
    setAnswers(nextAnswers);

    // Save weight for current question into component state
    const currentQId = quizQuestions[currentIdx].id;
    const updatedWeights = {
      ...quizWeights,
      [currentQId]: activeWeight
    };
    setQuizWeights(updatedWeights);

    // Reset weight for next question
    setActiveWeight(1.0);
    setShowWeightWarning(null);

    const baseQuestionsCount = 6; // Questions 1 to 6 (IDs 1-6)
    if (currentIdx < baseQuestionsCount - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Base quiz finished! Build initial answers map (questions 1 to 6)
      const initialAnswersMap: Record<number, number> = {};
      nextAnswers.forEach((optIdx, idx) => {
        const qId = quizQuestions[idx].id;
        initialAnswersMap[qId] = optIdx;
      });

      const baseScores = recalculateStance(initialAnswersMap, updatedWeights);

      onUpdateStance({
        ...baseScores,
        answers: initialAnswersMap,
        completedOptionalIds: [],
        weights: updatedWeights,
        schemaVersion: 'v3.4'
      });
      setInQuiz(false);
    }
  };

  const handleOptionalAnswerSelect = (qId: number, optionIndex: number) => {
    const currentAnswers = userStance?.answers || {};
    const updatedAnswers = {
      ...currentAnswers,
      [qId]: optionIndex
    };

    const currentWeights = userStance?.weights || {};
    const updatedWeights = {
      ...currentWeights,
      [qId]: activeWeight
    };

    setActiveWeight(1.0);
    setShowWeightWarning(null);

    const updatedOptionalIds = Array.from(
      new Set([...(userStance?.completedOptionalIds || []), qId])
    );

    const updatedScores = recalculateStance(updatedAnswers, updatedWeights);

    onUpdateStance({
      ...updatedScores,
      answers: updatedAnswers,
      completedOptionalIds: updatedOptionalIds,
      weights: updatedWeights,
      schemaVersion: 'v3.4'
    });
    setActiveOptionalQId(null);
  };

  const handleToggleWeight = (qId: number) => {
    if (!userStance) return;
    
    const currentWeights = userStance.weights || {};
    const oldWeight = currentWeights[qId] !== undefined ? currentWeights[qId] : 1.0;
    const newWeight = oldWeight === 2.5 ? 1.0 : 2.5;

    // Hard limit verification: max 3 active hearts
    if (newWeight === 2.5) {
      const activeHearts = Object.values(currentWeights).filter(w => w === 2.5).length;
      if (activeHearts >= 3) {
        setShowWeightWarning(qId);
        return;
      }
    }

    setShowWeightWarning(null);

    const updatedWeights = {
      ...currentWeights,
      [qId]: newWeight
    };

    const currentAnswers = userStance.answers || {};
    const updatedScores = recalculateStance(currentAnswers, updatedWeights);

    onUpdateStance({
      ...userStance,
      ...updatedScores,
      weights: updatedWeights,
      schemaVersion: 'v3.4'
    });
  };

  const handleReset = () => {
    onUpdateStance(null);
    setAnswers([]);
    setQuizWeights({});
    setCurrentIdx(0);
    setInQuiz(false);
    setActiveOptionalQId(null);
    setActiveWeight(1.0);
    setShowWeightWarning(null);
  };

  // Profile classification helper
  const getUserProfileName = (stance: UserStance) => {
    const acc = stance.accelerationScore;
    const prot = stance.protectionScore;
    const gov = stance.governanceScore;

    // Check if the differences are very small
    const max = Math.max(acc, prot, gov);
    const min = Math.min(acc, prot, gov);
    if (max - min <= 0.8) {
      return {
        title: 'Balanserad Teknikpragmatiker',
        description: 'Du söker en medelväg där du bejakar AI:s ekonomiska fördelar men stöder förnuftig tillsyn och kontrollerade statliga ramverk för att undvika samhällsrisker.'
      };
    }

    if (acc >= prot && acc >= gov) {
      return {
        title: 'Teknikoptimistisk Acceleratör',
        description: 'Du sätter innovationskraft, ekonomisk konkurrenskraft och avreglering i första rummet. Du anser att AI bäst drivs på av marknaden med minimala byråkratiska hinder.'
      };
    } else if (prot >= acc && prot >= gov) {
      return {
        title: 'Rättssäker Skyddsivrare',
        description: 'Ditt fokus ligger starkt på personlig integritet, mänskliga rättigheter, AI-etik och kraftfull oberoende granskning. Du vill reglera risker hårt för att värna individen.'
      };
    } else {
      return {
        title: 'Statssocial Välfärdsreglerare',
        description: 'Du förespråkar starkt statligt ledarskap, gemensam digital välfärd och offentlig samordning. Du vill att samhället leds gemensamt mot AI-utveckling med brett skydd för löntagare.'
      };
    }
  };

  // Live dynamic party alignment calculation
  const getPartyAlignments = (stance: UserStance) => {
    const partyProfiles = aggregatePartyProfiles(claims);
    
    return partyProfiles
      .map(p => {
        // Calculate Euclidean distance in 3D stance space [acceleration, protection, governance]
        const dAcc = p.accelerationScore - stance.accelerationScore;
        const dProt = p.protectionScore - stance.protectionScore;
        const dGov = p.governanceScore - stance.governanceScore;
        const distance = Math.sqrt(dAcc * dAcc + dProt * dProt + dGov * dGov);
        
        // Normalize: max distance in a 5x5x5 cube is sqrt(5^2 + 5^2 + 5^2) = 8.66
        const maxDist = 8.66;
        const compatibility = Math.max(0, Math.round((1 - distance / maxDist) * 100));

        return {
          party: p.party,
          compatibility,
          accScore: p.accelerationScore,
          protScore: p.protectionScore,
          govScore: p.governanceScore
        };
      })
      .sort((a, b) => b.compatibility - a.compatibility);
  };

  const baseQuestionsCount = 6; // Questions 1 to 6

  return (
    <div className="animate-slide flex flex-col gap-6">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title flex items-center gap-3">
            <Compass className="text-teal-400 ai-glow" size={28} />
            AI-kompassen
          </h1>
          <p className="page-subtitle">
            Gör vårt självskattningstest för att identifiera din unika AI-politiska profil och matcha din ställning mot riksdagspartierna.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col gap-6">
        
        {/* State 1: Start Screen (If user has not completed the quiz yet) */}
        {!inQuiz && !userStance && (
          <div 
            className="glass-panel text-center flex flex-col gap-6 items-center" 
            style={{ padding: '60px 40px', borderTop: '3px solid var(--accent-teal)', borderRadius: '24px' }}
          >
            <div 
              className="rounded-full flex items-center justify-center"
              style={{ 
                width: '72px', 
                height: '72px', 
                backgroundColor: 'rgba(0, 230, 207, 0.06)', 
                color: 'var(--accent-teal)',
                border: '1px solid rgba(0, 230, 207, 0.15)',
                boxShadow: '0 0 15px rgba(0, 230, 207, 0.15)'
              }}
            >
              <Compass size={36} className="animate-pulse" />
            </div>

            <div className="max-w-xl">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Hitta din AI-politiska kompasskurs!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                Sverige står inför avgörande beslut inför valet 2026. Ska vi påskynda tekniken till varje pris, eller reglera skydd och integritet stenhårt? Svara på 6 sakpolitiska grundfrågor för att se din ideologiska hemvist på Valkartan och se vilket parti som bäst representerar dina åsikter.
              </p>
            </div>

            <button 
              onClick={handleStart} 
              className="btn btn-primary"
              style={{ 
                padding: '12px 32px', 
                fontSize: '0.95rem', 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center',
                boxShadow: '0 0 20px rgba(0, 230, 207, 0.3)'
              }}
            >
              Starta testet <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* State 2: Active Quiz Screen */}
        {inQuiz && (
          <div 
            className="glass-panel flex flex-col gap-6 animate-slide" 
            style={{ padding: '32px', borderRadius: '24px', borderTop: '3px solid var(--accent-teal)' }}
          >
            {/* Quiz Progress Bar */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>FRÅGA {currentIdx + 1} AV {baseQuestionsCount}</span>
                <span>{quizQuestions[currentIdx].category}</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${((currentIdx + 1) / baseQuestionsCount) * 100}%`, 
                    height: '100%', 
                    backgroundColor: 'var(--accent-teal)',
                    boxShadow: '0 0 8px var(--accent-teal)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="py-4">
              <h2 style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.4' }}>
                {quizQuestions[currentIdx].question}
              </h2>
            </div>

            {/* Importance / Weight Selector */}
            <div className="flex flex-col gap-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hur viktig är denna fråga för dig?
              </span>
              <div className="flex gap-2" style={{ maxWidth: '320px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWeight(1.0);
                    setShowWeightWarning(null);
                  }}
                  className={`btn flex-1 text-xs py-2 px-4 ${activeWeight === 1.0 ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minHeight: '34px', padding: '8px 16px' }}
                >
                  🟢 Normal (1x)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentQId = quizQuestions[currentIdx].id;
                    const otherHearts = Object.entries(quizWeights).filter(([id, w]) => Number(id) !== currentQId && w === 2.5).length;
                    if (otherHearts >= 3) {
                      setShowWeightWarning(currentQId);
                    } else {
                      setActiveWeight(2.5);
                      setShowWeightWarning(null);
                    }
                  }}
                  className={`btn flex-1 text-xs py-2 px-4 ${activeWeight === 2.5 ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minHeight: '34px', padding: '8px 16px', color: activeWeight === 2.5 ? '#060812' : 'var(--accent-coral)' }}
                >
                  ❤️ Hjärtfråga (2.5x)
                </button>
              </div>

              {/* Glowing weight warning limit alert */}
              {showWeightWarning === quizQuestions[currentIdx].id && (
                <div 
                  className="animate-pulse"
                  style={{
                    backgroundColor: 'rgba(255, 69, 36, 0.08)',
                    color: 'var(--accent-coral)',
                    border: '1px solid rgba(255, 69, 36, 0.2)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    lineHeight: '1.4',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ⚠️ Du kan max välja 3 hjärtfrågor för att behålla en skarp profil. Avmarkera en annan först.
                </div>
              )}
            </div>

            {/* Options List */}
            <div className="flex flex-col gap-3">
              {quizQuestions[currentIdx].options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  onClick={() => handleAnswerSelect(oIdx)}
                  className="compass-option-btn"
                >
                  <div className="compass-option-num">
                    {String.fromCharCode(65 + oIdx)}
                  </div>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* State 3: Result Screen */}
        {!inQuiz && userStance && (
          <div className="flex flex-col gap-6 animate-slide">
            
            {/* The 2-column results header */}
            <div className="compass-results-grid">
              
              {/* User Profile Card */}
              <div 
                className="glass-panel flex-1 flex flex-col gap-6" 
                style={{ padding: '32px', borderRadius: '24px', borderTop: '3px solid var(--accent-teal)' }}
              >
                {(() => {
                  const profile = getUserProfileName(userStance);
                  const hjartefragor = quizQuestions.filter(q => userStance.answers && userStance.answers[q.id] !== undefined && userStance.weights && userStance.weights[q.id] === 2.5);

                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <div 
                          className="rounded-full flex items-center justify-center"
                          style={{ 
                            width: '54px', 
                            height: '54px', 
                            backgroundColor: 'rgba(0, 230, 207, 0.08)', 
                            color: 'var(--accent-teal)',
                            border: '1px solid rgba(0, 230, 207, 0.2)',
                            boxShadow: '0 0 10px rgba(0, 230, 207, 0.2)'
                          }}
                        >
                          <User size={26} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            DIN AI-PROFIL
                          </span>
                          <h2 style={{ fontSize: '1.38rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {profile.title}
                          </h2>
                        </div>
                      </div>

                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.6', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                        {profile.description}
                      </p>

                      {/* Dynamic Prioritized Hjärtfrågor list */}
                      {hjartefragor.length > 0 && (
                        <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Dina Hjärtfrågor
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {hjartefragor.map(q => (
                              <span 
                                key={q.id} 
                                className="flex items-center gap-1 text-[0.65rem] font-bold px-2.5 py-0.5 rounded-full"
                                style={{ 
                                  backgroundColor: 'rgba(255, 69, 36, 0.08)', 
                                  color: 'var(--accent-coral)',
                                  border: '1px solid rgba(255, 69, 36, 0.15)'
                                }}
                              >
                                ❤️ {q.category}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stance Axis Metrics */}
                      <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Dina Ställningstaganden (0 - 5)
                        </h3>
                        
                        {/* Acceleration */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>AI-Acceleration (Marknad)</span>
                            <span style={{ color: 'var(--accent-teal)', fontWeight: 800 }}>{userStance.accelerationScore} / 5</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${(userStance.accelerationScore / 5) * 100}%`, 
                                height: '100%', 
                                backgroundColor: 'var(--accent-teal)',
                                boxShadow: '0 0 8px var(--accent-teal)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Protection */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>AI-Skydd (Integritet/Etik)</span>
                            <span style={{ color: 'var(--accent-coral)', fontWeight: 800 }}>{userStance.protectionScore} / 5</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${(userStance.protectionScore / 5) * 100}%`, 
                                height: '100%', 
                                backgroundColor: 'var(--accent-coral)',
                                boxShadow: '0 0 8px var(--accent-coral)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Governance */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Statlig Styrning (Samordning)</span>
                            <span style={{ color: 'var(--accent-purple)', fontWeight: 800 }}>{userStance.governanceScore} / 5</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${(userStance.governanceScore / 5) * 100}%`, 
                                height: '100%', 
                                backgroundColor: 'var(--accent-purple)',
                                boxShadow: '0 0 8px var(--accent-purple)'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 border-t border-white/5 pt-4 mt-auto">
                        <button 
                          onClick={() => onNavigate('dashboard')}
                          className="btn btn-primary flex-1 text-xs py-3"
                          style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Compass size={14} /> Visa på Valkartan
                        </button>
                        <button 
                          onClick={handleReset}
                          className="btn btn-secondary text-xs py-3"
                          style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-coral)' }}
                        >
                          <RotateCcw size={14} /> Gör om testet
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Party Alignment Rankings Card */}
              <div 
                className="glass-panel flex-1 flex flex-col gap-6" 
                style={{ padding: '32px', borderRadius: '24px', borderTop: '3px solid var(--accent-blue)' }}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Partimatchning & Kompassresultat
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Din överensstämmelse med riksdagspartierna baserat på live-databasen av politiska claims.
                  </p>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '350px' }}>
                  {getPartyAlignments(userStance).map((alignment, index) => {
                    const pColor = partyColorMap[alignment.party] || '#64748B';
                    
                    return (
                      <div 
                        key={alignment.party}
                        className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.005]"
                        style={{ borderLeft: `3px solid ${pColor}` }}
                      >
                        {/* Rank Indicator */}
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: index === 0 ? 'var(--accent-teal)' : 'var(--text-muted)', width: '16px', textAlign: 'center' }}>
                          #{index + 1}
                        </span>

                        {/* Party Info */}
                        <div className="flex-grow flex flex-col gap-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <span 
                              className="font-bold text-sm truncate text-white flex items-center gap-2" 
                              title={partyNames[alignment.party]}
                            >
                              <PartyLogo party={alignment.party as PartyAffiliation} size={18} glow />
                              {partyNames[alignment.party]}
                            </span>
                            <span 
                              className="text-[0.65rem] font-black px-1.5 py-0.5 rounded"
                              style={{ 
                                backgroundColor: `${pColor}15`, 
                                color: pColor,
                                border: `1px solid ${pColor}30`
                              }}
                            >
                              {alignment.party}
                            </span>
                          </div>

                          {/* Progress Bar showing Compatibility */}
                          <div className="flex items-center gap-3">
                            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  width: `${alignment.compatibility}%`, 
                                  height: '100%', 
                                  backgroundColor: index === 0 ? 'var(--accent-teal)' : pColor,
                                  boxShadow: index === 0 ? '0 0 8px var(--accent-teal)' : 'none'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: index === 0 ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
                              {alignment.compatibility}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Fine-Tuning Section (Full width below) */}
            {activeOptionalQId === null ? (
              <div 
                className="glass-panel flex flex-col gap-6" 
                style={{ padding: '32px', borderRadius: '24px', borderTop: '3px solid var(--accent-teal)' }}
              >
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Compass className="text-teal-400" size={20} />
                    Finjustera din AI-profil (Valfritt)
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Svara på ytterligare sakpolitiska frågor för att precisera din profil och partimatchning ytterligare. Förändringar slår igenom i realtid.
                  </p>
                </div>

                {/* Grid for optional questions */}
                <div className="compass-grid">
                  {quizQuestions.filter(q => q.isOptional).map(q => {
                    const isAnswered = userStance.answers && userStance.answers[q.id] !== undefined;
                    const selectedOptIdx = isAnswered ? userStance.answers![q.id] : -1;
                    const selectedOptText = selectedOptIdx !== -1 ? q.options[selectedOptIdx].text : '';

                    return (
                      <div 
                        key={q.id} 
                        className={`glass-panel p-5 rounded-xl border flex flex-col gap-4 justify-between transition-all duration-300 ${isAnswered ? 'border-teal-500/20 bg-teal-500/[0.005]' : 'border-white/5 bg-white/[0.005] hover:border-white/10'}`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-2">
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isAnswered ? 'var(--accent-teal)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {q.category}
                            </span>
                            
                            {isAnswered && (() => {
                              const qWeight = userStance.weights && userStance.weights[q.id] !== undefined ? userStance.weights[q.id] : 1.0;
                              return (
                                <div className="flex items-center gap-1.5">
                                  {/* Interactive weight toggle badge */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Avoid triggering card click
                                      handleToggleWeight(q.id);
                                    }}
                                    className="flex items-center gap-1 text-[0.62rem] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-all duration-300"
                                    style={{
                                      backgroundColor: qWeight === 2.5 ? 'rgba(255, 69, 36, 0.08)' : 'rgba(255,255,255,0.03)',
                                      color: qWeight === 2.5 ? 'var(--accent-coral)' : 'var(--text-muted)',
                                      borderColor: qWeight === 2.5 ? 'rgba(255, 69, 36, 0.2)' : 'rgba(255,255,255,0.08)'
                                    }}
                                    title="Klicka för att ändra betydelse"
                                  >
                                    {qWeight === 2.5 ? '❤️ Hjärtfråga' : '🟢 Normal'}
                                  </button>
                                  <span className="flex items-center gap-1 text-[0.62rem] font-bold text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-full">
                                    Klar
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                          
                          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                            {q.question.length > 70 ? q.question.substring(0, 68) + '...' : q.question}
                          </h4>

                          {isAnswered ? (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4', borderLeft: '2px solid rgba(0, 230, 207, 0.3)', paddingLeft: '8px' }}>
                              "{selectedOptText.length > 70 ? selectedOptText.substring(0, 68) + '...' : selectedOptText}"
                            </p>
                          ) : (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Tyck till om ämnet för att precisera din matchning.
                            </p>
                          )}
                          
                          {/* Pulsing warning if they exceed 3 hearts inside completed cards grid */}
                          {showWeightWarning === q.id && (
                            <div 
                              className="animate-pulse"
                              style={{
                                backgroundColor: 'rgba(255, 69, 36, 0.08)',
                                color: 'var(--accent-coral)',
                                border: '1px solid rgba(255, 69, 36, 0.2)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 'bold',
                                lineHeight: '1.3',
                                marginTop: '4px'
                              }}
                            >
                              ⚠️ Max 3 hjärtfrågor tillåtna. Avmarkera en annan först.
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={() => {
                            setActiveOptionalQId(q.id);
                            const savedWeight = userStance.weights && userStance.weights[q.id] !== undefined ? userStance.weights[q.id] : 1.0;
                            setActiveWeight(savedWeight);
                            setShowWeightWarning(null);
                          }}
                          className={`btn ${isAnswered ? 'btn-secondary text-xs py-2 text-gray-300' : 'btn-primary text-xs py-2'}`}
                          style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '34px' }}
                        >
                          {isAnswered ? (
                            <>
                              <Edit size={12} /> Ändra svar
                            </>
                          ) : (
                            <>
                              Besvara fråga <ArrowRight size={12} />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Focused Optional Question view */
              (() => {
                const q = quizQuestions.find(ques => ques.id === activeOptionalQId);
                if (!q) return null;
                const currentAnswers = userStance.answers || {};
                const prevAnswerIdx = currentAnswers[q.id];

                return (
                  <div 
                    className="glass-panel flex flex-col gap-6 animate-slide" 
                    style={{ padding: '32px', borderRadius: '24px', borderTop: '3px solid var(--accent-teal)' }}
                  >
                    {/* Header */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                        <span className="text-teal-400 font-extrabold uppercase tracking-widest">FINJUSTERING</span>
                        <span>{q.category}</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(0, 230, 207, 0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                        <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--accent-teal)', boxShadow: '0 0 8px var(--accent-teal)' }} />
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="py-2">
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {q.question}
                      </h2>
                    </div>

                    {/* Importance / Weight Selector */}
                    <div className="flex flex-col gap-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Hur viktig är denna fråga för dig?
                      </span>
                      <div className="flex gap-2" style={{ maxWidth: '320px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWeight(1.0);
                            setShowWeightWarning(null);
                          }}
                          className={`btn flex-1 text-xs py-2 px-4 ${activeWeight === 1.0 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ minHeight: '34px', padding: '8px 16px' }}
                        >
                          🟢 Normal (1x)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const otherHearts = Object.entries(userStance.weights || {}).filter(([id, w]) => Number(id) !== q.id && w === 2.5).length;
                            if (otherHearts >= 3) {
                              setShowWeightWarning(q.id);
                            } else {
                              setActiveWeight(2.5);
                              setShowWeightWarning(null);
                            }
                          }}
                          className={`btn flex-1 text-xs py-2 px-4 ${activeWeight === 2.5 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ minHeight: '34px', padding: '8px 16px', color: activeWeight === 2.5 ? '#060812' : 'var(--accent-coral)' }}
                        >
                          ❤️ Hjärtfråga (2.5x)
                        </button>
                      </div>

                      {/* Glowing warning if limit reached in optional card editor */}
                      {showWeightWarning === q.id && (
                        <div 
                          className="animate-pulse"
                          style={{
                            backgroundColor: 'rgba(255, 69, 36, 0.08)',
                            color: 'var(--accent-coral)',
                            border: '1px solid rgba(255, 69, 36, 0.2)',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 'bold',
                            lineHeight: '1.4',
                            marginTop: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          ⚠️ Du kan max välja 3 hjärtfrågor för att behålla en skarp profil. Avmarkera en annan först.
                        </div>
                      )}
                    </div>

                    {/* Options list */}
                    <div className="flex flex-col gap-3">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = prevAnswerIdx === oIdx;
                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleOptionalAnswerSelect(q.id, oIdx)}
                            className={`compass-option-btn ${isSelected ? 'selected' : ''}`}
                          >
                            <div className="compass-option-num">
                              {isSelected ? '✓' : String.fromCharCode(65 + oIdx)}
                            </div>
                            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Back action */}
                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={() => {
                          setActiveOptionalQId(null);
                          setShowWeightWarning(null);
                        }}
                        className="btn btn-secondary text-xs py-2 px-6"
                      >
                        Avbryt och gå tillbaka
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

      </div>
    </div>
  );
};
