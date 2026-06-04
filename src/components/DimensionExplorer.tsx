import React, { useState, useMemo } from 'react';
import { 
  Layers, Heart, CheckCircle, ExternalLink, ChevronDown, 
  ChevronUp, Info, Users, BookOpen, AlertTriangle, Activity
} from 'lucide-react';
import type { ClaimCard, UserStance, PartyAffiliation } from '../types';
import { aggregatePartyProfiles } from '../utils/scoring';
import { PartyLogo } from '../utils/partyAssets';
import { partyColorMap, partyNames } from '../utils/partyConstants';
import { compassQuestions } from '../data/compassQuestions';
import { partyDimensionSummaries } from '../data/partySummaries';
import { lockedDimensions } from '../data/mockClaims';

const dimensionQuestionSummaries: Record<number, string> = {
  1: 'Frågorna handlar om hur Sveriges AI-politik ska ledas nationellt, om staten bör ställa etiska krav vid upphandlingar, hur medborgarna ska ges inflytande, samt om vi ska verka för en gemensam EU-politik eller behålla nationell handlingsfrihet.',
  2: 'Frågorna fokuserar på automatiseringens inverkan på jobb och arbetsmarknad, om staten ska stödja företag ekonomiskt vid AI-implementering, framtidsutsikten för basinkomst/medborgarlön, samt reglering av flexibla anställningsformer i gig-ekonomin.',
  3: 'Frågorna rör statens ansvar för moln- och beräkningsinfrastruktur, hur hälsodata och offentliga register ska delas för AI-träning, om det ska ställas krav på öppen källkod i offentliga system, samt riskerna med att lagra medborgardata hos utländska techbolag.',
  4: 'Frågorna belyser hur tillsynen av EU:s AI Act ska organiseras i Sverige, inställningen till helautomatiserade beslut i förvaltningen, lagstadgad rätt till mänskliga förklaringar av algoritmiska beslut, samt användningen av regulatoriska sandlådor.',
  5: 'Frågorna handlar om integration av AI i välfärden (vård, skola och omsorg), användning av AI-stöd för cancerdiagnostik, om algoritmer självständigt ska få sköta patienttriage i vårdköer, samt automatiserad behovsprövning i socialtjänsten.',
  6: 'Frågorna analyserar hur skolan ska hantera generativ AI i undervisningen, skydd och insyn för anställda som styrs av algoritmer, AI-kompetenskrav vid universitet, samt om fackförbund ska få stöd och vetorätt vid införande av AI.',
  7: 'Frågorna handlar om hur diskriminering och bias i AI-beslut ska motverkas, polisens rätt till ansiktsigenkänning i realtid på allmän plats, tillgänglighetskrav på AI-tjänster för funktionsnedsatta, samt rätten att kräva mänsklig handläggning.',
  8: 'Frågorna berör hanteringen av utländsk informationspåverkan, deepfakes och trollkonton, krav på varningsmärkning av AI-genererad politisk reklam, plattformarnas rättsliga ansvar för sina rekommendationsalgoritmer, samt stöd till granskande medier.',
  9: 'Frågorna handlar om utveckling och användning av autonoma AI-vapen i totalförsvaret, risker med utländska AI-modeller i känsliga svenska verksamheter, statliga krav på IT-säkerhet i kritisk infrastruktur, samt FRA:s underrättelseövervakning.',
  10: 'Frågorna rör kommersiell träning av AI-modeller på upphovsrättsligt svenskt kulturmaterial, anslag till Kungliga Biblioteket för digitalisering, läromedelsförfattares upphovsrättsliga skydd, samt en teknikavgift på utländska techjättar.',
  11: 'Frågorna fokuserar på formerna för statligt stöd och innovationscheckar till techbolag, kommersialisering av akademisk forskning (lärarundantaget), regionala innovationszoner med skattelättnader, samt statligt riskkapital till AI-startups.',
  12: 'Frågorna analyserar techjättars datacenteretablering och energiförbrukning, elskatterabatter för serverhallar, prioritering av elförsörjning mellan AI och traditionell industri, samt användning av AI för att optimera det svenska elnätet.'
};

interface DimensionExplorerProps {
  userStance: UserStance | null;
  onUpdateStance: (stance: UserStance | null) => void;
  claims: ClaimCard[];
  onNavigate: (tab: string) => void;
}

