import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, ChevronRight, RotateCcw, User, ArrowRight, 
  GitCompare, FileText, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import type { ClaimCard, UserStance, PartyAffiliation } from '../types';
import { aggregatePartyProfiles } from '../utils/scoring';
import { PartyLogo } from '../utils/partyAssets';
import { partyColorMap, partyNames } from '../utils/partyConstants';
import { compassQuestions } from '../data/compassQuestions';
import { partyDimensionSummaries } from '../data/partySummaries';
import { lockedDimensions } from '../data/mockClaims';

interface AiCompassProps {
  userStance: UserStance | null;
  onUpdateStance: (stance: UserStance | null) => void;
  claims: ClaimCard[];
  onNavigate: (tab: string) => void;
}

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
  const [activeWeight, setActiveWeight] = useState<number>(1.0);
  const [showWeightWarning, setShowWeightWarning] = useState<number | null>(null);

  // Results View Settings
  const [resultsTab, setResultsTab] = useState<'overview' | 'dimensions' | 'parties'>('overview');
  
  // Tab 1 (Overview) plot settings
  const [plotXAxis, setPlotXAxis] = useState<'acceleration' | 'protection' | 'governance'>('acceleration');
  const [plotYAxis, setPlotYAxis] = useState<'acceleration' | 'protection' | 'governance'>('protection');
  
  // Tab 2 (Dimensions Match) settings
  const [activeDimensionId, setActiveDimensionId] = useState<number>(1);
  const [comparisonParty, setComparisonParty] = useState<PartyAffiliation>('S');
  const [expandedOptionalQId, setExpandedOptionalQId] = useState<number | null>(null);

  // Tab 3 (Party Summaries) settings
  const [activeSummaryDimensionId, setActiveSummaryDimensionId] = useState<number>(1);
  const [expandedPartyClaims, setExpandedPartyClaims] = useState<Record<string, boolean>>({});

  // Filter base questions
  const baseQuestions = useMemo(() => compassQuestions.filter(q => !q.isOptional), []);
  const partyProfiles = useMemo(() => aggregatePartyProfiles(claims), [claims]);

  // Clean old storage stances on schema upgrade
  useEffect(() => {
    if (userStance && userStance.schemaVersion !== 'v4.0') {
      onUpdateStance(null);
    }
  }, [userStance, onUpdateStance]);

  // Helper to recalculate user stances
  const recalculateStance = (currAnswers: Record<number, number>, currWeights: Record<number, number> = {}) => {
    let accelSum = 0;
    let protSum = 0;
    let govSum = 0;
    let weightTotal = 0;

    compassQuestions.forEach((q) => {
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

  // Helper to calculate user stance for a single dimension
  const getDimensionStance = (stance: UserStance, dimId: number) => {
    const dimQuestions = compassQuestions.filter(q => q.dimensionId === dimId);
    let accelSum = 0;
    let protSum = 0;
    let govSum = 0;
    let weightTotal = 0;

    dimQuestions.forEach(q => {
      if (stance.answers && stance.answers[q.id] !== undefined) {
        const optIdx = stance.answers[q.id];
        const opt = q.options[optIdx];
        const w = stance.weights && stance.weights[q.id] !== undefined ? stance.weights[q.id] : 1.0;
        accelSum += opt.accVal * w;
        protSum += opt.protVal * w;
        govSum += opt.govVal * w;
        weightTotal += w;
      }
    });

    if (weightTotal === 0) return { acceleration: 0, protection: 0, governance: 0 };
    return {
      acceleration: Math.round((accelSum / weightTotal) * 100) / 100,
      protection: Math.round((protSum / weightTotal) * 100) / 100,
      governance: Math.round((govSum / weightTotal) * 100) / 100
    };
  };

  // Helper to calculate compatibility percentage between two stances
  const calculateCompatibility = (
    userStanceVal: { acceleration: number; protection: number; governance: number } | { accelerationScore: number; protectionScore: number; governanceScore: number },
    partyStanceVal: { acceleration: number; protection: number; governance: number }
  ) => {
    const uAcc = 'acceleration' in userStanceVal ? userStanceVal.acceleration : userStanceVal.accelerationScore;
    const uProt = 'protection' in userStanceVal ? userStanceVal.protection : userStanceVal.protectionScore;
    const uGov = 'governance' in userStanceVal ? userStanceVal.governance : userStanceVal.governanceScore;

    const dAcc = partyStanceVal.acceleration - uAcc;
    const dProt = partyStanceVal.protection - uProt;
    const dGov = partyStanceVal.governance - uGov;
    
    const distance = Math.sqrt(dAcc * dAcc + dProt * dProt + dGov * dGov);
    const maxDist = 8.66; // max distance in 5x5x5 space
    
    return Math.max(0, Math.round((1 - distance / maxDist) * 100));
  };

  const handleStart = () => {
    setAnswers([]);
    setQuizWeights({});
    setCurrentIdx(0);
    setInQuiz(true);
    setActiveWeight(1.0);
    setShowWeightWarning(null);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    const nextAnswers = [...answers, optionIndex];
    setAnswers(nextAnswers);

    const currentQId = baseQuestions[currentIdx].id;
    const updatedWeights = {
      ...quizWeights,
      [currentQId]: activeWeight
    };
    setQuizWeights(updatedWeights);
    setActiveWeight(1.0);
    setShowWeightWarning(null);

    const baseQuestionsCount = baseQuestions.length;
    if (currentIdx < baseQuestionsCount - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Build final state
      const initialAnswersMap: Record<number, number> = {};
      nextAnswers.forEach((optIdx, idx) => {
        const qId = baseQuestions[idx].id;
        initialAnswersMap[qId] = optIdx;
      });

      const baseScores = recalculateStance(initialAnswersMap, updatedWeights);

      onUpdateStance({
        ...baseScores,
        answers: initialAnswersMap,
        completedOptionalIds: [],
        weights: updatedWeights,
        schemaVersion: 'v4.0'
      });
      setInQuiz(false);
      setResultsTab('overview');
    }
  };

  const handleOptionalAnswerSelect = (qId: number, optionIndex: number) => {
    if (!userStance) return;

    const currentAnswers = userStance.answers || {};
    const updatedAnswers = {
      ...currentAnswers,
      [qId]: optionIndex
    };

    const currentWeights = userStance.weights || {};
    // Keep existing weight or default to 1.0
    const updatedWeights = {
      ...currentWeights,
      [qId]: currentWeights[qId] !== undefined ? currentWeights[qId] : 1.0
    };

    const isOptional = compassQuestions.find(q => q.id === qId)?.isOptional;
    const updatedOptionalIds = isOptional
      ? Array.from(new Set([...(userStance.completedOptionalIds || []), qId]))
      : (userStance.completedOptionalIds || []);

    const updatedScores = recalculateStance(updatedAnswers, updatedWeights);

    onUpdateStance({
      ...updatedScores,
      answers: updatedAnswers,
      completedOptionalIds: updatedOptionalIds,
      weights: updatedWeights,
      schemaVersion: 'v4.0'
    });
    setExpandedOptionalQId(null);
  };

  const handleToggleWeight = (qId: number) => {
    if (!userStance) return;
    
    const currentWeights = userStance.weights || {};
    const oldWeight = currentWeights[qId] !== undefined ? currentWeights[qId] : 1.0;
    const newWeight = oldWeight === 2.5 ? 1.0 : 2.5;

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
      schemaVersion: 'v4.0'
    });
  };

  const handleReset = () => {
    onUpdateStance(null);
    setAnswers([]);
    setQuizWeights({});
    setCurrentIdx(0);
    setInQuiz(false);
    setActiveWeight(1.0);
    setShowWeightWarning(null);
  };

  // Generate alignments
  const getPartyAlignments = (stance: UserStance) => {
    return partyProfiles
      .map(p => {
        const partyStance = {
          acceleration: p.accelerationScore,
          protection: p.protectionScore,
          governance: p.governanceScore
        };
        const compatibility = calculateCompatibility(stance, partyStance);
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

  // Get matching party for specific dimension
  const getPartyDimensionAlignments = (stance: UserStance, dimId: number) => {
    const userDimStance = getDimensionStance(stance, dimId);
    
    return partyProfiles
      .map(p => {
        const partyDimStance = p.dimensionStanceScores?.[dimId] || { acceleration: 0, protection: 0, governance: 0 };
        const hasNoStance = p.dimensionClaimsCount[dimId] === 0;

        return {
          party: p.party,
          compatibility: hasNoStance ? -1 : calculateCompatibility(userDimStance, partyDimStance),
          stance: partyDimStance,
          hasNoStance,
          claimsCount: p.dimensionClaimsCount[dimId]
        };
      })
      .sort((a, b) => b.compatibility - a.compatibility);
  };

  // Get user profile summary
  const getUserProfileName = (stance: UserStance) => {
    const acc = stance.accelerationScore;
    const prot = stance.protectionScore;
    const gov = stance.governanceScore;
    const max = Math.max(acc, prot, gov);
    const min = Math.min(acc, prot, gov);

    if (max - min <= 0.8) {
      return {
        title: 'Den balanserade vägvisaren',
        description: 'Du söker en gyllene medelväg där du bejakar AI-teknikens stora fördelar för samhället men samtidigt vill ha förnuftig tillsyn och lagar för att undvika risker och skydda medborgarna.'
      };
    }

    if (acc >= prot && acc >= gov) {
      return {
        title: 'Den framtidsfokuserade innovatören',
        description: 'Du sätter utveckling, innovation, konkurrenskraft och entreprenörskap i första rummet. Du anser att AI bäst drivs framåt av marknadskrafter och företag med så lite krångel som möjligt.'
      };
    } else if (prot >= acc && prot >= gov) {
      return {
        title: 'Den ansvarsfulle skyddsivraren',
        description: 'Ditt fokus ligger på personlig integritet, mänskliga rättigheter, etik och noggrann riskkontroll. Du anser avancerad teknik måste styras av tydliga gränser och lagar för att skydda oss medborgare.'
      };
    } else {
      return {
        title: 'Den trygge välfärdsbyggaren',
        description: 'Du vill se ett starkt statligt ledarskap, gemensamma offentliga satsningar och central samordning. Du vill att välfärden och medborgarna drar nytta av AI under demokratisk kontroll.'
      };
    }
  };

  // Toggle party claim list in Tab 3
  const togglePartyClaims = (partyKey: string) => {
    setExpandedPartyClaims(prev => ({
      ...prev,
      [partyKey]: !prev[partyKey]
    }));
  };

  return (
    <div className="animate-slide flex flex-col gap-6">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title flex items-center gap-3">
            <Compass className="text-teal-400 ai-glow animate-spin-slow" size={28} />
            AI-kompassen v4.0
          </h1>
          <p className="page-subtitle">
            Matcha dina åsikter om framtidens AI och digitalisering. Svara på basfrågorna för att få din profil, och fördjupa dig sedan i specifika områden.
          </p>
        </div>
      </div>

      {/* State 1: Start Screen */}
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

          <div className="max-w-xl flex flex-col gap-4">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Vilken AI-politik tycker du är bäst för Sverige?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
              Sverige står inför avgörande beslut inför valet 2026. Ska vi främja innovation och snabb tillväxt, eller ska vi prioritera integritet, etiska skyddsräcken och statlig styrning? Svara på 12 sakpolitiska grundfrågor för att pejla in din profil.
            </p>
            
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.02)', border: '1px dashed var(--accent-coral)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'left', lineHeight: '1.5' }}>
              <strong>Vägledning & AI-information:</strong> Partiernas ståndpunkter i detta test har beräknats med hjälp av en AI-modell som analyserat deras riksdagsförslag och lagt grunden för indexeringenarna. Då AI-kategoriseringar kan innehålla förenklingar eller sakna specifika nyanser bör du se resultatet som en vägledande indikation och ett komplement för att själv utforska partiernas ställningstaganden.
            </div>
          </div>

          <button 
            onClick={handleStart} 
            className="btn btn-primary"
            style={{ 
              padding: '12px 32px', 
              fontSize: '0.95rem', 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center'
            }}
          >
            Starta testet <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* State 2: Active Quiz Screen (12 base questions) */}
      {inQuiz && (
        <div 
          className="glass-panel flex flex-col gap-6 animate-slide" 
          style={{ padding: '32px', borderRadius: '24px', borderTop: '3px solid var(--accent-teal)' }}
        >
          {/* Quiz Progress Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-bold text-gray-400">
              <span>FRÅGA {currentIdx + 1} AV {baseQuestions.length}</span>
              <span className="text-teal-400 font-extrabold">{baseQuestions[currentIdx].category}</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${((currentIdx + 1) / baseQuestions.length) * 100}%`, 
                  height: '100%', 
                  backgroundColor: 'var(--accent-teal)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="py-4">
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Område {baseQuestions[currentIdx].dimensionId}: {lockedDimensions.find(d => d.id === baseQuestions[currentIdx].dimensionId)?.name}
            </span>
            <h2 style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.4', marginTop: '4px' }}>
              {baseQuestions[currentIdx].question}
            </h2>
          </div>

          {/* Importance / Weight Selector */}
          <div className="flex flex-col gap-2 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                  const currentQId = baseQuestions[currentIdx].id;
                  const otherHearts = Object.entries(quizWeights).filter(([id, w]) => Number(id) !== currentQId && w === 2.5).length;
                  if (otherHearts >= 3) {
                    setShowWeightWarning(currentQId);
                  } else {
                    setActiveWeight(2.5);
                    setShowWeightWarning(null);
                  }
                }}
                className={`btn flex-1 text-xs py-2 px-4 ${activeWeight === 2.5 ? 'btn-danger' : 'btn-secondary'}`}
                style={{ 
                  minHeight: '34px', 
                  padding: '8px 16px', 
                  color: activeWeight === 2.5 ? '#ffffff' : 'var(--accent-coral)',
                  borderColor: activeWeight === 2.5 ? 'transparent' : 'rgba(255, 69, 36, 0.2)'
                }}
              >
                ❤️ Hjärtfråga (2.5x)
              </button>
            </div>

            {showWeightWarning === baseQuestions[currentIdx].id && (
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
            {baseQuestions[currentIdx].options.map((opt, oIdx) => (
              <button
                type="button"
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
          
          {/* Custom Tabs Navigation */}
          <div className="tabs-container" style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setResultsTab('overview')}
              className={`tab-btn ${resultsTab === 'overview' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Compass size={16} /> Översikt & Valkompass
            </button>
            <button
              onClick={() => setResultsTab('dimensions')}
              className={`tab-btn ${resultsTab === 'dimensions' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <GitCompare size={16} /> Matcha per område
            </button>
            <button
              onClick={() => setResultsTab('parties')}
              className={`tab-btn ${resultsTab === 'parties' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FileText size={16} /> Vad tycker partierna?
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW & COMPASS                                */}
          {/* ======================================================== */}
          {resultsTab === 'overview' && (
            <div className="compass-results-grid">
              
              {/* Profile details & Axes stats */}
              <div 
                className="glass-panel flex-1 flex flex-col gap-6" 
                style={{ padding: '32px', borderRadius: '24px', borderTop: '3px solid var(--accent-teal)' }}
              >
                {(() => {
                  const profile = getUserProfileName(userStance);
                  const hjartefragor = compassQuestions.filter(q => userStance.answers && userStance.answers[q.id] !== undefined && userStance.weights && userStance.weights[q.id] === 2.5);

                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <div 
                          className="rounded-full flex items-center justify-center"
                          style={{ 
                            width: '54px', 
                            height: '54px', 
                            backgroundColor: 'rgba(13, 148, 136, 0.08)', 
                            color: 'var(--accent-teal)',
                            border: '1px solid rgba(13, 148, 136, 0.2)'
                          }}
                        >
                          <User size={26} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            DIN AI-PROFIL
                          </span>
                          <h2 style={{ fontSize: '1.38rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {profile.title}
                          </h2>
                        </div>
                      </div>

                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                        {profile.description}
                      </p>

                      {hjartefragor.length > 0 && (
                        <div className="flex flex-col gap-2 border-t border-[var(--border-color)] pt-3">
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Dina hjärtfrågor (2.5x viktade)
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

                      <div className="flex flex-col gap-3 border-t border-[var(--border-color)] pt-3">
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Dina ställningstaganden (0 - 5)
                        </h3>
                        
                        {/* Acceleration */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex flex-col">
                              <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.82rem' }}>Främja & Accelerera AI</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Marknadsdriven innovation och konkurrenskraft</span>
                            </div>
                            <span style={{ color: 'var(--accent-teal)', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{userStance.accelerationScore} / 5</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${(userStance.accelerationScore / 5) * 100}%`, height: '100%', backgroundColor: 'var(--accent-teal)' }} />
                          </div>
                        </div>

                        {/* Protection */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex flex-col">
                              <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.82rem' }}>Reglera & Skydda</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Integritet, etik, rättssäkerhet och skyddsräcken</span>
                            </div>
                            <span style={{ color: 'var(--accent-coral)', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{userStance.protectionScore} / 5</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${(userStance.protectionScore / 5) * 100}%`, height: '100%', backgroundColor: 'var(--accent-coral)' }} />
                          </div>
                        </div>

                        {/* Governance */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex flex-col">
                              <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.82rem' }}>Offentlig Styrning & Kontroll</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Demokratisk samordning, statligt ägande och välfärd</span>
                            </div>
                            <span style={{ color: 'var(--accent-purple)', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{userStance.governanceScore} / 5</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${(userStance.governanceScore / 5) * 100}%`, height: '100%', backgroundColor: 'var(--accent-purple)' }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 border-t border-[var(--border-color)] pt-4 mt-auto">
                        <button 
                          type="button"
                          onClick={() => onNavigate('dashboard')}
                          className="btn btn-primary flex-1 text-xs py-3"
                          style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Compass size={14} /> Visa på Valkartan
                        </button>
                        <button 
                          type="button"
                          onClick={handleReset}
                          className="btn btn-secondary text-xs py-3"
                          style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <RotateCcw size={14} /> Gör om testet
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* The interactive SVG plot coordinate map */}
              <div 
                className="glass-panel flex-1 flex flex-col gap-6" 
                style={{ padding: '32px', borderRadius: '24px', borderTop: '3px solid var(--accent-blue)' }}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Din position på Valkompassen
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Jämför dina koordinater mot partierna. Välj fritt vilka två ideologiska axlar du vill jämföra dig på.
                  </p>
                </div>

                {/* Axes selection controls */}
                <div className="grid grid-cols-2 gap-3 bg-[var(--bg-main)] p-2 rounded-xl border border-[var(--border-color)]" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="flex flex-col gap-1 select-wrapper" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vågrät axel (X)</label>
                    <select 
                      value={plotXAxis} 
                      onChange={(e) => setPlotXAxis(e.target.value as any)}
                      className="bg-transparent text-xs text-[var(--text-primary)] font-bold focus:outline-none cursor-pointer"
                      style={{
                        padding: '4px 20px 4px 4px',
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        appearance: 'none',
                        width: '100%',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b5cf6' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 2px center',
                        backgroundSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="acceleration">Främja & Accelerera</option>
                      <option value="protection">Reglera & Skydda</option>
                      <option value="governance">Offentlig Styrning</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 border-l border-[var(--border-color)] pl-3 select-wrapper" style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lodrät axel (Y)</label>
                    <select 
                      value={plotYAxis} 
                      onChange={(e) => setPlotYAxis(e.target.value as any)}
                      className="bg-transparent text-xs text-[var(--text-primary)] font-bold focus:outline-none cursor-pointer"
                      style={{
                        padding: '4px 20px 4px 4px',
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        appearance: 'none',
                        width: '100%',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b5cf6' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 2px center',
                        backgroundSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="protection">Reglera & Skydda</option>
                      <option value="acceleration">Främja & Accelerera</option>
                      <option value="governance">Offentlig Styrning</option>
                    </select>
                  </div>
                </div>

                {/* SVG Graph rendering */}
                {(() => {
                  const size = 450;
                  const padding = 55;
                  const graphSize = size - padding * 2;
                  
                  const getVal = (stance: { accelerationScore?: number; protectionScore?: number; governanceScore?: number; acceleration?: number; protection?: number; governance?: number }, axis: string) => {
                    const acc = stance.accelerationScore !== undefined ? stance.accelerationScore : stance.acceleration || 0;
                    const prot = stance.protectionScore !== undefined ? stance.protectionScore : stance.protection || 0;
                    const gov = stance.governanceScore !== undefined ? stance.governanceScore : stance.governance || 0;
                    if (axis === 'acceleration') return acc;
                    if (axis === 'protection') return prot;
                    return gov;
                  };

                  const getX = (val: number) => padding + (val / 5) * graphSize;
                  const getY = (val: number) => size - padding - (val / 5) * graphSize;

                  const axisLabels: Record<string, string> = {
                    acceleration: 'Främja & Accelerera',
                    protection: 'Reglera & Skydda',
                    governance: 'Offentlig Styrning'
                  };

                  const userX = getX(getVal(userStance, plotXAxis));
                  const userY = getY(getVal(userStance, plotYAxis));

                  return (
                    <div className="svg-plot-container" style={{ margin: 'auto 0' }}>
                      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
                        <defs>
                          <radialGradient id="teal-glow-compass" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity="0" />
                          </radialGradient>
                        </defs>

                        {/* Grid lines */}
                        {[1, 2, 3, 4].map(tick => (
                          <g key={tick}>
                            <line x1={getX(tick)} y1={padding} x2={getX(tick)} y2={size - padding} className="svg-grid-line" />
                            <line x1={padding} y1={getY(tick)} x2={size - padding} y2={getY(tick)} className="svg-grid-line" />
                          </g>
                        ))}

                        {/* Center Crosshairs */}
                        <line x1={size / 2} y1={padding} x2={size / 2} y2={size - padding} className="svg-crosshair-line" />
                        <line x1={padding} y1={size / 2} x2={size - padding} y2={size / 2} className="svg-crosshair-line" />

                        <rect x={padding} y={padding} width={graphSize} height={graphSize} fill="none" stroke="var(--border-color)" strokeWidth={1} />

                        {/* Axis Headings */}
                        <text x={size / 2} y={size - 14} className="svg-axis-heading" textAnchor="middle">
                          {axisLabels[plotXAxis]} &rarr;
                        </text>
                        <text x={18} y={size / 2} className="svg-axis-heading" textAnchor="middle" transform={`rotate(-90 18 ${size/2})`}>
                          {axisLabels[plotYAxis]} &rarr;
                        </text>

                        {/* Outer Limits Indicators */}
                        <text x={padding + 10} y={padding + 18} className="svg-axis-label" textAnchor="start">Hög {axisLabels[plotYAxis]}</text>
                        <text x={size - padding - 10} y={size - padding - 10} className="svg-axis-label" textAnchor="end">Hög {axisLabels[plotXAxis]}</text>
                        <text x={padding + 10} y={size - padding - 10} className="svg-axis-label" textAnchor="start">Låg båda</text>

                        {/* Party Dots */}
                        {partyProfiles.map(p => {
                          const px = getX(getVal(p, plotXAxis));
                          const py = getY(getVal(p, plotYAxis));
                          const isDarkInitials = ['SD', 'MP'].includes(p.party);

                          return (
                            <g key={p.party} className="svg-dot-group cursor-pointer">
                              <title>{partyNames[p.party]} (Acc: {p.accelerationScore}, Prot: {p.protectionScore}, Gov: {p.governanceScore})</title>
                              <circle cx={px} cy={py} r={10} fill="currentColor" className={`party-${p.party}`} opacity="0.3" />
                              <circle cx={px} cy={py} r={11} className={`svg-dot-circle party-${p.party}`} />
                              <text x={px} y={py + 3.5} textAnchor="middle" fill={isDarkInitials ? '#000' : '#fff'} fontSize="9px" fontWeight="800" pointerEvents="none">
                                {p.party}
                              </text>
                            </g>
                          );
                        })}

                        {/* User Dot */}
                        <g className="svg-dot-group user-node">
                          <title>Din position (X: {getVal(userStance, plotXAxis)}, Y: {getVal(userStance, plotYAxis)})</title>
                          <circle cx={userX} cy={userY} r={18} fill="none" stroke="var(--accent-teal)" strokeWidth={2} className="animate-ping" style={{ animationDuration: '3s', opacity: 0.6 }} />
                          <circle cx={userX} cy={userY} r={12} fill="url(#teal-glow-compass)" pointerEvents="none" />
                          <circle cx={userX} cy={userY} r={10} fill="var(--accent-teal)" stroke="var(--bg-main)" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 6px var(--accent-teal))' }} />
                          <text x={userX} y={userY + 3.5} textAnchor="middle" fill="var(--bg-main)" fontSize="8.5px" fontWeight="900" pointerEvents="none">
                            DU
                          </text>
                        </g>

                      </svg>
                    </div>
                  );
                })()}

                {/* Rankings under graph */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-color)]">
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Matchning sammanställning
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {getPartyAlignments(userStance).slice(0, 4).map(alignment => {
                      const color = partyColorMap[alignment.party];
                      return (
                        <div 
                          key={alignment.party} 
                          className="flex items-center gap-2 border"
                          style={{ 
                            borderLeft: `3px solid ${color}`,
                            borderColor: 'var(--border-color)',
                            backgroundColor: 'var(--bg-main)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          <PartyLogo party={alignment.party} size={13} />
                          <span>{alignment.party}:</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{alignment.compatibility}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DETAILED MATCH & DEEPENING BY DIMENSION          */}
          {/* ======================================================== */}
          {resultsTab === 'dimensions' && (
            <div className="compass-results-grid">
              
              {/* Left Column: Dimensions List */}
              <div 
                className="glass-panel flex-1 flex flex-col gap-4 overflow-y-auto" 
                style={{ padding: '24px', borderRadius: '24px', borderTop: '3px solid var(--accent-purple)', maxHeight: '680px' }}
              >
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    Politiska områden
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    Klicka på ett område för att granska din matchning och svara på fördjupningsfrågor.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {lockedDimensions.map(d => {
                    const answeredCount = compassQuestions.filter(q => q.dimensionId === d.id && userStance.answers && userStance.answers[q.id] !== undefined).length;
                    const totalQ = compassQuestions.filter(q => q.dimensionId === d.id).length;
                    const isSelected = activeDimensionId === d.id;
                    const alignments = getPartyDimensionAlignments(userStance, d.id);
                    const topMatch = alignments[0];

                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          setActiveDimensionId(d.id);
                          setExpandedOptionalQId(null);
                        }}
                        className="text-left p-3 border transition-all flex flex-col gap-1.5 cursor-pointer"
                        style={{
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent-purple)' : 'var(--border-color)',
                          backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.04)' : 'var(--bg-card)',
                          width: '100%'
                        }}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>
                            {d.id}. {d.name}
                          </span>
                          <span 
                            className="badge text-[0.62rem]"
                            style={{
                              backgroundColor: answeredCount === totalQ ? 'rgba(13, 148, 136, 0.08)' : 'rgba(15, 23, 42, 0.04)',
                              color: answeredCount === totalQ ? 'var(--accent-teal)' : 'var(--text-muted)',
                              border: '1px solid transparent',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontWeight: 700
                            }}
                          >
                            {answeredCount}/{totalQ} svar
                          </span>
                        </div>

                        {topMatch && !topMatch.hasNoStance && (
                          <div className="flex justify-between items-center text-[0.68rem] border-t border-[var(--border-color)]/30 pt-1.5 mt-0.5 w-full" style={{ color: 'var(--text-muted)' }}>
                            <span className="flex items-center gap-1">
                              Bästa match: <PartyLogo party={topMatch.party} size={11} /> <strong>{topMatch.party}</strong>
                            </span>
                            <span style={{ fontWeight: 800, color: 'var(--accent-teal)' }}>{topMatch.compatibility}%</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Comparative Charts & Optional Questions */}
              <div className="flex-1 flex flex-col gap-6">
                
                {/* 1. Area Stance Compare Card */}
                {(() => {
                  const dim = lockedDimensions.find(d => d.id === activeDimensionId)!;
                  const selectedPartyProfile = partyProfiles.find(p => p.party === comparisonParty)!;
                  const userDimStance = getDimensionStance(userStance, activeDimensionId);
                  
                  const partyDimStance = selectedPartyProfile.dimensionStanceScores?.[activeDimensionId] || { acceleration: 0, protection: 0, governance: 0 };
                  const partyHasNoStance = selectedPartyProfile.dimensionClaimsCount[activeDimensionId] === 0;

                  return (
                    <div 
                      className="glass-panel flex flex-col gap-6" 
                      style={{ padding: '28px', borderRadius: '24px', borderTop: '3px solid var(--accent-teal)' }}
                    >
                      <div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Område {activeDimensionId}: Jämförelse
                        </span>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', marginBottom: '4px' }}>
                          {dim.name}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                          {dim.description}
                        </p>
                      </div>

                      {/* Party Comparison Selector & Match Indicator */}
                      <div className="flex justify-between items-center gap-4 bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border-color)] flex-wrap">
                        <div className="flex items-center gap-2 select-wrapper" style={{ position: 'relative' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Jämför med:</span>
                          <select
                            value={comparisonParty}
                            onChange={(e) => setComparisonParty(e.target.value as PartyAffiliation)}
                            className="bg-transparent text-sm font-bold text-[var(--text-primary)] cursor-pointer focus:outline-none"
                            style={{
                              padding: '6px 28px 6px 12px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              outline: 'none',
                              appearance: 'none',
                              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230d9488' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 10px center',
                              backgroundSize: '12px',
                              cursor: 'pointer',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {(['S', 'M', 'SD', 'C', 'V', 'MP', 'L', 'KD'] as PartyAffiliation[]).map(p => (
                              <option key={p} value={p}>{partyNames[p]} ({p})</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Matchning i området:</span>
                          <span style={{ 
                            fontSize: '1rem', 
                            fontWeight: 900, 
                            color: partyHasNoStance ? 'var(--text-muted)' : 'var(--accent-teal)'
                          }}>
                            {partyHasNoStance ? 'N/A (Inga claims)' : `${calculateCompatibility(userDimStance, partyDimStance)}%`}
                          </span>
                        </div>
                      </div>

                      {/* Stance Axes side-by-side bar charts */}
                      <div className="flex flex-col gap-4 border-t border-[var(--border-color)] pt-4">
                        <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Ståndpunkter på ideologiska axlar (0 - 5)
                        </h4>

                        {/* Accel */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            <span>Främja & Accelerera</span>
                            <span>Du: {userDimStance.acceleration} vs {comparisonParty}: {partyHasNoStance ? '-' : partyDimStance.acceleration}</span>
                          </div>
                          <div 
                            className="flex flex-col gap-1.5"
                            style={{ 
                              backgroundColor: 'var(--bg-main)', 
                              padding: '12px', 
                              borderRadius: '12px', 
                              border: '1px solid var(--border-color)' 
                            }}
                          >
                            {/* User bar */}
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] w-6 font-bold" style={{ color: 'var(--accent-teal)' }}>DU</span>
                              <div style={{ flex: 1, height: '6px', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(userDimStance.acceleration / 5) * 100}%`, height: '100%', backgroundColor: 'var(--accent-teal)' }} />
                              </div>
                            </div>
                            {/* Party bar */}
                            {!partyHasNoStance && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] w-6 font-bold" style={{ color: partyColorMap[comparisonParty] }}>{comparisonParty}</span>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${(partyDimStance.acceleration / 5) * 100}%`, height: '100%', backgroundColor: partyColorMap[comparisonParty] }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Prot */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            <span>Reglera & Skydda</span>
                            <span>Du: {userDimStance.protection} vs {comparisonParty}: {partyHasNoStance ? '-' : partyDimStance.protection}</span>
                          </div>
                          <div 
                            className="flex flex-col gap-1.5"
                            style={{ 
                              backgroundColor: 'var(--bg-main)', 
                              padding: '12px', 
                              borderRadius: '12px', 
                              border: '1px solid var(--border-color)' 
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] w-6 font-bold" style={{ color: 'var(--accent-coral)' }}>DU</span>
                              <div style={{ flex: 1, height: '6px', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(userDimStance.protection / 5) * 100}%`, height: '100%', backgroundColor: 'var(--accent-coral)' }} />
                              </div>
                            </div>
                            {!partyHasNoStance && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] w-6 font-bold" style={{ color: partyColorMap[comparisonParty] }}>{comparisonParty}</span>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${(partyDimStance.protection / 5) * 100}%`, height: '100%', backgroundColor: partyColorMap[comparisonParty] }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Gov */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            <span>Offentlig Styrning</span>
                            <span>Du: {userDimStance.governance} vs {comparisonParty}: {partyHasNoStance ? '-' : partyDimStance.governance}</span>
                          </div>
                          <div 
                            className="flex flex-col gap-1.5"
                            style={{ 
                              backgroundColor: 'var(--bg-main)', 
                              padding: '12px', 
                              borderRadius: '12px', 
                              border: '1px solid var(--border-color)' 
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] w-6 font-bold" style={{ color: 'var(--accent-purple)' }}>DU</span>
                              <div style={{ flex: 1, height: '6px', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(userDimStance.governance / 5) * 100}%`, height: '100%', backgroundColor: 'var(--accent-purple)' }} />
                              </div>
                            </div>
                            {!partyHasNoStance && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] w-6 font-bold" style={{ color: partyColorMap[comparisonParty] }}>{comparisonParty}</span>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${(partyDimStance.governance / 5) * 100}%`, height: '100%', backgroundColor: partyColorMap[comparisonParty] }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()}

                {/* 2. Deepening Questions list */}
                {(() => {
                  const dimQuestions = compassQuestions.filter(q => q.dimensionId === activeDimensionId);
                  
                  return (
                    <div 
                      className="glass-panel flex flex-col gap-4" 
                      style={{ padding: '28px', borderRadius: '24px', borderTop: '3px solid var(--accent-purple)' }}
                    >
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                          Fördjupa din ståndpunkt
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          Besvara följande valfria fördjupningsfrågor för att precisera din profil i {lockedDimensions.find(ld => ld.id === activeDimensionId)?.name.toLowerCase()}.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {dimQuestions.map(q => {
                          const isAnswered = userStance.answers && userStance.answers[q.id] !== undefined;
                          const selectedOptIdx = isAnswered ? userStance.answers![q.id] : -1;
                          const isExpanded = expandedOptionalQId === q.id;
                          const qWeight = userStance.weights && userStance.weights[q.id] !== undefined ? userStance.weights[q.id] : 1.0;

                          return (
                            <div 
                              key={q.id}
                              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4 flex flex-col gap-3 transition-all duration-200"
                              style={{
                                borderLeft: isAnswered ? '4px solid var(--accent-teal)' : '1px solid var(--border-color)',
                                backgroundColor: isAnswered ? 'rgba(13, 148, 136, 0.015)' : 'var(--bg-main)'
                              }}
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex flex-col gap-1 min-w-0">
                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                                    {q.isOptional ? 'FÖRDJUPNINGSFRÅGA' : 'BASFRÅGA'}
                                  </span>
                                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                    {q.question}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {isAnswered && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleWeight(q.id)}
                                      className="flex items-center gap-1 text-[0.6rem] font-bold px-2 py-0.5 rounded-full border cursor-pointer"
                                      style={{
                                        backgroundColor: qWeight === 2.5 ? 'rgba(255, 69, 36, 0.08)' : 'var(--bg-sidebar)',
                                        color: qWeight === 2.5 ? 'var(--accent-coral)' : 'var(--text-secondary)',
                                        borderColor: qWeight === 2.5 ? 'rgba(255, 69, 36, 0.2)' : 'var(--border-color)',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      {qWeight === 2.5 ? '❤️ Hjärtfråga' : '🟢 Normal'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setExpandedOptionalQId(isExpanded ? null : q.id)}
                                    className="p-1 rounded cursor-pointer"
                                    style={{
                                      background: 'var(--bg-sidebar)',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--text-secondary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                </div>
                              </div>

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
                                    marginTop: '4px'
                                  }}
                                >
                                  ⚠️ Max 3 hjärtfrågor tillåtna. Avmarkera en annan först.
                                </div>
                              )}

                              {/* Selected answer preview */}
                              {isAnswered && !isExpanded && (
                                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, paddingLeft: '8px', borderLeft: '2px solid var(--accent-teal)' }}>
                                  "{q.options[selectedOptIdx].text}"
                                </p>
                              )}

                              {/* Expanded options choices list */}
                              {isExpanded && (
                                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-color)]/50">
                                  {q.options.map((opt, oIdx) => {
                                    const isSelected = selectedOptIdx === oIdx;
                                    return (
                                      <button
                                        key={oIdx}
                                        onClick={() => handleOptionalAnswerSelect(q.id, oIdx)}
                                        className="compass-option-btn text-left p-3 rounded-lg text-xs flex gap-2 cursor-pointer"
                                        style={{
                                          border: '1px solid',
                                          borderColor: isSelected ? 'var(--accent-teal)' : 'var(--border-color)',
                                          backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.04)' : 'var(--bg-card)',
                                          color: isSelected ? 'var(--accent-teal)' : 'var(--text-secondary)',
                                          fontWeight: isSelected ? 700 : 500
                                        }}
                                      >
                                        <div className="compass-option-num flex-shrink-0" style={{ width: '18px', height: '18px', fontSize: '9px' }}>
                                          {isSelected ? '✓' : String.fromCharCode(65 + oIdx)}
                                        </div>
                                        <span>{opt.text}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: PARTY DIMENSION SUMMARIES & INLINE CLAIMS          */}
          {/* ======================================================== */}
          {resultsTab === 'parties' && (
            <div className="compass-results-grid">
              
              {/* Left Column: Dimensions Select List */}
              <div 
                className="glass-panel flex-1 flex flex-col gap-4 overflow-y-auto" 
                style={{ padding: '24px', borderRadius: '24px', borderTop: '3px solid var(--accent-teal)', maxHeight: '680px' }}
              >
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    Politiska områden
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    Välj ett område för att läsa sammanfattningar av vad partierna driver för förslag.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {lockedDimensions.map(d => {
                    const countInDb = claims.filter(c => c.primaryDimension === d.id && c.partyAffiliation !== 'Externt').length;
                    const isSelected = activeSummaryDimensionId === d.id;

                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          setActiveSummaryDimensionId(d.id);
                          setExpandedPartyClaims({});
                        }}
                        className="text-left p-3 border transition-all flex justify-between items-center cursor-pointer"
                        style={{
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent-teal)' : 'var(--border-color)',
                          backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.04)' : 'var(--bg-card)',
                          width: '100%'
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {d.id}. {d.name}
                        </span>
                        <span className="badge badge-gray text-[0.62rem]" style={{ flexShrink: 0 }}>
                          {countInDb} st
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Party Summaries Cards */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '680px' }}>
                {(() => {
                  const summaries = partyDimensionSummaries[activeSummaryDimensionId] || {};
                  
                  return (
                    <div className="flex flex-col gap-4">
                      {/* Section header info */}
                      <div className="glass-panel p-4" style={{ borderRadius: '16px', background: 'rgba(15, 23, 42, 0.02)' }}>
                        <h4 className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>
                          Partiöversikt för: {lockedDimensions.find(ld => ld.id === activeSummaryDimensionId)?.name}
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0, marginTop: '4px' }}>
                          Nedan redovisas partiernas officiella och AI-kategoriserade ståndpunkter. Expandera respektive parti för att läsa de faktiska motionerna i vårt källbibliotek.
                        </p>
                      </div>

                      {/* Loop parties */}
                      {(['S', 'M', 'SD', 'C', 'V', 'MP', 'L', 'KD'] as PartyAffiliation[]).map(p => {
                        const summaryText = summaries[p as Exclude<PartyAffiliation, 'Externt'>] || 'Ingen bedömd sammanfattning tillgänglig för detta område.';
                        const partyColor = partyColorMap[p];
                        const isExpanded = !!expandedPartyClaims[p];
                        const partyClaimsInDim = claims.filter(c => 
                          c.partyAffiliation === p && 
                          !c.nearAiFlag && !c.campaignPracticeFlag && !c.externalPressureFlag &&
                          (c.primaryDimension === activeSummaryDimensionId || c.secondaryDimensions.includes(activeSummaryDimensionId))
                        );

                        return (
                          <div 
                            key={p} 
                            className="glass-panel p-5 rounded-2xl flex flex-col gap-3 transition-all border border-[var(--border-color)]"
                            style={{ borderLeft: `5px solid ${partyColor}` }}
                          >
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-2">
                                <PartyLogo party={p} size={20} />
                                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{partyNames[p]}</span>
                              </div>
                              <span 
                                className="text-[0.62rem] font-bold px-2 py-0.5 rounded"
                                style={{ backgroundColor: `${partyColor}15`, color: partyColor, border: `1px solid ${partyColor}25` }}
                              >
                                {p}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                              {summaryText}
                            </p>

                            {/* Claims count info & Expand button */}
                            <div className="flex justify-between items-center border-t border-[var(--border-color)]/30 pt-3 mt-1 flex-wrap gap-2 text-[0.72rem]">
                              <span className="text-gray-400">
                                Antal riksdagsförslag i databasen: <strong>{partyClaimsInDim.length} st</strong>
                              </span>

                              {partyClaimsInDim.length > 0 ? (
                                <button
                                  onClick={() => togglePartyClaims(p)}
                                  className="text-teal-400 hover:text-teal-300 font-extrabold flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>Dölj riksdagsförslag <ChevronUp size={12} /></>
                                  ) : (
                                    <>Visa riksdagsförslag <ChevronDown size={12} /></>
                                  )}
                                </button>
                              ) : (
                                <span className="text-gray-500 italic">Inga dokumenterade förslag</span>
                              )}
                            </div>

                            {/* Inline display of actual claims */}
                            {isExpanded && partyClaimsInDim.length > 0 && (
                              <div className="flex flex-col gap-2.5 mt-2.5 pt-3 border-t border-dashed border-[var(--border-color)]">
                                {partyClaimsInDim.slice(0, 3).map(claim => {
                                  const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                                  
                                  return (
                                    <div 
                                      key={claim.id} 
                                      className="flex flex-col gap-1.5"
                                      style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--bg-main)',
                                        border: '1px solid var(--border-color)'
                                      }}
                                    >
                                      <div className="flex justify-between items-center text-[0.68rem] flex-wrap gap-1" style={{ color: 'var(--text-muted)' }}>
                                        <span style={{ fontWeight: 800, color: 'var(--accent-teal)' }}>{claim.id} ({claim.date})</span>
                                        <span>Aktör: {claim.actor}</span>
                                      </div>
                                      <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                                        "{claim.originalQuote.length > 180 ? claim.originalQuote.substring(0, 177) + '...' : claim.originalQuote}"
                                      </p>
                                      <div className="flex justify-between items-center text-[0.65rem] flex-wrap gap-2 pt-1" style={{ color: 'var(--text-muted)' }}>
                                        <span>Policygrad: {claim.policyDegree}/3 | Partibäring: {claim.partyBearing}</span>
                                        {sourceUrl && (
                                          <a 
                                            href={sourceUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="hover:underline flex items-center gap-0.5"
                                            style={{ color: 'var(--accent-teal)', fontWeight: 700, textDecoration: 'none' }}
                                          >
                                            {claim.source} <ExternalLink size={10} />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {partyClaimsInDim.length > 3 && (
                                  <button
                                    onClick={() => {
                                      // Search database view
                                      onNavigate('databas');
                                    }}
                                    className="btn btn-secondary text-[0.7rem] py-1.5 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                                  >
                                    Visa alla {partyClaimsInDim.length} förslag i källarkivet <ArrowRight size={11} />
                                  </button>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
};
