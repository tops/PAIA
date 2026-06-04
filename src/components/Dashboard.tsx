import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ClaimCard, PartyAffiliation, UserStance } from '../types';
import { PartyLogo } from '../utils/partyAssets';
import { partyColorMap, partyNames } from '../utils/partyConstants';
import { aggregatePartyProfiles, performGapAnalysis, calculateClaimWeight, calculateClaimWeightsMap, evaluatePartyStanceStatus, isPolicyClaim } from '../utils/scoring';
import { lockedDimensions } from '../data/mockClaims';
import { 
  TrendingUp, AlertCircle, ShieldAlert, Award, FileText, 
  CheckCircle, ArrowRight, X, Calendar, Users, PieChart, Search, ExternalLink,
  Info, ChevronDown, ChevronUp
} from 'lucide-react';

interface DashboardProps {
  claims: ClaimCard[];
  onSelectParty: (party: PartyAffiliation) => void;
  onNavigate: (tab: string) => void;
  onEditClaim?: (claim: ClaimCard) => void;
  userStance?: UserStance | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  claims, 
  onSelectParty, 
  onNavigate, 
  onEditClaim,
  userStance
}) => {
  const partyProfiles = aggregatePartyProfiles(claims);
  const gapAnalysis = performGapAnalysis(claims);

  // Precompute weights map and total weight per party to normalize relative focus
  const weightsMap = useMemo(() => calculateClaimWeightsMap(claims), [claims]);
  const partyTotalWeights = useMemo(() => {
    const weights: Record<PartyAffiliation, number> = {
      S: 0, M: 0, SD: 0, C: 0, V: 0, MP: 0, L: 0, KD: 0, Externt: 0
    };
    claims.forEach(c => {
      if (isPolicyClaim(c)) {
        weights[c.partyAffiliation] = (weights[c.partyAffiliation] || 0) + (weightsMap.get(c.id) ?? 0);
      }
    });
    return weights;
  }, [claims, weightsMap]);

  // Removed local duplicate partyNames dictionary

  // Find dynamic insights
  const silentIssue = gapAnalysis.find(g => g.conclusion === 'Tyst valfråga med möjlig sprängkraft') || 
                       gapAnalysis.find(g => g.conclusion === 'Underutvecklad partipolitik') ||
                       gapAnalysis.find(g => g.conclusion === 'Blind fläck') ||
                       gapAnalysis[0];

  const sortedByAccel = [...partyProfiles].sort((a, b) => b.accelerationScore - a.accelerationScore);
  const mostAccelParty = sortedByAccel[0];
  const sortedByProt = [...partyProfiles].sort((a, b) => b.protectionScore - a.protectionScore);
  const mostProtParty = sortedByProt[0];

  // Timeline visualization state
  const [selectedTimelineClaim, setSelectedTimelineClaim] = useState<ClaimCard | null>(null);
  const [hoveredTimelineClaim, setHoveredTimelineClaim] = useState<ClaimCard | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const [hoveredHeaderTooltip, setHoveredHeaderTooltip] = useState<string | null>(null);
  const [headerTooltipPos, setHeaderTooltipPos] = useState({ x: 0, y: 0 });
  const [showMathDetails, setShowMathDetails] = useState<boolean>(false);
  const [gapSortBy, setGapSortBy] = useState<'id' | 'agenda' | 'response' | 'gap'>('id');
  const [gapSortOrder, setGapSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: 'id' | 'agenda' | 'response' | 'gap') => {
    if (gapSortBy === column) {
      setGapSortOrder(gapSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setGapSortBy(column);
      setGapSortOrder(column === 'agenda' || column === 'response' ? 'desc' : 'asc');
    }
  };

  const handleHeaderMouseEnter = (e: React.MouseEvent<HTMLElement>, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHeaderTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
    setHoveredHeaderTooltip(text);
  };

  const handleHeaderMouseLeave = () => {
    setHoveredHeaderTooltip(null);
  };

  // Actor exploring states
  const [showAllActorsModal, setShowAllActorsModal] = useState<boolean>(false);
  const [selectedActorClaims, setSelectedActorClaims] = useState<string | null>(null);
  const [actorSearchQuery, setActorSearchQuery] = useState<string>('');

  // Dimension exploring states
  const [selectedDimensionId, setSelectedDimensionId] = useState<number | null>(null);
  const [activeDimensionTab, setActiveDimensionTab] = useState<string>('S');
  const [valkartaDimensionId, setValkartaDimensionId] = useState<'all' | number>('all');

  const sortedGapAnalysis = useMemo(() => {
    return [...gapAnalysis].sort((a, b) => {
      let valA: any = a.dimensionId;
      let valB: any = b.dimensionId;
      
      if (gapSortBy === 'agenda') {
        valA = a.agendaPressure;
        valB = b.agendaPressure;
      } else if (gapSortBy === 'response') {
        valA = a.partyResponse;
        valB = b.partyResponse;
      } else if (gapSortBy === 'gap') {
        valA = a.conclusion;
        valB = b.conclusion;
      }
      
      if (valA < valB) return gapSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return gapSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [gapAnalysis, gapSortBy, gapSortOrder]);

  // Quick stats
  const totalClaims = claims.length;
  const reviewedClaims = claims.filter(c => ['Granskad', 'Kalibrerad', 'Låst'].includes(c.reviewStatus)).length;
  
  // Find highest agenda pressure
  const highestAgenda = [...gapAnalysis].sort((a, b) => b.agendaPressure - a.agendaPressure)[0];
  
  const handlePartyDotClick = (party: PartyAffiliation) => {
    onSelectParty(party);
    onNavigate('profiler');
  };

  // SVG grid coordinate constants
  const size = 450;
  const padding = 50;
  const graphSize = size - padding * 2; // 350px

  const getXCoord = (score: number) => padding + (score / 5) * graphSize;
  const getYCoord = (score: number) => size - padding - (score / 5) * graphSize;

  // Removed local duplicate partyColorMap dictionary

  const getTopActors = (claims: ClaimCard[], limit = 5) => {
    const actorMap = new Map<string, { party: string; count: number; totalEvidence: number }>();
    claims.forEach(c => {
      if (!c.actor) return;
      const key = c.actor.trim();
      if (!actorMap.has(key)) {
        actorMap.set(key, { 
          party: c.partyAffiliation, 
          count: 0, 
          totalEvidence: 0 
        });
      }
      const current = actorMap.get(key)!;
      current.count += 1;
      current.totalEvidence += c.evidenceStrength || 3;
      current.party = c.partyAffiliation;
    });
    
    return Array.from(actorMap.entries())
      .map(([actor, stats]) => ({
        actor,
        party: stats.party,
        claimCount: stats.count,
        avgEvidence: Math.round((stats.totalEvidence / stats.count) * 10) / 10
      }))
      .sort((a, b) => b.claimCount - a.claimCount || b.avgEvidence - a.avgEvidence)
      .slice(0, limit);
  };

  const getSourceStats = (claims: ClaimCard[]) => {
    const sourceMap = new Map<string, number>();
    claims.forEach(c => {
      const key = c.sourceType || 'Okänd';
      sourceMap.set(key, (sourceMap.get(key) || 0) + 1);
    });
    
    return Array.from(sourceMap.entries())
      .map(([sourceType, count]) => ({
        sourceType,
        count,
        percent: Math.round((count / claims.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getPartyStancesInDimension = (dimId: number) => {
    const parties: PartyAffiliation[] = ['S', 'M', 'SD', 'C', 'V', 'MP', 'L', 'KD'];
    
    return parties.map(party => {
      const partyClaimsInDim = claims.filter(c => 
        isPolicyClaim(c) && 
        c.partyAffiliation === party && 
        (c.primaryDimension === dimId || c.secondaryDimensions.includes(dimId))
      );
      
      const count = partyClaimsInDim.length;
      let totalWeight = 0;
      let accelSum = 0;
      let protSum = 0;
      let govSum = 0;

      partyClaimsInDim.forEach(c => {
        const w = weightsMap.get(c.id) ?? calculateClaimWeight(c);
        totalWeight += w;
        accelSum += c.accelerationContribution || 0;
        protSum += c.protectionContribution || 0;
        govSum += c.stateGovernanceContribution || 0;
      });

      const status = evaluatePartyStanceStatus(partyClaimsInDim, totalWeight);
      
      const partyTotal = partyTotalWeights[party] || 0;
      const relativeFocus = partyTotal > 0 ? totalWeight / partyTotal : 0;
      
      return {
        party,
        status,
        count,
        totalWeight: Math.round(totalWeight * 10) / 10,
        relativeFocus: relativeFocus,
        avgAccel: count > 0 ? Math.round((accelSum / count) * 10) / 10 : 0,
        avgProt: count > 0 ? Math.round((protSum / count) * 10) / 10 : 0,
        avgGov: count > 0 ? Math.round((govSum / count) * 10) / 10 : 0,
        claims: partyClaimsInDim.sort((a, b) => b.date.localeCompare(a.date))
      };
    });
  };

  const getDrivingPartyInDimension = (dimId: number) => {
    const stances = getPartyStancesInDimension(dimId);
    const activeStances = stances.filter(s => s.count > 0);
    if (activeStances.length === 0) return null;
    
    // Sort by relativeFocus (profiling focus share) first, then totalWeight, then count
    const sorted = [...activeStances].sort((a, b) => {
      if (b.relativeFocus !== a.relativeFocus) return b.relativeFocus - a.relativeFocus;
      if (b.totalWeight !== a.totalWeight) return b.totalWeight - a.totalWeight;
      return b.count - a.count;
    });
    
    const runnerUp = sorted[1] || null;
    
    return {
      leader: sorted[0],
      runnerUp: runnerUp
    };
  };

  const getMostProposalsPartyInDimension = (dimId: number) => {
    const stances = getPartyStancesInDimension(dimId);
    const activeStances = stances.filter(s => s.count > 0);
    if (activeStances.length === 0) return null;
    
    // Sort by count (claim count) first, then totalWeight
    const sorted = [...activeStances].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.totalWeight - a.totalWeight;
    });
    
    return sorted[0];
  };

  return (
    <div className="animate-slide flex flex-col gap-8">
      {/* Page Header */}
      <div className="page-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '10px' }}>
        <div className="page-header-info">
          <h1 className="page-title" style={{ fontSize: '2.2rem', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '6px' }}>Politisk AI-analys</h1>
          <p className="page-subtitle" style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: '1.6' }}>
            Partipolitiskt oberoende granskning och medborgarguide. Vi använder AI-modeller för att analysera och kategorisera riksdagsledamöternas motioner, regeringsbeslut och offentliga utspel för att belysa var partierna står i viktiga AI-frågor inför riksdagsvalet 2026.
          </p>
        </div>
        <div className="status-indicator" style={{ border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
          <span className="sidebar-logo-indicator ai-glow" style={{ backgroundColor: 'var(--accent-teal)' }}></span>
          DATABASEN REGELBUNDET UPPDATERAD
        </div>
      </div>

      {/* AI Usage Disclaimer & Citizen Guide */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--accent-coral)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(239, 68, 68, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-coral)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Viktig information om AI-analysen
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
          Detta verktyg använder avancerad AI-teknik för att koda, poängsätta och sammanfatta tusentals sidor av politisk text. AI-analyser är inte perfekta och kan feltolka subtila politiska nyanser eller göra sakfel. Tjänsten ska ses som ett interaktivt hjälpmedel för att navigera i debatten. Vi uppmuntrar alla väljare att använda länkarna till originaldokumenten för att själva läsa källorna och bilda sig en egen, självständig uppfattning.
        </p>
      </div>

      {/* Journalistic Introduction & Discovery Guide */}
      <div className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid var(--accent-teal)', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(15, 23, 42, 0.015)' }}>
        <div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Introduktion & Medborgarguide
          </span>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 600, marginTop: '4px', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
            Hur vill du börja undersöka partiernas AI-politik?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            Politisk AI-analys hjälper dig att tränga igenom det politiska bruset. Vi har brutit ner komplexa riksdagsdokument till konkreta påståenden och kartlagt dem. Här är tre rekommenderade vägar för att börja utforska:
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '4px' }}>
          {/* Pathway 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              <span style={{ fontSize: '1.2rem' }}>🗺️</span> 1. Upptäck AI-Valkartan
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', flexGrow: 1 }}>
              Titta på spridningen i koordinatsystemet nedan. Partiernas positioner beräknas live utifrån deras motioner och lagförslag som analyserats med hjälp av AI. Klicka på cirklarna för att öppna partiernas ställningstaganden.
            </p>
            <a href="#valkartan-anchor" className="btn btn-secondary text-xs" style={{ textDecoration: 'none', textAlign: 'center', padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-teal)', display: 'inline-block', marginTop: '8px' }}>
              Se Valkartan nedan
            </a>
          </div>

          {/* Pathway 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              <span style={{ fontSize: '1.2rem' }}>⚖️</span> 2. Gör AI-Kompassen
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', flexGrow: 1 }}>
              Svara på 12 korta påståenden om AI-reglering, statlig styrning och innovationsstöd för att klassificera din egen ståndpunkt och se vilket riksdagsparti du matchar bäst enligt AI-kategoriseringen.
            </p>
            <button onClick={() => onNavigate('kompassen')} className="btn btn-primary text-xs" style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, marginTop: '8px' }}>
              Matcha dina åsikter →
            </button>
          </div>

          {/* Pathway 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              <span style={{ fontSize: '1.2rem' }}>🔍</span> 3. Gräv i källbiblioteket
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', flexGrow: 1 }}>
              Vill du granska vårt underlag? Läs de faktiska riksdagsdokumenten, propositionerna och citaten bakom partiernas index. Sök bland alla {totalClaims} påståenden i vårt transparenta källarkiv.
            </p>
            <button onClick={() => onNavigate('databas')} className="btn btn-secondary text-xs" style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, marginTop: '8px' }}>
              Öppna källarkivet →
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="stats-row">
        <div className="glass-panel stats-card">
          <div className="stats-card-icon" style={{ backgroundColor: 'rgba(0, 230, 207, 0.08)', color: 'var(--accent-teal)', border: '1px solid rgba(0, 230, 207, 0.15)' }}>
            <FileText size={22} />
          </div>
          <div className="flex flex-col">
            <div className="stats-card-value">{totalClaims}</div>
            <div className="stats-card-label">Analyserade uttalanden</div>
          </div>
        </div>

        <div className="glass-panel stats-card">
          <div className="stats-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="flex flex-col">
            <div className="stats-card-value">{reviewedClaims}</div>
            <div className="stats-card-label">Verifierade källor</div>
          </div>
        </div>

        <div className="glass-panel stats-card">
          <div className="stats-card-icon" style={{ backgroundColor: 'rgba(255, 69, 36, 0.08)', color: 'var(--accent-coral)', border: '1px solid rgba(255, 69, 36, 0.15)' }}>
            <AlertCircle size={22} />
          </div>
          <div className="flex flex-col">
            <div className="stats-card-value" style={{ fontSize: '1.05rem', fontWeight: 800, paddingBottom: '4px' }}>
              {highestAgenda ? highestAgenda.dimensionName.substring(0, 16) + '...' : 'Ingen'}
            </div>
            <div className="stats-card-label">Hetaste AI-frågan</div>
          </div>
        </div>

        <div className="glass-panel stats-card">
          <div className="stats-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
            <Users size={22} />
          </div>
          <div className="flex flex-col">
            <div className="stats-card-value">
              {getTopActors(claims, 1000).length} st
            </div>
            <div className="stats-card-label">Aktiva politiker & experter</div>
          </div>
        </div>
      </div>

      {/* Grid: SVG Plot and Analytical Insights */}
      <div id="valkartan-anchor" className="dashboard-grid">
        {/* SVG Plot Panel */}
        <div className="glass-panel p-6 flex flex-col gap-6" style={{ borderTop: '3px solid var(--accent-teal)' }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Valkartan: Politisk AI-analys</h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Här ser du partiernas ställningstaganden kartlagda på två huvudaxlar. Klicka på partiernas cirklar för att läsa mer!
            </p>
          </div>

          <div className="flex flex-col gap-1.5" style={{ paddingBottom: '4px' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Filtrera kartan per ämnesområde:
            </label>
            <select
              value={valkartaDimensionId}
              onChange={(e) => {
                const val = e.target.value;
                setValkartaDimensionId(val === 'all' ? 'all' : Number(val));
              }}
              className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--accent-teal)] cursor-pointer"
              style={{ width: '100%' }}
            >
              <option value="all">Alla områden (Övergripande position)</option>
              {lockedDimensions.map(d => (
                <option key={d.id} value={d.id}>
                  {d.id}. {d.name}
                </option>
              ))}
            </select>
            {valkartaDimensionId !== 'all' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', padding: '4px 6px 0px 6px' }}>
                <span>
                  Visar positioner för: <strong>{valkartaDimensionId}. {lockedDimensions.find(ld => ld.id === valkartaDimensionId)?.name}</strong>
                </span>
                <button 
                  onClick={() => setValkartaDimensionId('all')}
                  className="text-sky-600 hover:underline font-bold"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.72rem' }}
                >
                  Återställ vy
                </button>
              </div>
            )}
          </div>

          <div className="svg-plot-container">
            <svg 
              viewBox={`0 0 ${size} ${size}`} 
              className="w-full h-auto"
              style={{ display: 'block' }}
            >
              {/* Definitions for SVG gradients */}
              <defs>
                <radialGradient id="teal-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="coral-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--accent-coral)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--accent-coral)" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Gridlines */}
              {[1, 2, 3, 4].map(tick => (
                <g key={tick}>
                  {/* Vertical lines */}
                  <line 
                    x1={getXCoord(tick)} 
                    y1={padding} 
                    x2={getXCoord(tick)} 
                    y2={size - padding} 
                    className="svg-grid-line" 
                  />
                  {/* Horizontal lines */}
                  <line 
                    x1={padding} 
                    y1={getYCoord(tick)} 
                    x2={size - padding} 
                    y2={getYCoord(tick)} 
                    className="svg-grid-line" 
                  />
                </g>
              ))}

              {/* Center Crosshairs */}
              <line 
                x1={size / 2} 
                y1={padding} 
                x2={size / 2} 
                y2={size - padding} 
                className="svg-crosshair-line" 
              />
              <line 
                x1={padding} 
                y1={size / 2} 
                x2={size - padding} 
                y2={size / 2} 
                className="svg-crosshair-line" 
              />

              {/* Glowing Corner Quadrants (Background) */}
              <rect x={padding} y={padding} width={graphSize/2} height={graphSize/2} fill="url(#coral-glow)" pointerEvents="none" />
              <rect x={size/2} y={size/2} width={graphSize/2} height={graphSize/2} fill="url(#teal-glow)" pointerEvents="none" />

              {/* Boundary frame */}
              <rect 
                x={padding} 
                y={padding} 
                width={graphSize} 
                height={graphSize} 
                fill="none" 
                stroke="var(--border-color)" 
                strokeWidth={1}
              />

              {/* Quadrant Heading labels */}
              <text x={padding + 10} y={padding + 22} className="svg-axis-label" textAnchor="start">Reglering & Riskfokus</text>
              <text x={size - padding - 10} y={padding + 22} className="svg-axis-label" textAnchor="end">Statligt ledd utveckling</text>
              <text x={padding + 10} y={size - padding - 10} className="svg-axis-label" textAnchor="start">Försiktig inställning</text>
              <text x={size - padding - 10} y={size - padding - 10} className="svg-axis-label" textAnchor="end">Fri marknad & Innovation</text>

              {/* Outer Axis Title Labels */}
              <text x={size / 2} y={size - 14} className="svg-axis-heading" textAnchor="middle">Snabba på & Främja AI &rarr;</text>
              <text x={18} y={size / 2} className="svg-axis-heading" textAnchor="middle" transform={`rotate(-90 18 ${size/2})`}>Lagar, Säkerhet & Styrning &rarr;</text>

              {/* Party & User Dots (Cluster-based Layout to avoid overlap) */}
              {(() => {
                // 1. Gather all party nodes
                interface ValkartanNode {
                  id: string;
                  isUser: boolean;
                  party: PartyAffiliation | undefined;
                  status: string;
                  claimCount: number;
                  origX: number;
                  origY: number;
                  x: number;
                  y: number;
                }

                const rawNodes: ValkartanNode[] = (() => {
                  if (valkartaDimensionId === 'all') {
                    const tempNodes: ValkartanNode[] = partyProfiles
                      .filter(p => !(p.status === 'Ingen bedömning' && p.accelerationScore === 0 && p.protectionScore === 0))
                      .map(p => {
                        const yVal = (p.protectionScore + p.governanceScore) / 2;
                        return {
                          id: p.party as string,
                          isUser: false,
                          party: p.party,
                          status: p.status,
                          claimCount: p.claimCount,
                          origX: getXCoord(p.accelerationScore),
                          origY: getYCoord(yVal),
                          x: getXCoord(p.accelerationScore),
                          y: getYCoord(yVal)
                        };
                      });

                    // 2. Add user stance if active and fully calculated
                    if (
                      userStance &&
                      typeof userStance.accelerationScore === 'number' &&
                      !isNaN(userStance.accelerationScore) &&
                      typeof userStance.protectionScore === 'number' &&
                      !isNaN(userStance.protectionScore) &&
                      typeof userStance.governanceScore === 'number' &&
                      !isNaN(userStance.governanceScore)
                    ) {
                      const yVal = (userStance.protectionScore + userStance.governanceScore) / 2;
                      tempNodes.push({
                        id: 'USER',
                        isUser: true,
                        party: undefined,
                        status: 'Ditt resultat',
                        claimCount: 0,
                        origX: getXCoord(userStance.accelerationScore),
                        origY: getYCoord(yVal),
                        x: getXCoord(userStance.accelerationScore),
                        y: getYCoord(yVal)
                      });
                    }
                    return tempNodes;
                  } else {
                    // Specific dimension plotting
                    const stances = getPartyStancesInDimension(valkartaDimensionId);
                    
                    // Plot only parties that have claims in this dimension to avoid center stacking
                    return stances
                      .filter(s => s.count > 0)
                      .map(s => {
                        const yVal = (s.avgProt + s.avgGov) / 2;
                        return {
                          id: s.party as string,
                          isUser: false,
                          party: s.party,
                          status: s.status,
                          claimCount: s.count,
                          origX: getXCoord(s.avgAccel),
                          origY: getYCoord(yVal),
                          x: getXCoord(s.avgAccel),
                          y: getYCoord(yVal)
                        };
                      });
                  }
                })();

                // 3. Group into clusters based on visual closeness (within 25px threshold)
                const clusters: { center: { x: number; y: number }; nodes: typeof rawNodes }[] = [];
                const threshold = 25; 

                rawNodes.forEach(node => {
                  const foundCluster = clusters.find(c => {
                    const dx = c.center.x - node.origX;
                    const dy = c.center.y - node.origY;
                    return Math.sqrt(dx * dx + dy * dy) < threshold;
                  });
                  
                  if (foundCluster) {
                    foundCluster.nodes.push(node);
                    // Update center as average
                    const sumX = foundCluster.nodes.reduce((sum, n) => sum + n.origX, 0);
                    const sumY = foundCluster.nodes.reduce((sum, n) => sum + n.origY, 0);
                    foundCluster.center = {
                      x: sumX / foundCluster.nodes.length,
                      y: sumY / foundCluster.nodes.length
                    };
                  } else {
                    clusters.push({
                      center: { x: node.origX, y: node.origY },
                      nodes: [node]
                    });
                  }
                });

                // 4. Resolve positions using deterministic ring offsets
                const positionedNodes: (typeof rawNodes[0] & {
                  shifted: boolean;
                  clusterCenter: { x: number; y: number };
                  clusterSize: number;
                  ringRadius: number;
                })[] = [];

                clusters.forEach(c => {
                  const count = c.nodes.length;
                  if (count === 1) {
                    positionedNodes.push({
                      ...c.nodes[0],
                      x: c.nodes[0].origX,
                      y: c.nodes[0].origY,
                      shifted: false,
                      clusterCenter: c.center,
                      clusterSize: 1,
                      ringRadius: 0
                    });
                  } else {
                    // Ring radius based on size to ensure comfortable separation
                    let radius = 14;
                    if (count === 3) radius = 17;
                    else if (count === 4) radius = 20;
                    else if (count > 4) radius = 22;

                    c.nodes.forEach((node, i) => {
                      // Distribute evenly, start first node pointing straight up (-Math.PI / 2)
                      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
                      let finalX = c.center.x + Math.cos(angle) * radius;
                      let finalY = c.center.y + Math.sin(angle) * radius;

                      // Clamp coordinates to prevent clipping graph boundaries
                      finalX = Math.max(padding + 12, Math.min(size - padding - 12, finalX));
                      finalY = Math.max(padding + 12, Math.min(size - padding - 12, finalY));

                      positionedNodes.push({
                        ...node,
                        x: finalX,
                        y: finalY,
                        shifted: true,
                        clusterCenter: c.center,
                        clusterSize: count,
                        ringRadius: radius
                      });
                    });
                  }
                });

                return (
                  <>
                    {rawNodes.length === 0 && (
                      <text 
                        x={size / 2} 
                        y={size / 2} 
                        fill="var(--text-secondary)" 
                        textAnchor="middle" 
                        style={{ fontSize: '0.82rem', fontWeight: 700 }}
                      >
                        Inga partier har registrerade utspel i detta ämne ännu
                      </text>
                    )}
                    {/* Render cluster anchors and ring bounds in background */}
                    {clusters.filter(c => c.nodes.length > 1).map((c, idx) => {
                      const count = c.nodes.length;
                      let radius = 14;
                      if (count === 3) radius = 17;
                      else if (count === 4) radius = 20;
                      else if (count > 4) radius = 22;

                      return (
                        <g key={`cluster-group-${idx}`} style={{ pointerEvents: 'none' }}>
                          {/* Outer dashed ring representing the cluster grouping */}
                          <circle 
                            cx={c.center.x} 
                            cy={c.center.y} 
                            r={radius} 
                            fill="none" 
                            stroke="var(--text-primary)" 
                            strokeDasharray="2, 3"
                            strokeWidth={1}
                            opacity="0.12"
                          />
                          {/* Anchor point at the exact calculated average coordinate */}
                          <circle 
                            cx={c.center.x} 
                            cy={c.center.y} 
                            r={3.5} 
                            fill="var(--text-primary)" 
                            opacity="0.45"
                          />
                        </g>
                      );
                    })}

                    {/* Render connection lines */}
                    {positionedNodes.map(p => {
                      if (!p.shifted) return null;
                      return (
                        <line 
                          key={`line-${p.id}`}
                          x1={p.clusterCenter.x} 
                          y1={p.clusterCenter.y} 
                          x2={p.x} 
                          y2={p.y} 
                          stroke="var(--text-primary)" 
                          strokeDasharray="1.5, 1.5" 
                          strokeWidth={1}
                          opacity="0.25"
                          style={{ pointerEvents: 'none' }}
                        />
                      );
                    })}

                    {/* Render actual dots */}
                    {positionedNodes.map(p => {
                      const x = p.x;
                      const y = p.y;
                      
                      if (p.isUser) {
                        return (
                          <g 
                            key="user-node" 
                            className="svg-dot-group user-node"
                          >
                            <title>Ditt resultat i AI-Kompassen</title>
                            {/* Glowing Pulse Rings */}
                            <circle 
                              cx={x} 
                              cy={y} 
                              r={20} 
                              fill="none" 
                              stroke="var(--accent-teal)" 
                              strokeWidth={2}
                              className="animate-ping"
                              style={{ animationDuration: '3s', opacity: 0.6 }}
                            />
                            <circle 
                              cx={x} 
                              cy={y} 
                              r={13} 
                              fill="var(--accent-teal)" 
                              opacity="0.25"
                              className="animate-pulse"
                            />
                            {/* Main filled dot */}
                            <circle 
                              cx={x} 
                              cy={y} 
                              r={11} 
                              fill="var(--accent-teal)"
                              stroke="var(--bg-main)"
                              strokeWidth={1.5}
                              style={{ filter: 'drop-shadow(0 0 8px var(--accent-teal))' }}
                            />
                            {/* Text initials inside */}
                            <text 
                              x={x}
                              y={y + 3.5}
                              textAnchor="middle" 
                              fill="var(--bg-main)"
                              fontSize="9px" 
                              fontWeight="900"
                              fontFamily="var(--font-heading)"
                              pointerEvents="none"
                            >
                              DU
                            </text>
                          </g>
                        );
                      }

                      // Party node
                      const ringRadius = 14 + Math.min(10, p.claimCount * 1.5);
                      const isDarkInitials = ['SD', 'MP'].includes(p.id);

                      return (
                        <g 
                          key={p.id} 
                          className="svg-dot-group"
                          onClick={() => handlePartyDotClick(p.id as PartyAffiliation)}
                        >
                          <title>{partyNames[p.id as PartyAffiliation] || p.id} ({p.status})</title>
                          {/* Pulsing evidens ring */}
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={ringRadius} 
                            fill="none" 
                            className={`svg-dot-ring party-${p.id}`}
                          />
                          
                          {/* Glowing shadow circle */}
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={10} 
                            fill="currentColor" 
                            className={`party-${p.id}`} 
                            opacity="0.35"
                          />

                          {/* Main filled dot */}
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={11} 
                            className={`svg-dot-circle party-${p.id}`}
                          />

                          {/* Text initials inside */}
                          <text 
                            x={x} 
                            y={y + 3.5} 
                            textAnchor="middle" 
                            fill={isDarkInitials ? '#000' : '#fff'}
                            fontSize="9px" 
                            fontWeight="800"
                            fontFamily="var(--font-heading)"
                            pointerEvents="none"
                          >
                            {p.id}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex flex-wrap gap-2 justify-center border-t border-[var(--border-color)] pt-4">
            {partyProfiles.map(p => (
              <button 
                key={p.party} 
                className="party-selector-btn"
                style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem' }}
                onClick={() => handlePartyDotClick(p.party)}
              >
                <PartyLogo party={p.party} size={14} />
                <span style={{ fontWeight: 700 }}>{p.party}</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>({p.status})</span>
              </button>
            ))}
          </div>

          <div style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.02)', border: '1px dashed var(--border-color)', borderRadius: '12px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '1rem' }}>👉</span>
            <span>
              <strong>Vill du granska underlaget?</strong> Klicka på partiernas cirklar på kartan eller knapparna ovan för att gå till deras fullständiga profiler, eller gå till <span onClick={() => onNavigate('databas')} style={{ color: 'var(--accent-teal)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }}>Källbiblioteket</span> för att söka bland alla deras motioner och citat.
            </span>
          </div>
        </div>

        {/* Side Panel: Intelligence Insights */}
        <div className="glass-panel p-6 flex flex-col gap-6">
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>AI-politisk lägesrapport</h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Analys av aktuella debatter och intressanta trender inför valet 2026.</p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="insight-card coral">
              <div className="flex gap-4 items-start">
                <span className="stats-card-icon" style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(255, 69, 36, 0.1)', color: 'var(--accent-coral)' }}><ShieldAlert size={18} /></span>
                <div className="flex flex-col">
                  <h3 className="insight-title">Tyst valfråga: {silentIssue.dimensionName}</h3>
                  <p className="insight-desc">
                    Dimensionen rörande **{silentIssue.dimensionName}** uppvisar ett högt agendatryck från externa aktörer och experter på {silentIssue.agendaPressure} / 5 ({silentIssue.expertClaimCount} st registrerade externa utspel), men partiernas respons är mycket begränsad ({silentIssue.partyResponse} / 5). Detta utgör en tydlig blind fläck.
                  </p>
                  <button 
                    onClick={() => onNavigate('databas')} 
                    className="insight-link text-coral-400"
                  >
                    Utforska agendakrav <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            <div className="insight-card teal">
              <div className="flex gap-4 items-start">
                <span className="stats-card-icon" style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(0, 230, 207, 0.1)', color: 'var(--accent-teal)' }}><TrendingUp size={18} /></span>
                <div className="flex flex-col">
                  <h3 className="insight-title">Ideologiska motpoler etablerade</h3>
                  <p className="insight-desc">
                    Det råder en tydlig ideologisk spänning i vår data. **{partyNames[mostAccelParty.party]} ({mostAccelParty.party})** driver den mest framåtlutade linjen för AI-acceleration med ett index på {mostAccelParty.accelerationScore} / 5. Som kontrast driver **{partyNames[mostProtParty.party]} ({mostProtParty.party})** det starkaste fokuset på AI-skydd och rättssäkerhet med ett skyddsindex på {mostProtParty.protectionScore} / 5.
                  </p>
                  <button 
                    onClick={() => onNavigate('profiler')} 
                    className="insight-link text-teal-400"
                  >
                    Jämför partiprofiler <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick guidelines */}
          <div className="border-t border-[var(--border-color)] pt-4 mt-auto">
            <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Så här fungerar granskningen</h4>
            <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex-grow p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>1. Datainsamling</div>
                Vi hämtar löpande officiella dokument från Riksdagens API och partiers hemsidor.
              </div>
              <div className="flex-grow p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>2. Kvalitetssäkring</div>
                Varje uttalande granskas och poängsätts av våra analytiker för att ge en rättvisande bild.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Dashboard Grid: Leaderboards & Source categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {/* Top Speakers Leaderboard Panel */}
        <div className="glass-panel p-6 flex flex-col gap-6" style={{ borderTop: '3px solid var(--accent-blue)', borderRadius: '20px' }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--accent-blue)' }} />
              Mest aktiva politiker i AI-debatten
            </h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Här är de riksdagsledamöter och ministrar som gjort flest ställningstaganden. <strong style={{ color: 'var(--accent-blue)' }}>Klicka på en politiker</strong> för att granska underlaget.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {(() => {
              const topActors = getTopActors(claims);
              return topActors.map((actor, index) => {
                const pColor = partyColorMap[actor.party as PartyAffiliation] || '#64748B';
                const rankColors = ['#F59E0B', '#94A3B8', '#D97706', 'rgba(15, 23, 42, 0.15)', 'rgba(15, 23, 42, 0.1)'];
                const rankBorder = index < 3 ? `2px solid ${rankColors[index]}` : '1px solid var(--border-color)';
                const maxClaims = topActors[0]?.claimCount || 1;
                const widthPercent = (actor.claimCount / maxClaims) * 100;

                return (
                  <div 
                    key={actor.actor} 
                    onClick={() => setSelectedActorClaims(actor.actor)}
                    className="flex items-center gap-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[rgba(15,23,42,0.02)] transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Rank Number Circle */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: index < 3 ? rankColors[index] : 'var(--text-muted)',
                      border: rankBorder,
                      background: index < 3 ? `rgba(${index === 0 ? '245,158,11' : index === 1 ? '148,163,184' : '217,119,6'}, 0.08)` : 'transparent'
                    }}>
                      {index + 1}
                    </div>

                    {/* Actor Profile Info */}
                    <div className="flex-grow flex flex-col gap-1">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {actor.actor}
                        </span>
                        
                        {/* Party Pill */}
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: `${pColor}15`, 
                            color: pColor, 
                            border: `1px solid ${pColor}30`,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 800
                          }}
                        >
                          {actor.party}
                        </span>
                      </div>

                      {/* Progress bar and count */}
                      <div className="flex items-center gap-3 w-full">
                        <div style={{ flex: 1, height: '4px', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${widthPercent}%`, 
                              height: '100%', 
                              background: pColor,
                              borderRadius: '2px'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {actor.claimCount} st utspel
                        </span>
                      </div>
                    </div>

                    {/* Avg Evidence Strength Badge */}
                    <div style={{ textAlign: 'right', paddingLeft: '8px', borderLeft: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Evidens</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: actor.avgEvidence >= 4.0 ? 'var(--accent-teal)' : actor.avgEvidence >= 3.0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                        {actor.avgEvidence}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
            
            {/* Show All Button */}
            <button 
              onClick={() => setShowAllActorsModal(true)}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[rgba(15,23,42,0.02)] transition-all text-xs font-bold w-full"
              style={{ color: 'var(--accent-blue)', marginTop: '8px' }}
            >
              Visa alla politiker ({getTopActors(claims, 1000).length} st) <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Top Parties Leaderboard Panel */}
        <div className="glass-panel p-6 flex flex-col gap-6" style={{ borderTop: '3px solid var(--accent-teal)', borderRadius: '20px' }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} style={{ color: 'var(--accent-teal)' }} />
              AI-aktivitet parti för parti
            </h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Totalt antal insamlade ställningstaganden och motioner fördelat per riksdagsparti. <strong style={{ color: 'var(--accent-teal)' }}>Klicka på ett parti</strong> för att visa deras profil.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {(() => {
              const partyProfilesSorted = [...partyProfiles]
                .filter(p => p.claimCount > 0)
                .sort((a, b) => b.claimCount - a.claimCount);
              const maxPartyClaims = partyProfilesSorted[0]?.claimCount || 1;
              const rankColors = ['#F59E0B', '#94A3B8', '#D97706', 'rgba(15, 23, 42, 0.15)', 'rgba(15, 23, 42, 0.1)'];

              return partyProfilesSorted.map((p, index) => {
                const pColor = partyColorMap[p.party] || '#64748B';
                const rankBorder = index < 3 ? `2px solid ${rankColors[index]}` : '1px solid var(--border-color)';
                const widthPercent = (p.claimCount / maxPartyClaims) * 100;

                return (
                  <div 
                    key={p.party} 
                    onClick={() => handlePartyDotClick(p.party)}
                    className="flex items-center gap-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[rgba(15,23,42,0.02)] transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Rank Number Circle */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: index < 3 ? rankColors[index] : 'var(--text-muted)',
                      border: rankBorder,
                      background: index < 3 ? `rgba(${index === 0 ? '245,158,11' : index === 1 ? '148,163,184' : '217,119,6'}, 0.08)` : 'transparent'
                    }}>
                      {index + 1}
                    </div>

                    {/* Party Profile Info */}
                    <div className="flex-grow flex flex-col gap-1">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <PartyLogo party={p.party} size={16} />
                          {partyNames[p.party]}
                        </span>
                        
                        {/* Party Stance Status */}
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: `${pColor}15`, 
                            color: pColor, 
                            border: `1px solid ${pColor}30`,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 800
                          }}
                        >
                          {p.status}
                        </span>
                      </div>

                      {/* Progress bar and count */}
                      <div className="flex items-center gap-3 w-full">
                        <div style={{ flex: 1, height: '4px', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${widthPercent}%`, 
                              height: '100%', 
                              background: pColor,
                              borderRadius: '2px'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {p.claimCount} st utspel
                        </span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Source Categories Panel */}
        <div className="glass-panel p-6 flex flex-col gap-6" style={{ borderTop: '3px solid var(--accent-purple)', borderRadius: '20px' }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={18} style={{ color: 'var(--accent-purple)' }} />
              Varifrån kommer informationen?
            </h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Fördelning av de {claims.length} källor som ligger till grund för vår analys (motioner, pressmeddelanden etc).
            </p>
          </div>

          <div className="flex flex-col gap-4 justify-between" style={{ height: '100%' }}>
            <div className="flex flex-col gap-3">
              {(() => {
                const sourceStats = getSourceStats(claims);
                const sourceColors: Record<string, string> = {
                  'Motion': 'var(--accent-blue)',
                  'Proposition': 'var(--accent-teal)',
                  'Pressmeddelande': 'var(--accent-coral)',
                  'Rapport': 'var(--accent-purple)',
                  'Debattartikel': '#64748B',
                  'Utredning': '#F59E0B'
                };

                return sourceStats.map(stat => {
                  const color = sourceColors[stat.sourceType] || '#64748B';
                  return (
                    <div key={stat.sourceType} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }}></span>
                          {stat.sourceType === 'Motion' ? 'Riksdagsmotioner' :
                           stat.sourceType === 'Proposition' ? 'Regeringspropositioner' :
                           stat.sourceType === 'Pressmeddelande' ? 'Pressmeddelanden' :
                           stat.sourceType === 'Rapport' ? 'Rapporter & Myndigheter' :
                           stat.sourceType === 'Debattartikel' ? 'Debattartiklar & Nyheter' :
                           stat.sourceType === 'Utredning' ? 'Statliga Utredningar (SOU)' : stat.sourceType}
                        </span>
                        <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>
                          {stat.count} st ({stat.percent}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(15, 23, 42, 0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${stat.percent}%`, 
                            height: '100%', 
                            backgroundColor: color
                          }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Summary footer for the sources */}
            <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Totalt antal registrerade källhandlingar:</span>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{claims.length} st</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gap Analysis Section */}
      <div className="glass-panel p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Prioriteringsgap: Vad tycker experterna jämfört med partierna?</h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Jämför trycket från externa aktörer (forskare, myndigheter, civilsamhälle) med hur mycket energi partierna lägger på samma fråga.
            </p>
          </div>
          <span className="badge badge-purple">12 AI-OMRÅDEN</span>
        </div>

        {/* Custom Grid Table Header */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'minmax(220px, 2.5fr) minmax(110px, 1.2fr) minmax(110px, 1.2fr) minmax(110px, 1.2fr) minmax(110px, 1.2fr) minmax(160px, 1.3fr)',
            gap: '16px',
            padding: '12px 16px',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '12px',
            alignItems: 'center'
          }}
        >
          {/* AI-Dimension Header */}
          <div 
            onClick={() => handleSort('id')}
            onMouseEnter={(e) => handleHeaderMouseEnter(e, "En av de 12 AI-dimensionerna. Klicka för att sortera efter ID.")}
            onMouseLeave={handleHeaderMouseLeave}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}
          >
            <span>AI-Dimension</span>
            <Info size={11} className="text-gray-400" />
            {gapSortBy === 'id' && (gapSortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </div>

          {/* Agendatryck Header */}
          <div 
            onClick={() => handleSort('agenda')}
            onMouseEnter={(e) => handleHeaderMouseEnter(e, "Mäter trycket från externa expertaktörer (myndigheter, civilsamhälle, fackförbund och forskare) på en skala 0-5, linjärt normaliserat mot det maximala antalet expertinlägg i databasen. Riksdagsutskott exkluderas. Klicka för att sortera.")}
            onMouseLeave={handleHeaderMouseLeave}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', userSelect: 'none' }}
          >
            <span>Agendatryck</span>
            <Info size={11} className="text-gray-400" />
            {gapSortBy === 'agenda' && (gapSortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </div>

          {/* Partirespons Header */}
          <div 
            onClick={() => handleSort('response')}
            onMouseEnter={(e) => handleHeaderMouseEnter(e, "Mäter partiernas sammanlagda engagemang på en skala 0-5. Summan av alla partiers policyförslag (viktade efter konkretion och källa) normaliseras med kvadratrots-skalning (SQRT) relativt den mest debatterade dimensionen. Klicka för att sortera.")}
            onMouseLeave={handleHeaderMouseLeave}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', userSelect: 'none' }}
          >
            <span>Partirespons</span>
            <Info size={11} className="text-gray-400" />
            {gapSortBy === 'response' && (gapSortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </div>

          {/* Störst fokus Header */}
          <div 
            onMouseEnter={(e) => handleHeaderMouseEnter(e, "Det parti som har störst procentuell andel av sin digitala agenda på denna dimension. Visar relativ prioritering och undviker regeringsbias.")}
            onMouseLeave={handleHeaderMouseLeave}
            style={{ cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <span>Störst fokus</span>
            <Info size={11} className="text-gray-400" />
          </div>

          {/* Flest förslag Header */}
          <div 
            onMouseEnter={(e) => handleHeaderMouseEnter(e, "Det parti som har flest enskilda registrerade policyförslag, motioner och utspel i denna dimension. Visar absolut volym.")}
            onMouseLeave={handleHeaderMouseLeave}
            style={{ cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <span>Flest förslag</span>
            <Info size={11} className="text-gray-400" />
          </div>

          {/* Gap-bedömning Header */}
          <div 
            onClick={() => handleSort('gap')}
            onMouseEnter={(e) => handleHeaderMouseEnter(e, "Analys av differensen mellan det normaliserade agendatrycket (expertkrav) och partirespons (politisk debatt) för att identifiera blinda fläckar eller tysta valfrågor. Klicka för att sortera.")}
            onMouseLeave={handleHeaderMouseLeave}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}
          >
            <span>Gap-bedömning</span>
            <Info size={11} className="text-gray-400" />
            {gapSortBy === 'gap' && (gapSortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </div>
        </div>

        {/* Custom Card list mapping */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedGapAnalysis.map(item => {
            const driving = getDrivingPartyInDimension(item.dimensionId);
            const mostPropParty = getMostProposalsPartyInDimension(item.dimensionId);
            const drivingColor = driving ? (partyColorMap[driving.leader.party] || '#64748B') : '#64748B';
            const mostPropColor = mostPropParty ? (partyColorMap[mostPropParty.party] || '#64748B') : '#64748B';
            const isTyst = item.conclusion.includes('Tyst');
            const isEtablerad = item.conclusion.includes('Etablerad');
            const isBlind = item.conclusion.includes('Blind');

            return (
              <div 
                key={item.dimensionId} 
                onClick={() => {
                  setSelectedDimensionId(item.dimensionId);
                  setShowMathDetails(false);
                  const stances = getPartyStancesInDimension(item.dimensionId);
                  const firstWithClaims = stances.find(s => s.count > 0);
                  setActiveDimensionTab(firstWithClaims ? firstWithClaims.party : 'S');
                }}
                className="hover-card-row"
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'minmax(220px, 2.5fr) minmax(110px, 1.2fr) minmax(110px, 1.2fr) minmax(110px, 1.2fr) minmax(110px, 1.2fr) minmax(160px, 1.3fr)',
                  gap: '16px',
                  padding: '16px',
                  alignItems: 'center',
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '16px',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.01)'
                }}
              >
                {/* Column 1: AI-Dimension & Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span className="font-extrabold text-[var(--text-primary)]" style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>
                    {item.dimensionId}. {item.dimensionName}
                  </span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setSelectedDimensionId(item.dimensionId);
                        setShowMathDetails(false);
                        const stances = getPartyStancesInDimension(item.dimensionId);
                        const firstWithClaims = stances.find(s => s.count > 0);
                        setActiveDimensionTab(firstWithClaims ? firstWithClaims.party : 'S');
                      }}
                      className="btn-secondary" 
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '0.66rem', 
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontWeight: 700,
                        color: 'var(--accent-teal)',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(15, 23, 42, 0.01)',
                        cursor: 'pointer'
                      }}
                    >
                      Detaljer <ArrowRight size={9} />
                    </button>
                    <button 
                      onClick={() => {
                        setValkartaDimensionId(item.dimensionId);
                        const anchor = document.getElementById('valkartan-anchor');
                        if (anchor) {
                          anchor.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="btn-secondary"
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '0.66rem', 
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontWeight: 700,
                        color: 'var(--accent-blue)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        background: 'rgba(59, 130, 246, 0.03)',
                        cursor: 'pointer'
                      }}
                    >
                      Karta 🗺️
                    </button>
                  </div>
                </div>

                {/* Column 2: Agendatryck */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div className="gap-progress-bar" style={{ width: '100%', maxWidth: '80px', height: '6px' }}>
                    <div 
                      className="gap-fill-coral" 
                      style={{ width: `${(item.agendaPressure / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-extrabold text-coral-500 text-[10px]">{item.agendaPressure} / 5</span>
                </div>

                {/* Column 3: Partirespons */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div className="gap-progress-bar" style={{ width: '100%', maxWidth: '80px', height: '6px' }}>
                    <div 
                      className="gap-fill-teal" 
                      style={{ width: `${(item.partyResponse / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-extrabold text-teal-600 text-[10px]">{item.partyResponse} / 5</span>
                </div>

                {/* Column 4: Störst fokus */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {driving ? (
                    <div className="flex items-center gap-1">
                      <PartyLogo party={driving.leader.party} size={12} />
                      <span 
                        className="badge font-bold" 
                        style={{ 
                          backgroundColor: `${drivingColor}12`, 
                          color: drivingColor, 
                          border: `1.5px solid ${drivingColor}25`,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '0.66rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {driving.leader.party} ({Math.round(driving.leader.relativeFocus * 100)}%)
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Ingen</span>
                  )}
                </div>

                {/* Column 5: Flest förslag */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {mostPropParty ? (
                    <div className="flex items-center gap-1">
                      <PartyLogo party={mostPropParty.party} size={12} />
                      <span 
                        className="badge font-bold" 
                        style={{ 
                          backgroundColor: `${mostPropColor}12`, 
                          color: mostPropColor, 
                          border: `1.5px solid ${mostPropColor}25`,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '0.66rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {mostPropParty.party} ({mostPropParty.count} st)
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Ingen</span>
                  )}
                </div>

                {/* Column 6: Gap-bedömning */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span 
                    className={`badge ${
                      isTyst 
                        ? 'badge-coral' 
                        : isEtablerad 
                          ? 'badge-teal' 
                          : isBlind 
                            ? 'badge-gray text-opacity-40' 
                            : 'badge-purple'
                    }`}
                    style={{ fontSize: '0.68rem', padding: '3px 8px', display: 'inline-block', textAlign: 'center', width: '100%', maxWidth: '140px' }}
                  >
                    {item.conclusion}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gap Analysis Methodology Explanation Card */}
        <div style={{ padding: '14px 18px', background: 'rgba(15, 23, 42, 0.015)', border: '1px dashed var(--border-color)', borderRadius: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--text-primary)' }}>
            <span style={{ fontSize: '1.1rem' }}>📊</span>
            <span>Hur räknas Prioriteringsgapet ut?</span>
          </div>
          <div style={{ lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              För att ge en rättvisande bild av debatten använder systemet en <strong>relativ normaliseringsmodell</strong> (skala 0–5) som kalibreras automatiskt baserat på databasens innehåll:
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>
                <strong>Agendatryck (Externa):</strong> Mäter antalet utspel från oberoende externa aktörer (myndigheter, civilsamhälle, fackförbund och forskare/experter), skalat linjärt mot det högsta antalet inlägg inom en enskild dimension i databasen. Riksdagsutskott exkluderas här då de består av partipolitiker.
              </li>
              <li>
                <strong>Partirespons (Index):</strong> Summan av alla partiers sammanlagda policyförslag och motioner (viktade efter konkretionsgrad och källtyngd). För att dämpa effekten av enskilda jättefrågor (som t.ex. generella AI-styrningsmotioner) som annars skulle platta till hela skalan, används en <strong>kvadratrots-skalning</strong> (SQRT) relativt den mest debatterade dimensionen.
              </li>
              <li>
                <strong>Störst fokus (Relativ prioritering):</strong> Visar vilket parti som har störst andel av sitt digitala engagemang inom dimensionen. Detta mäts som procentandel av partiets egna totala policyvikt, vilket gör det möjligt att lyfta fram mindre partiers unika prioriteringar och förhindrar att regeringspartier dominerar enbart på grund av högre formell dokumentvolym.
              </li>
              <li>
                <strong>Flest förslag (Absolut volym):</strong> Visar vilket parti som har flest registrerade enskilda förslag, motioner och utspel i absoluta tal inom dimensionen.
              </li>
              <li>
                <strong>Gap-bedömning:</strong> Kategoriserar skillnaden mellan trycket och responsen. Exempelvis flaggas en fråga som en <em>"Tyst valfråga"</em> om det externa trycket är högt (agendatryck &ge; 3.0) men partiernas förslag är mycket begränsade (partirespons &lt; 2.0).
              </li>
            </ul>
          </div>
        </div>
      </div>



      {/* Horizontal Interactive Timeline Panel */}
      <div className="glass-panel w-full flex flex-col gap-6 animate-slide" style={{ marginTop: '32px', padding: '24px', borderRadius: '20px' }}>
        <div className="flex justify-between items-center flex-wrap gap-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0px' }}>
              Kronologisk AI-Politisk Tidslinje (2018 - 2026)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', margin: '0px' }}>
              Utforska visuellt när partierna har gjort sina AI-politiska utspel inför valet 2026. Håll muspekaren över bollarna för förhandsvisning, klicka för detaljer.
            </p>
          </div>
        </div>

        {/* Scrollable Timeline Visualization Area */}
        <div style={{ overflowX: 'auto', padding: '10px 0px' }}>
          <div style={{ minWidth: '950px', position: 'relative', height: '390px', background: 'rgba(15, 23, 42, 0.01)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '20px 40px' }}>
            
            {/* Timeline Year Grid & Columns */}
            {(() => {
              const yearBands = [
                { year: 2018, start: '2018-01-01', end: '2019-01-01' },
                { year: 2019, start: '2019-01-01', end: '2020-01-01' },
                { year: 2020, start: '2020-01-01', end: '2021-01-01' },
                { year: 2021, start: '2021-01-01', end: '2022-01-01' },
                { year: 2022, start: '2022-01-01', end: '2023-01-01' },
                { year: 2023, start: '2023-01-01', end: '2024-01-01' },
                { year: 2024, start: '2024-01-01', end: '2025-01-01' },
                { year: 2025, start: '2025-01-01', end: '2026-01-01' },
                { year: 2026, start: '2026-01-01', end: '2026-09-13' }
              ];
              const startDate = new Date('2018-01-01').getTime();
              const endDate = new Date('2026-09-13').getTime();
              const totalDuration = endDate - startDate;

              return (
                <div style={{ position: 'absolute', left: '160px', right: '80px', top: '10px', bottom: '60px', pointerEvents: 'none', zIndex: 1 }}>
                  {yearBands.map((band, idx) => {
                    const startPercent = ((new Date(band.start).getTime() - startDate) / totalDuration) * 100;
                    const endPercent = ((new Date(band.end).getTime() - startDate) / totalDuration) * 100;
                    const widthPercent = endPercent - startPercent;
                    const isEven = idx % 2 === 0;

                    return (
                      <div
                        key={band.year}
                        style={{
                          position: 'absolute',
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                          top: 0,
                          bottom: 0,
                          backgroundColor: isEven ? 'rgba(15, 23, 42, 0.015)' : 'transparent',
                          borderLeft: '1px dashed var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          alignItems: 'center'
                        }}
                      >
                        {/* Centered Year label below the grid area */}
                        <div style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 800, 
                          color: 'var(--text-muted)', 
                          transform: 'translateY(28px)', 
                          letterSpacing: '0.05em' 
                        }}>
                          {band.year}
                        </div>
                      </div>
                    );
                  })}
                  {/* Far-right line for the election date */}
                  <div 
                    style={{
                      position: 'absolute',
                      right: '0px',
                      top: 0,
                      bottom: 0,
                      width: '1px',
                      borderLeft: '1px dashed var(--border-color)'
                    }}
                  />
                </div>
              );
            })()}

            {/* Party tracks (rows) */}
            {(() => {
              const parties: PartyAffiliation[] = ['S', 'M', 'SD', 'C', 'V', 'MP', 'L', 'KD', 'Externt'];
              // Using imported partyNames and partyColorMap

              const startDate = new Date('2018-01-01').getTime();
              const endDate = new Date('2026-09-13').getTime();
              const totalDuration = endDate - startDate;

              return (
                <div style={{ position: 'absolute', left: '40px', right: '40px', top: '20px', height: '290px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 2 }}>
                  {parties.map((party, pIdx) => {
                    const rowTop = 10 + pIdx * 30;
                    const pColor = partyColorMap[party];

                    // Filter claims for this party that have valid dates
                    const partyClaims = claims.filter(c => c.partyAffiliation === party && c.date);

                    return (
                      <div 
                        key={party} 
                        style={{ 
                          position: 'absolute', 
                          top: `${rowTop}px`, 
                          left: '0px', 
                          right: '0px', 
                          height: '24px', 
                          display: 'flex', 
                          alignItems: 'center' 
                        }}
                      >
                        {/* Row Name Label */}
                        <div style={{ width: '100px', fontSize: '0.72rem', fontWeight: 800, color: pColor, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }} title={partyNames[party]}>
                          <PartyLogo party={party as PartyAffiliation} size={14} />
                          {party}
                        </div>

                        {/* Track Line */}
                        <div style={{ position: 'absolute', left: '120px', right: '40px', height: '1px', background: 'var(--border-color)', top: '12px' }}>
                          
                          {/* Plot Claim Balls */}
                          {partyClaims.map(claim => {
                            const claimTime = new Date(claim.date).getTime();
                            const percent = ((claimTime - startDate) / totalDuration) * 100;
                            const isHovered = hoveredTimelineClaim?.id === claim.id;

                            // Calculate visual weight to scale dot size slightly
                            const score = claim.evidenceStrength || 3;
                            const dotSize = 8 + (score * 1.5); // size 9.5 to 15.5 px

                            return (
                              <div
                                key={claim.id}
                                onClick={() => setSelectedTimelineClaim(claim)}
                                onMouseEnter={(e) => {
                                  setHoveredTimelineClaim(claim);
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTooltipPos({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 8
                                  });
                                }}
                                onMouseLeave={() => setHoveredTimelineClaim(null)}
                                className="transition-all duration-200"
                                style={{
                                  position: 'absolute',
                                  left: `${percent}%`,
                                  transform: `translate(-50%, -50%) ${isHovered ? 'scale(1.3)' : 'scale(1)'}`,
                                  top: '50%',
                                  width: `${dotSize}px`,
                                  height: `${dotSize}px`,
                                  borderRadius: '50%',
                                  backgroundColor: pColor,
                                  boxShadow: isHovered ? '0 4px 10px rgba(15, 23, 42, 0.15)' : 'none',
                                  border: isHovered ? '2px solid var(--text-primary)' : '1px solid rgba(15, 23, 42, 0.15)',
                                  cursor: 'pointer',
                                  zIndex: isHovered ? 100 : 10
                                }}
                              ></div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>
        </div>
      </div>

      {/* Floating Tooltip Component */}
      {hoveredTimelineClaim && createPortal(
        <div 
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translateX(-50%) translateY(-100%)',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(24px)',
            border: `1.5px solid ${partyColorMap[hoveredTimelineClaim.partyAffiliation] || 'var(--accent-teal)'}`,
            borderRadius: '14px',
            padding: '12px',
            width: '260px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            zIndex: 10000,
            fontSize: '0.78rem',
            color: '#ffffff',
            transition: 'opacity 0.15s ease'
          }}
        >
          <div className="flex justify-between items-center text-[10px] pb-1.5 mb-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="flex items-center gap-1.5 font-extrabold" style={{ color: partyColorMap[hoveredTimelineClaim.partyAffiliation] }}>
              <PartyLogo party={hoveredTimelineClaim.partyAffiliation} size={12} />
              {hoveredTimelineClaim.partyAffiliation}
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {hoveredTimelineClaim.date}
            </span>
          </div>
          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.8rem', lineHeight: '1.25' }}>
            {hoveredTimelineClaim.neutralSummary}
          </div>
          <div className="flex justify-between text-[9px] pt-1.5 mt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255, 255, 255, 0.5)' }}>
            <span>{hoveredTimelineClaim.actor.substring(0, 16)}</span>
            <span>Dim {hoveredTimelineClaim.primaryDimension} &bull; Vikt {calculateClaimWeight(hoveredTimelineClaim)}</span>
          </div>
        </div>,
        document.body
      )}

      {/* Glassmorphic Modal Component for Claim Details */}
      {selectedTimelineClaim && createPortal(
        <div 
          onClick={() => setSelectedTimelineClaim(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '650px',
              padding: '28px',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: 'var(--shadow-main)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-start" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge" style={{ backgroundColor: 'rgba(15, 23, 42, 0.04)', color: 'var(--text-muted)', fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px' }}>
                    {selectedTimelineClaim.id}
                  </span>
                  <span className="badge badge-teal" style={{ background: selectedTimelineClaim.reviewStatus === 'Granskad' ? 'rgba(59, 130, 246, 0.15)' : selectedTimelineClaim.reviewStatus === 'Kalibrerad' ? 'rgba(0, 230, 207, 0.15)' : 'rgba(15, 23, 42, 0.04)', color: selectedTimelineClaim.reviewStatus === 'Granskad' ? 'var(--accent-blue)' : selectedTimelineClaim.reviewStatus === 'Kalibrerad' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
                    {selectedTimelineClaim.reviewStatus}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: partyColorMap[selectedTimelineClaim.partyAffiliation] || 'var(--accent-teal)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PartyLogo party={selectedTimelineClaim.partyAffiliation} size={20} glow />
                  Dimension {selectedTimelineClaim.primaryDimension}: {lockedDimensions.find(d => d.id === selectedTimelineClaim.primaryDimension)?.name || 'Okänd'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTimelineClaim(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quote */}
            <div style={{ background: 'rgba(15, 23, 42, 0.02)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', fontStyle: 'italic', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
              &rdquo;{selectedTimelineClaim.originalQuote}&rdquo;
            </div>

            {/* Summary */}
            <div className="flex flex-col gap-1.5">
              <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Neutral sammanfattning</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0px', lineHeight: '1.35' }}>{selectedTimelineClaim.neutralSummary}</p>
            </div>

            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '0.82rem', padding: '16px', background: 'rgba(15, 23, 42, 0.01)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', paddingBottom: '3px' }}>Aktör / Typ</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PartyLogo party={selectedTimelineClaim.partyAffiliation} size={14} />
                  {selectedTimelineClaim.actor}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingTop: '2px' }}>{selectedTimelineClaim.actorType}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', paddingBottom: '3px' }}>Källa / Typ</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedTimelineClaim.source}
                  {(() => {
                    const sourceUrl = selectedTimelineClaim.sourceUrl || (selectedTimelineClaim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${selectedTimelineClaim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                    if (!sourceUrl) return null;
                    return (
                      <a 
                        href={sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        title="Öppna originaldokumentet"
                        className="hover:underline"
                      >
                        <ExternalLink size={13} />
                      </a>
                    );
                  })()}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingTop: '2px' }}>{selectedTimelineClaim.sourceType} (Vikt {selectedTimelineClaim.sourceWeight})</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', paddingBottom: '3px' }}>Datum</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                  {selectedTimelineClaim.date}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', paddingBottom: '3px' }}>Beräknad Claimvikt</div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>
                  {calculateClaimWeight(selectedTimelineClaim)}
                </div>
              </div>
            </div>

            {/* Comment */}
            {selectedTimelineClaim.comment && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Analyskommentar: </span>
                {selectedTimelineClaim.comment}
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
              <button 
                onClick={() => setSelectedTimelineClaim(null)} 
                className="btn btn-secondary"
              >
                Stäng
              </button>
              {onEditClaim && (
                <button 
                  onClick={() => {
                    onEditClaim(selectedTimelineClaim);
                    onNavigate('metod');
                  }} 
                  className="btn btn-primary"
                  style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
                >
                  Gå till Editor & Assist <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 1. Modal: Show All Actors / Politicians */}
      {showAllActorsModal && createPortal(
        <div 
          onClick={() => setShowAllActorsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9980,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              padding: '28px',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: 'var(--shadow-main)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div className="flex items-center gap-2">
                <Users size={20} style={{ color: 'var(--accent-blue)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Alla AI-Politiska Debattörer
                </h3>
              </div>
              <button 
                onClick={() => setShowAllActorsModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input 
                type="text"
                placeholder="Sök efter politiker eller debattör..."
                value={actorSearchQuery}
                onChange={(e) => setActorSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1.5px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  fontSize: '0.88rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                className="focus:border-[var(--accent-teal)] focus:bg-[var(--bg-card)]"
              />
            </div>

            {/* Scrollable list */}
            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                paddingRight: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {(() => {
                const allActors = getTopActors(claims, 1000);
                const filteredActors = allActors.filter(actor => 
                  actor.actor.toLowerCase().includes(actorSearchQuery.toLowerCase()) ||
                  actor.party.toLowerCase().includes(actorSearchQuery.toLowerCase())
                );

                if (filteredActors.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      Inga politiker matchar sökningen.
                    </div>
                  );
                }

                return filteredActors.map((actor, idx) => {
                  const pColor = partyColorMap[actor.party as PartyAffiliation] || '#64748B';
                  const rankColors = ['#F59E0B', '#94A3B8', '#D97706'];
                  const isTop3 = idx < 3 && actorSearchQuery === '';
                  const maxClaims = allActors[0]?.claimCount || 1;
                  const widthPercent = (actor.claimCount / maxClaims) * 100;

                  return (
                    <div 
                      key={actor.actor}
                      onClick={() => {
                        setSelectedActorClaims(actor.actor);
                      }}
                      className="flex items-center gap-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-color-hover)] transition-all duration-200"
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Rank Number / Index */}
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: isTop3 ? rankColors[idx] : 'var(--text-muted)',
                        border: isTop3 ? `2px solid ${rankColors[idx]}` : '1px solid var(--border-color)',
                        background: isTop3 ? `rgba(${idx === 0 ? '245,158,11' : idx === 1 ? '148,163,184' : '217,119,6'}, 0.08)` : 'transparent'
                      }}>
                        {idx + 1}
                      </div>

                      {/* Name & Party */}
                      <div className="flex-grow flex flex-col gap-1">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                            {actor.actor}
                          </span>
                          <span 
                            className="badge flex items-center gap-1" 
                            style={{ 
                              backgroundColor: `${pColor}15`, 
                              color: pColor, 
                              border: `1px solid ${pColor}30`,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 800
                            }}
                          >
                            <PartyLogo party={actor.party as PartyAffiliation} size={12} />
                            {actor.party}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-3 w-full">
                          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${widthPercent}%`, 
                                height: '100%', 
                                background: `linear-gradient(90deg, ${pColor}, #fff)`,
                                boxShadow: `0 0 8px ${pColor}`
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {actor.claimCount} st
                          </span>
                        </div>
                      </div>

                      {/* Evidens Badge */}
                      <div style={{ textAlign: 'right', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.06)', minWidth: '46px' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evidens</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: actor.avgEvidence >= 4.0 ? 'var(--accent-teal)' : actor.avgEvidence >= 3.0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                          {actor.avgEvidence}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setShowAllActorsModal(false)} 
                className="btn btn-secondary text-xs"
                style={{ padding: '8px 16px' }}
              >
                Stäng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Modal: Selected Actor Claims Feed */}
      {selectedActorClaims && createPortal(
        <div 
          onClick={() => setSelectedActorClaims(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9990,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '700px',
              maxHeight: '85vh',
              padding: '28px',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: 'var(--shadow-main)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: '8px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: (() => {
                    const sample = claims.find(c => c.actor === selectedActorClaims);
                    const pColor = sample ? (partyColorMap[sample.partyAffiliation] || '#64748B') : 'var(--accent-blue)';
                    return pColor;
                  })()
                }}></div>
                <div className="flex flex-col">
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Utspel av {selectedActorClaims}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Totalt {claims.filter(c => c.actor === selectedActorClaims).length} st AI-politiska ställningstaganden
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedActorClaims(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Claims Feed */}
            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                paddingRight: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {(() => {
                const actorClaims = claims
                  .filter(c => c.actor === selectedActorClaims)
                  .sort((a, b) => b.date.localeCompare(a.date));

                return actorClaims.map((claim) => {
                  const pColor = partyColorMap[claim.partyAffiliation] || '#64748B';
                  const dim = lockedDimensions.find(d => d.id === claim.primaryDimension);

                  return (
                    <div 
                      key={claim.id}
                      onClick={() => {
                        setSelectedTimelineClaim(claim);
                      }}
                      className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-color-hover)] transition-all duration-200 flex flex-col gap-2.5"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 font-extrabold" style={{ color: pColor }}>
                            <PartyLogo party={claim.partyAffiliation} size={12} />
                            {claim.partyAffiliation}
                          </span>
                          <span>&bull;</span>
                          <span onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                              if (sourceUrl) {
                                return (
                                  <a 
                                    href={sourceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-sky-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                                  >
                                    {claim.source} <ExternalLink size={9} />
                                  </a>
                                );
                              }
                              return claim.source;
                            })()}
                          </span>
                        </div>
                        <span>{claim.date}</span>
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                        {claim.neutralSummary}
                      </div>

                      <div className="flex justify-between items-center pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                        <span 
                          style={{ 
                            fontSize: '0.72rem', 
                            color: 'var(--text-muted)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            maxWidth: '75%'
                          }}
                        >
                          Dim {claim.primaryDimension}: {dim?.name}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                          Vikt {calculateClaimWeight(claim)}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button 
                onClick={() => setSelectedActorClaims(null)} 
                className="btn btn-secondary text-xs"
                style={{ padding: '8px 16px' }}
              >
                Stäng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Modal: Dimension Explorer */}
      {selectedDimensionId !== null && createPortal(
        <div 
          onClick={() => setSelectedDimensionId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9970, // Stacked underneath details modal (9999) but above other overlays
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '850px',
              height: '85vh',
              padding: '28px',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: 'var(--shadow-main)'
            }}
          >
            {(() => {
              const dim = lockedDimensions.find(d => d.id === selectedDimensionId);
              if (!dim) return null;

              const gapItem = gapAnalysis.find(g => g.dimensionId === selectedDimensionId);
              const stances = getPartyStancesInDimension(selectedDimensionId);
              const activeStance = stances.find(s => s.party === activeDimensionTab);
              
              // Filter external claims for this dimension
              const externalClaimsInDim = claims.filter(c => 
                c.partyAffiliation === 'Externt' && 
                (c.primaryDimension === selectedDimensionId || c.secondaryDimensions.includes(selectedDimensionId))
              ).sort((a, b) => b.date.localeCompare(a.date));

              const expertClaims = externalClaimsInDim.filter(c => c.actorType !== 'Riksdagsutskott');
              const committeeClaims = externalClaimsInDim.filter(c => c.actorType === 'Riksdagsutskott');

              return (
                <>
                  {/* Header */}
                  <div className="flex justify-between items-start" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                    <div className="flex flex-col gap-1.5" style={{ maxWidth: '80%' }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge badge-purple" style={{ textTransform: 'uppercase', fontSize: '0.64rem', padding: '3px 8px', borderRadius: '6px' }}>
                          Dimension {dim.id}
                        </span>
                        {gapItem && (
                          <span 
                            className={`badge ${
                              gapItem.conclusion.includes('Tyst') 
                                ? 'badge-coral ai-glow' 
                                : gapItem.conclusion.includes('Etablerad') 
                                  ? 'badge-teal' 
                                  : gapItem.conclusion.includes('Blind') 
                                    ? 'badge-gray text-opacity-40' 
                                    : 'badge-purple'
                            }`}
                            style={{ fontSize: '0.64rem', padding: '3px 8px', borderRadius: '6px' }}
                          >
                            {gapItem.conclusion}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {dim.name}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
                        {dim.description}
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedDimensionId(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Math Explanation Accordion */}
                  {gapItem && (
                    <div style={{ padding: '0px 0px 4px 0px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                      <button
                        onClick={() => setShowMathDetails(!showMathDetails)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '6px 0px',
                          color: 'var(--accent-teal)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Info size={13} />
                        <span>{showMathDetails ? 'Dölj matematisk beräkning' : 'Visa hur Prioriteringsgapet beräknats för denna dimension'}</span>
                        {showMathDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {showMathDetails && (
                        <div 
                          className="glass-panel" 
                          style={{ 
                            marginTop: '8px', 
                            marginBottom: '8px',
                            padding: '16px', 
                            borderRadius: '14px', 
                            background: 'rgba(15, 23, 42, 0.015)', 
                            border: '1px solid var(--border-color)',
                            fontSize: '0.78rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            {/* Agendatryck Column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-coral)' }}></span>
                                1. Agendatryck (Externa)
                              </span>
                              <div style={{ color: 'var(--text-secondary)' }}>
                                <p style={{ margin: '0 0 6px 0', lineHeight: '1.4' }}>
                                  Mäter trycket från oberoende experter. Riksdagsutskott exkluderas då de består av politiker och speglar politisk enighet.
                                </p>
                                <div style={{ fontFamily: 'monospace', padding: '6px 8px', background: 'rgba(15,23,42,0.03)', borderRadius: '6px', color: 'var(--text-primary)', display: 'inline-block', fontSize: '0.72rem', marginBottom: '6px' }}>
                                  5.0 × (Antal expertinlägg / Max expertinlägg i en dimension)
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.74rem' }}>
                                  Värden: 5.0 × ({gapItem.expertClaimCount} st / {gapItem.maxExpertCount} st) = <span style={{ color: 'var(--accent-coral)' }}>{gapItem.agendaPressure} / 5</span>
                                </div>
                              </div>
                            </div>

                            {/* Partirespons Column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-teal)' }}></span>
                                2. Partirespons (Index)
                              </span>
                              <div style={{ color: 'var(--text-secondary)' }}>
                                <p style={{ margin: '0 0 6px 0', lineHeight: '1.4' }}>
                                  Mäter partiernas totala engagemang. Kvadratrots-skalning (SQRT) dämpar effekten av jättefrågor för att inte platta till mindre områden.
                                </p>
                                <div style={{ fontFamily: 'monospace', padding: '6px 8px', background: 'rgba(15,23,42,0.03)', borderRadius: '6px', color: 'var(--text-primary)', display: 'inline-block', fontSize: '0.72rem', marginBottom: '6px' }}>
                                  5.0 × √(Dimensionens vikt / Max vikt i en dimension)
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.74rem' }}>
                                  Värden: 5.0 × √({gapItem.rawPartyWeight} / {gapItem.maxPartyWeight}) = 5.0 × √({(gapItem.rawPartyWeight / gapItem.maxPartyWeight).toFixed(3)}) = <span style={{ color: 'var(--accent-teal)' }}>{gapItem.partyResponse} / 5</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.74rem', borderTop: '1px solid var(--border-color)', paddingTop: '8px', color: 'var(--text-muted)' }}>
                            <strong>Resultat:</strong> Det beräknade gapet (Agendatryck {gapItem.agendaPressure} vs Partirespons {gapItem.partyResponse}) klassificeras som en <strong>{gapItem.conclusion}</strong>.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Horizontal Tabs Selection */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      flexWrap: 'wrap',
                      paddingBottom: '8px', 
                      borderBottom: '1px solid var(--border-color)' 
                    }}
                  >
                    {/* Party Tabs */}
                    {stances.map(s => {
                      const pColor = partyColorMap[s.party] || '#64748B';
                      const isActive = activeDimensionTab === s.party;
                      
                      return (
                        <button
                          key={s.party}
                          onClick={() => setActiveDimensionTab(s.party)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: isActive ? `1.5px solid ${pColor}` : '1.5px solid var(--border-color)',
                            background: isActive ? `${pColor}12` : 'var(--bg-main)',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            boxShadow: isActive ? `0 0 10px ${pColor}15` : 'none',
                            transition: 'all 0.15s'
                          }}
                          className="hover:bg-[var(--bg-card-hover)]"
                        >
                          <PartyLogo party={s.party} size={12} />
                          {s.party}
                          <span 
                            style={{ 
                              fontSize: '0.64rem', 
                              opacity: 0.6, 
                              background: 'rgba(255,255,255,0.08)', 
                              padding: '1px 5px', 
                              borderRadius: '4px' 
                            }}
                          >
                            {s.count}
                          </span>
                        </button>
                      );
                    })}

                    {/* Divider */}
                    <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 4px' }}></div>

                    {/* External sources tab - High visibility, styled in coral to match Agendatryck */}
                    <button
                      onClick={() => setActiveDimensionTab('Externa')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: activeDimensionTab === 'Externa' 
                          ? '1.5px solid var(--accent-coral)' 
                          : '1.5px solid rgba(255, 69, 36, 0.25)',
                        background: activeDimensionTab === 'Externa' 
                          ? 'rgba(255, 69, 36, 0.08)' 
                          : 'rgba(255, 69, 36, 0.01)',
                        color: activeDimensionTab === 'Externa' 
                          ? 'var(--text-primary)' 
                          : 'var(--accent-coral)',
                        boxShadow: activeDimensionTab === 'Externa' 
                          ? '0 0 10px rgba(255, 69, 36, 0.12)' 
                          : 'none',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                        marginLeft: 'auto'
                      }}
                      className="hover:bg-[var(--bg-card-hover)]"
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-coral)' }}></span>
                      Externa källor & utskott
                      <span 
                        style={{ 
                          fontSize: '0.64rem', 
                          opacity: 0.8, 
                          background: 'rgba(255, 69, 36, 0.08)', 
                          padding: '1px 5px', 
                          borderRadius: '4px' 
                        }}
                      >
                        {externalClaimsInDim.length}
                      </span>
                    </button>
                  </div>

                  {/* Dynamic Tab Contents */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0 }}>
                    {activeDimensionTab === 'Externa' ? (
                      // EXTERNAL SOURCES VIEW
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
                        <div className="flex justify-between items-center bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl">
                          <div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Agendatryck i denna dimension</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--accent-coral)' }}>{gapItem ? gapItem.agendaPressure : 0} / 5</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                                (Baserat på {expertClaims.length} st expertkällor)
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Aktörstyper</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 700 }}>
                              SOU, Myndigheter & Fackförbund
                            </div>
                          </div>
                        </div>
 
                        {/* List of external claims split into two lists */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: '4px' }}>
                          
                          {/* Independent External Sources Section */}
                          <div>
                            <h4 style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 800, 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.06em', 
                              color: 'var(--accent-coral)', 
                              margin: '0 0 10px 0',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>📢</span> Externa expertkällor & organisationer ({expertClaims.length} st)
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {expertClaims.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                                  Inga externa expertkällor registrerade i denna dimension.
                                </div>
                              ) : (
                                expertClaims.map(claim => (
                                  <div 
                                    key={claim.id}
                                    onClick={() => setSelectedTimelineClaim(claim)}
                                    className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-color-hover)] transition-all duration-200 flex flex-col gap-2"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div className="flex justify-between items-center text-[10px] text-gray-500">
                                      <span style={{ fontWeight: 800 }}>{claim.actor} ({claim.actorType})</span>
                                      <span>{claim.date}</span>
                                    </div>
                                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                      {claim.neutralSummary}
                                    </div>
                                    <div className="flex justify-between text-[9.5px] text-gray-500 pt-1" style={{ borderTop: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                                      <span>
                                        {(() => {
                                          const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                                          if (sourceUrl) {
                                            return (
                                              <a 
                                                href={sourceUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-sky-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                                              >
                                                {claim.source} <ExternalLink size={9} />
                                              </a>
                                            );
                                          }
                                          return claim.source;
                                        })()}
                                      </span>
                                      <span>Evidensstyrka: {claim.evidenceStrength} &bull; Vikt: {calculateClaimWeight(claim)}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
 
                          {/* Parliamentary Committees Section */}
                          <div>
                            <h4 style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 800, 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.06em', 
                              color: 'var(--text-muted)', 
                              margin: '0 0 10px 0',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>🏛️</span> Utskottsbetänkanden & riksdagsbeslut ({committeeClaims.length} st)
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {committeeClaims.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                                  Inga utskottsbetänkanden registrerade i denna dimension.
                                </div>
                              ) : (
                                committeeClaims.map(claim => (
                                  <div 
                                    key={claim.id}
                                    onClick={() => setSelectedTimelineClaim(claim)}
                                    className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-color-hover)] transition-all duration-200 flex flex-col gap-2"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div className="flex justify-between items-center text-[10px] text-gray-500">
                                      <span style={{ fontWeight: 800 }}>{claim.actor} ({claim.actorType})</span>
                                      <span>{claim.date}</span>
                                    </div>
                                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                      {claim.neutralSummary}
                                    </div>
                                    <div className="flex justify-between text-[9.5px] text-gray-500 pt-1" style={{ borderTop: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                                      <span>
                                        {(() => {
                                          const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                                          if (sourceUrl) {
                                            return (
                                              <a 
                                                href={sourceUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-sky-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                                              >
                                                {claim.source} <ExternalLink size={9} />
                                              </a>
                                            );
                                          }
                                          return claim.source;
                                        })()}
                                      </span>
                                      <span>Evidensstyrka: {claim.evidenceStrength} &bull; Vikt: {calculateClaimWeight(claim)}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
 
                        </div>
                      </div>
                    ) : (
                      // PARTY SPECIFIC VIEW
                      activeStance && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
                          {/* Party Stance Status Header Card */}
                          <div 
                            className="border p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4"
                            style={{ 
                              borderColor: `${partyColorMap[activeStance.party]}20`,
                              background: `${partyColorMap[activeStance.party]}04`
                            }}
                          >
                            <div className="flex items-center gap-4">
                              {/* Party avatar */}
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                backgroundColor: `${partyColorMap[activeStance.party]}15`,
                                border: `1.5px solid ${partyColorMap[activeStance.party]}40`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                fontWeight: 900,
                                color: partyColorMap[activeStance.party]
                              }}>
                                {activeStance.party}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Ställningsbedömning</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                  <span 
                                    className={`badge ${
                                      activeStance.status === 'Stark position' 
                                        ? 'badge-teal ai-glow' 
                                        : activeStance.status === 'Fast position' 
                                          ? 'badge-blue' 
                                          : activeStance.status === 'Preliminär position' 
                                            ? 'badge-purple' 
                                            : activeStance.status === 'Indikation' 
                                              ? 'badge-coral' 
                                              : 'badge-gray text-opacity-40'
                                    }`}
                                    style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px' }}
                                  >
                                    {activeStance.status}
                                  </span>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    (Viktat index: {activeStance.totalWeight})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Accel/Prot/Gov mini bars */}
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '70px' }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stöd/Innov.</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '40px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(activeStance.avgAccel / 5) * 100}%`, height: '100%', background: 'var(--accent-teal)' }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{activeStance.avgAccel}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '70px' }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tillsyn/Skydd</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '40px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(activeStance.avgProt / 5) * 100}%`, height: '100%', background: 'var(--accent-coral)' }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{activeStance.avgProt}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '70px' }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Statlig Styr.</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '40px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(activeStance.avgGov / 5) * 100}%`, height: '100%', background: 'var(--accent-purple)' }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{activeStance.avgGov}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Claims list */}
                          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                            <h4 style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
                              Aktiva motioner, valmanifest & utspel ({activeStance.count} st)
                            </h4>
                            {activeStance.claims.length === 0 ? (
                              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'rgba(15, 23, 42, 0.015)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                                Partiet {activeStance.party} saknar registrerade utspel eller policyförslag i denna dimension.
                              </div>
                            ) : (
                              activeStance.claims.map(claim => (
                                <div 
                                  key={claim.id}
                                  onClick={() => setSelectedTimelineClaim(claim)}
                                  className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-color-hover)] transition-all duration-200 flex flex-col gap-2"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="flex justify-between items-center text-[10px] text-gray-500">
                                    <span style={{ fontWeight: 800, color: partyColorMap[claim.partyAffiliation] }}>{claim.actor} ({claim.actorType})</span>
                                    <span>{claim.date}</span>
                                  </div>
                                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                    {claim.neutralSummary}
                                  </div>
                                  <div className="flex justify-between text-[9.5px] text-gray-500 pt-1" style={{ borderTop: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                                    <span>
                                      {(() => {
                                        const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                                        if (sourceUrl) {
                                          return (
                                            <a 
                                              href={sourceUrl} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="text-sky-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                                            >
                                              {claim.source} <ExternalLink size={9} />
                                            </a>
                                          );
                                        }
                                        return claim.source;
                                      })()}
                                    </span>
                                    <span>Evidensstyrka: {claim.evidenceStrength} &bull; Vikt: {calculateClaimWeight(claim)}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              );
            })()}
            {/* Footer */}
            <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button 
                onClick={() => {
                  setSelectedDimensionId(null);
                  onNavigate('databas');
                }}
                className="btn btn-secondary text-xs"
                style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--accent-teal)', border: '1px solid rgba(0, 230, 207, 0.2)', padding: '8px 16px' }}
              >
                Gräv djupare i källbiblioteket &rarr;
              </button>
              <button 
                onClick={() => setSelectedDimensionId(null)} 
                className="btn btn-secondary text-xs"
                style={{ padding: '8px 16px' }}
              >
                Stäng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header Explanations portal */}
      {hoveredHeaderTooltip && createPortal(
        <div 
          style={{
            position: 'fixed',
            left: `${headerTooltipPos.x}px`,
            top: `${headerTooltipPos.y}px`,
            transform: 'translateX(-50%) translateY(-100%)',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(24px)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '12px',
            padding: '10px 14px',
            width: '240px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            zIndex: 10000,
            fontSize: '0.78rem',
            color: '#ffffff',
            transition: 'opacity 0.15s ease',
            lineHeight: '1.4',
            whiteSpace: 'normal',
            textAlign: 'left'
          }}
        >
          {hoveredHeaderTooltip}
        </div>,
        document.body
      )}
    </div>
  );
};