export const DimensionExplorer: React.FC<DimensionExplorerProps> = ({
  userStance,
  onUpdateStance,
  claims,
  onNavigate
}) => {
  const [selectedDimensionId, setSelectedDimensionId] = useState<number>(1);
  const [expandedPartyClaims, setExpandedPartyClaims] = useState<Record<string, boolean>>({});
  const [showWeightWarning, setShowWeightWarning] = useState<number | null>(null);

  // Group and compute party profiles once based on claims
  const partyProfiles = useMemo(() => aggregatePartyProfiles(claims), [claims]);

  // Selected dimension details
  const selectedDimension = useMemo(() => {
    return lockedDimensions.find(d => d.id === selectedDimensionId) || lockedDimensions[0];
  }, [selectedDimensionId]);

  // Questions belonging to this dimension
  const dimensionQuestions = useMemo(() => {
    return compassQuestions.filter(q => q.dimensionId === selectedDimensionId);
  }, [selectedDimensionId]);

  // Helper to recalculate user stance overall scores
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
  const getDimensionStance = (answers: Record<number, number>, weights: Record<number, number>, dimId: number) => {
    const dimQuestions = compassQuestions.filter(q => q.dimensionId === dimId);
    let accelSum = 0;
    let protSum = 0;
    let govSum = 0;
    let weightTotal = 0;

    dimQuestions.forEach(q => {
      if (answers[q.id] !== undefined) {
        const optIdx = answers[q.id];
        const opt = q.options[optIdx];
        const w = weights[q.id] !== undefined ? weights[q.id] : 1.0;
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

  // Helper to calculate compatibility percentage (0-100)
  const calculateCompatibility = (
    userStanceVal: { acceleration: number; protection: number; governance: number },
    partyStanceVal: { acceleration: number; protection: number; governance: number }
  ) => {
    const dAcc = partyStanceVal.acceleration - userStanceVal.acceleration;
    const dProt = partyStanceVal.protection - userStanceVal.protection;
    const dGov = partyStanceVal.governance - userStanceVal.governance;
    
    const distance = Math.sqrt(dAcc * dAcc + dProt * dProt + dGov * dGov);
    const maxDist = 8.66; // max distance in 5x5x5 space
    
    return Math.max(0, Math.round((1 - distance / maxDist) * 100));
  };

  // Answering a question in the explorer
  const handleAnswerSelect = (qId: number, optionIndex: number) => {
    const currentAnswers = userStance?.answers || {};
    const updatedAnswers = {
      ...currentAnswers,
      [qId]: optionIndex
    };

    const currentWeights = userStance?.weights || {};
    const updatedWeights = {
      ...currentWeights,
      [qId]: currentWeights[qId] !== undefined ? currentWeights[qId] : 1.0
    };

    const isOptional = compassQuestions.find(q => q.id === qId)?.isOptional;
    const completedOptionalIds = userStance?.completedOptionalIds || [];
    const updatedOptionalIds = isOptional
      ? Array.from(new Set([...completedOptionalIds, qId]))
      : completedOptionalIds;

    const updatedScores = recalculateStance(updatedAnswers, updatedWeights);

    onUpdateStance({
      ...updatedScores,
      answers: updatedAnswers,
      completedOptionalIds: updatedOptionalIds,
      weights: updatedWeights,
      schemaVersion: 'v4.0'
    });
  };

  // Toggle weighting for heart questions
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

  // Get compatibility details for all parties on this dimension
  const partyDimensionAlignments = useMemo(() => {
    const answers = userStance?.answers || {};
    const weights = userStance?.weights || {};
    
    const userDimStance = getDimensionStance(answers, weights, selectedDimensionId);
    const totalAnswered = dimensionQuestions.filter(q => answers[q.id] !== undefined).length;
    const hasAnyAnswer = totalAnswered > 0;

    return partyProfiles.map(p => {
      const partyStance = p.dimensionStanceScores?.[selectedDimensionId] || { acceleration: 0, protection: 0, governance: 0 };
      const hasNoStance = p.dimensionClaimsCount[selectedDimensionId] === 0;
      
      const comp = hasAnyAnswer && !hasNoStance 
        ? calculateCompatibility(userDimStance, partyStance) 
        : -1;

      return {
        party: p.party,
        compatibility: comp,
        stance: partyStance,
        hasNoStance,
        claimsCount: p.dimensionClaimsCount[selectedDimensionId]
      };
    }).sort((a, b) => b.compatibility - a.compatibility);
  }, [userStance, selectedDimensionId, dimensionQuestions, partyProfiles]);

  // Claims for this dimension
  const dimensionClaims = useMemo(() => {
    return claims.filter(c => 
      c.primaryDimension === selectedDimensionId || 
      c.secondaryDimensions.includes(selectedDimensionId)
    );
  }, [claims, selectedDimensionId]);

  // Group claims by party
  const claimsByParty = useMemo(() => {
    const grouped: Record<string, ClaimCard[]> = {};
    dimensionClaims.forEach(c => {
      const party = c.partyAffiliation;
      if (!grouped[party]) {
        grouped[party] = [];
      }
      grouped[party].push(c);
    });
    // Sort claims inside each group by date (newest first)
    Object.keys(grouped).forEach(k => {
      grouped[k].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    return grouped;
  }, [dimensionClaims]);

  // Check how many questions inside the dimension are completed by the user
  const getDimensionProgress = (dimId: number) => {
    const dimQuestions = compassQuestions.filter(q => q.dimensionId === dimId);
    const answers = userStance?.answers || {};
    const answeredCount = dimQuestions.filter(q => answers[q.id] !== undefined).length;
    return {
      answered: answeredCount,
      total: dimQuestions.length
    };
  };

  const togglePartyClaims = (partyKey: string) => {
    setExpandedPartyClaims(prev => ({
      ...prev,
      [partyKey]: !prev[partyKey]
    }));
  };

  return (
    <div className="animate-slide flex flex-col gap-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title flex items-center gap-3">
            <Layers className="text-teal-400 ai-glow" size={28} />
            De 12 dimensionerna
          </h1>
          <p className="page-subtitle">
            En pedagogisk djupdykning i de 12 sakpolitiska dimensionerna som definierar AI-debatten i Sverige. Utforska sakfrågor, se partiernas ställningstaganden och gör din röst hörd.
          </p>
        </div>
      </div>

      <div className="dimension-explorer-layout">
        {/* Left Side: Dimension Navigation Drawer */}
        <aside className="dimension-sidebar-nav">
          <div className="dimension-sidebar-header">
            <BookOpen size={16} />
            Välj dimension att utforska
          </div>
          <div className="dimension-sidebar-list">
            {lockedDimensions.map(d => {
              const isActive = d.id === selectedDimensionId;
              const progress = getDimensionProgress(d.id);
              const isFullyAnswered = progress.answered === progress.total;

              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDimensionId(d.id);
                    setShowWeightWarning(null);
                  }}
                  className={`dimension-nav-button ${isActive ? 'active' : ''}`}
                >
                  <div className="dimension-nav-num">
                    {d.id}
                  </div>
                  <div className="dimension-nav-details">
                    <span className="dimension-nav-name">{d.name}</span>
                    <span className="dimension-nav-progress">
                      {progress.answered > 0 ? (
                        <span className={`progress-badge ${isFullyAnswered ? 'complete' : 'partial'}`}>
                          {progress.answered}/{progress.total} besvarade
                        </span>
                      ) : (
                        <span className="progress-badge empty">
                          Ubesvarad ({progress.total} frågor)
                        </span>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Side: Dimension Content Explorer */}
        <div className="dimension-content-area flex flex-col gap-6">
          
          {/* Section: Dimension Intro */}
          <section className="glass-panel p-6 border-accent" style={{ borderTop: '3px solid var(--accent-teal)' }}>
            <span className="dimension-id-tag">Dimension {selectedDimension.id} av 12</span>
            <h2 className="dimension-title">{selectedDimension.name}</h2>
            <p className="dimension-description">{selectedDimension.description}</p>
            
            <div className="dimension-questions-summary mt-4 pt-3 border-t border-[var(--border-color)]">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] mb-1">
                <Info size={14} className="text-teal-400" />
                Vad handlar frågorna inom dimensionen om?
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed" style={{ margin: 0 }}>
                {dimensionQuestionSummaries[selectedDimension.id]}
              </p>
            </div>
          </section>

          {/* Section: Interactive Questionnaire */}
          <section className="glass-panel p-6">
            <h3 className="section-title-icon flex items-center gap-2">
              <Activity size={18} className="text-teal-400" />
              1. Hur ställer du dig själv?
            </h3>
            
            <div className="flex justify-between items-center gap-4 flex-wrap mb-4 pb-4 border-b border-[var(--border-color)]">
              <p className="section-subtitle" style={{ margin: 0, flex: 1, minWidth: '240px' }}>
                Svara på frågorna inom denna dimension för att bygga och förfina din egen politiska AI-profil. Dina svar synkas direkt med AI-kompassen.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('kompassen')}
                className="btn btn-secondary flex items-center gap-1.5"
                style={{ padding: '8px 14px', fontSize: '0.75rem', minHeight: 'auto', borderRadius: '8px' }}
              >
                Gör fullständigt test →
              </button>
            </div>

            <div className="dimension-questions-list flex flex-col gap-6 mt-4">
              {dimensionQuestions.map((q) => {
                const isAnswered = userStance?.answers && userStance.answers[q.id] !== undefined;
                const selectedOptIdx = isAnswered ? userStance!.answers![q.id] : -1;
                const isOptional = q.isOptional;
                const weight = userStance?.weights?.[q.id] || 1.0;
                const isHeart = weight === 2.5;

                return (
                  <div key={q.id} className="dimension-question-card glass-panel p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="question-badge">
                          {isOptional ? 'Valfri fördjupningsfråga' : 'Grundläggande kompassfråga'}
                        </span>
                        <h4 className="question-text">{q.question}</h4>
                      </div>
                      
                      {/* Heart (Hjärtfråga) button */}
                      {userStance && (
                        <button
                          type="button"
                          onClick={() => handleToggleWeight(q.id)}
                          className={`heart-btn ${isHeart ? 'active' : ''}`}
                          title={isHeart ? 'Avmarkera som hjärtfråga' : 'Markera som hjärtfråga (viktas 2.5x)'}
                        >
                          <Heart size={16} fill={isHeart ? 'currentColor' : 'none'} />
                        </button>
                      )}
                    </div>

                    {showWeightWarning === q.id && (
                      <div className="weight-warning-alert">
                        <AlertTriangle size={14} />
                        Du kan max välja 3 hjärtfrågor totalt i din profil för att behålla ett tydligt resultat. Avmarkera en annan fråga först under "AI-kompassen" eller i en annan dimension.
                      </div>
                    )}

                    {/* Radio Options */}
                    <div className="options-grid mt-4 flex flex-col gap-2.5">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = selectedOptIdx === oIdx;
                        return (
                          <button
                            type="button"
                            key={oIdx}
                            onClick={() => handleAnswerSelect(q.id, oIdx)}
                            className={`dimension-option-row ${isSelected ? 'selected' : ''}`}
                          >
                            <span className="option-indicator">
                              {isSelected && <CheckCircle size={14} className="text-teal-400" />}
                            </span>
                            <span className="option-text">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section: Political landscape and Party summaries */}
          <section className="glass-panel p-6">
            <h3 className="section-title-icon flex items-center gap-2">
              <Users size={18} className="text-purple-400" />
              2. Det politiska landskapet
            </h3>
            <p className="section-subtitle">
              Se var partierna står och hur väl din profil matchar dem inom just den här dimensionen.
            </p>

            <div className="party-alignments-list flex flex-col gap-4 mt-6">
              {partyDimensionAlignments.map(({ party, compatibility, stance, hasNoStance, claimsCount }) => {
                const partyColor = partyColorMap[party] || 'var(--accent-teal)';
                const partyName = partyNames[party] || party;
                const summary = partyDimensionSummaries[selectedDimensionId]?.[party as Exclude<PartyAffiliation, 'Externt'>] || 'Sammanfattning saknas för detta parti.';

                return (
                  <div key={party} className="party-alignment-row glass-panel p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Party Info */}
                      <div className="flex items-center gap-3">
                        <div 
                          className="party-avatar"
                          style={{ borderColor: partyColor, boxShadow: `0 0 10px ${partyColor}1a` }}
                        >
                          <PartyLogo party={party} size={24} />
                        </div>
                        <div>
                          <h4 className="party-name-title">{partyName}</h4>
                          <span className="claims-count-badge">
                            {claimsCount} källbelagda ställningstaganden
                          </span>
                        </div>
                      </div>

                      {/* Compatibility score or stance values */}
                      <div className="flex items-center gap-4 sm:self-center">
                        {compatibility >= 0 ? (
                          <div className="compatibility-score-container">
                            <span className="compatibility-label">Din matchning</span>
                            <span 
                              className="compatibility-percentage"
                              style={{ color: compatibility >= 70 ? 'var(--accent-teal)' : compatibility >= 40 ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                            >
                              {compatibility}%
                            </span>
                          </div>
                        ) : (
                          <div className="compatibility-score-container">
                            <span className="compatibility-label">Partiprofil</span>
                            <span className="compatibility-no-stance">
                              {hasNoStance ? 'Ingen data' : 'Svara på frågor för matchning'}
                            </span>
                          </div>
                        )}
                        
                        {!hasNoStance && (
                          <div className="stance-values-mini">
                            <span className="stance-dot" style={{ backgroundColor: 'var(--accent-teal)' }} title={`Främja: ${stance.acceleration}`}></span>
                            <span className="stance-dot" style={{ backgroundColor: 'var(--accent-coral)' }} title={`Skydda: ${stance.protection}`}></span>
                            <span className="stance-dot" style={{ backgroundColor: 'var(--accent-purple)' }} title={`Styrning: ${stance.governance}`}></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Party Summary */}
                    <div className="party-dimension-summary mt-3">
                      <p className="summary-paragraph">
                        {summary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section: Deep-dive sources and claims */}
          <section className="glass-panel p-6">
            <h3 className="section-title-icon flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" />
              3. Källor & Ställningstaganden i databasen
            </h3>
            <p className="section-subtitle">
              Granska de exakta motionerna, budgeterna och debatterna som ligger till grund för partiernas betyg i denna dimension.
            </p>

            {dimensionClaims.length === 0 ? (
              <div className="empty-state-card mt-6">
                <Info size={24} className="text-gray-400" />
                <p>Det finns inga registrerade ställningstaganden i databasen för denna dimension än.</p>
              </div>
            ) : (
              <div className="claims-party-groups mt-6 flex flex-col gap-4">
                {Object.entries(claimsByParty).map(([party, partyClaims]) => {
                  const partyColor = partyColorMap[party as PartyAffiliation] || 'var(--accent-teal)';
                  const partyName = partyNames[party as PartyAffiliation] || party;
                  const isExpanded = !!expandedPartyClaims[party];

                  return (
                    <div 
                      key={party} 
                      className="party-claims-group-card glass-panel"
                      style={{ borderLeft: `4px solid ${partyColor}` }}
                    >
                      {/* Group Header */}
                      <button
                        onClick={() => togglePartyClaims(party)}
                        className="group-header-btn"
                      >
                        <div className="flex items-center gap-3">
                          <PartyLogo party={party as PartyAffiliation} size={20} />
                          <span className="group-title-text">{partyName} ({partyClaims.length})</span>
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {/* Claims List inside Group */}
                      {isExpanded && (
                        <div className="group-claims-list p-4 flex flex-col gap-4">
                          {partyClaims.map(c => (
                            <div key={c.id} className="claim-card-detail glass-panel p-3">
                              <div className="flex justify-between items-start gap-2 flex-wrap">
                                <span className="claim-actor-badge">
                                  {c.actor} ({c.actorType})
                                </span>
                                <span className="claim-date-badge">{c.date}</span>
                              </div>
                              
                              <p className="claim-quote-text">
                                "{c.originalQuote}"
                              </p>
                              
                              <div className="claim-source-details mt-3 pt-2 border-t border-[var(--border-color)] flex justify-between items-center flex-wrap gap-2 text-xs">
                                <div>
                                  <span className="text-[var(--text-muted)]">Källa: </span>
                                  <span className="font-bold text-[var(--text-secondary)]">{c.source} ({c.sourceType})</span>
                                </div>
                                {c.sourceUrl && (
                                  <a 
                                    href={c.sourceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="source-link flex items-center gap-1"
                                  >
                                    Öppna källa <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>

                              <div className="claim-scores-badges mt-2 flex flex-wrap gap-1.5">
                                <span className="badge-score-pill acc" title="Bidrag till Främja-index">
                                  🚀 Främja: {c.accelerationContribution}
                                </span>
                                <span className="badge-score-pill prot" title="Bidrag till Skydda-index">
                                  🛡️ Skydda: {c.protectionContribution}
                                </span>
                                <span className="badge-score-pill gov" title="Bidrag till Offentlig Styrning-index">
                                  🏛️ Styrning: {c.stateGovernanceContribution}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
