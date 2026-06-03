import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ClaimCard, PartyAffiliation, UserStance } from '../types';
import { PartyLogo } from '../utils/partyAssets';
import { partyColorMap, partyNames } from '../utils/partyConstants';
import { aggregatePartyProfiles, performGapAnalysis, calculateClaimWeight, evaluatePartyStanceStatus, isPolicyClaim } from '../utils/scoring';
import { lockedDimensions } from '../data/mockClaims';
import { 
  TrendingUp, AlertCircle, ShieldAlert, Award, FileText, 
  CheckCircle, ArrowRight, X, Calendar, Users, PieChart, Search, ExternalLink 
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

  // Actor exploring states
  const [showAllActorsModal, setShowAllActorsModal] = useState<boolean>(false);
  const [selectedActorClaims, setSelectedActorClaims] = useState<string | null>(null);
  const [actorSearchQuery, setActorSearchQuery] = useState<string>('');

  // Dimension exploring states
  const [selectedDimensionId, setSelectedDimensionId] = useState<number | null>(null);
  const [activeDimensionTab, setActiveDimensionTab] = useState<string>('S');

  // Quick stats
  const totalClaims = claims.length;
  const reviewedClaims = claims.filter(c => ['Granskad', 'Kalibrerad', 'Låst'].includes(c.reviewStatus)).length;
  
  // Find highest agenda pressure
  const highestAgenda = [...gapAnalysis].sort((a, b) => b.agendaPressure - a.agendaPressure)[0];
  
  // Find most active party
  const activeParty = [...partyProfiles].sort((a, b) => b.claimCount - a.claimCount)[0];

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
        const w = calculateClaimWeight(c);
        totalWeight += w;
        accelSum += c.accelerationContribution || 0;
        protSum += c.protectionContribution || 0;
        govSum += c.stateGovernanceContribution || 0;
      });

      const status = evaluatePartyStanceStatus(partyClaimsInDim, totalWeight);
      
      return {
        party,
        status,
        count,
        totalWeight: Math.round(totalWeight * 10) / 10,
        avgAccel: count > 0 ? Math.round((accelSum / count) * 10) / 10 : 0,
        avgProt: count > 0 ? Math.round((protSum / count) * 10) / 10 : 0,
        avgGov: count > 0 ? Math.round((govSum / count) * 10) / 10 : 0,
        claims: partyClaimsInDim.sort((a, b) => b.date.localeCompare(a.date))
      };
    });
  };

  return (
    <div className="animate-slide flex flex-col gap-8">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">AI-Politiskt Analyscenter</h1>
          <p className="page-subtitle">
            Högteknologiskt gränssnitt för att spåra partiers positioner och vägledande trender inför riksdagsvalet 2026.
          </p>
        </div>
        <div className="status-indicator">
          <span className="sidebar-logo-indicator ai-glow"></span>
          LÖPANDE MONITOR AKTIV
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
            <div className="stats-card-label">Bevakade Claims</div>
          </div>
        </div>

        <div className="glass-panel stats-card">
          <div className="stats-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="flex flex-col">
            <div className="stats-card-value">{reviewedClaims}</div>
            <div className="stats-card-label">Kvalitetssäkrade</div>
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
            <div className="stats-card-label">Högst Agendapress</div>
          </div>
        </div>

        <div className="glass-panel stats-card">
          <div className="stats-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
            <Award size={22} />
          </div>
          <div className="flex flex-col">
            <div className="stats-card-value">
              {activeParty ? `${activeParty.party} (${activeParty.claimCount})` : 'Ingen'}
            </div>
            <div className="stats-card-label">Mest Aktiva Parti</div>
          </div>
        </div>
      </div>

      {/* Grid: SVG Plot and Analytical Insights */}
      <div className="dashboard-grid">
        {/* SVG Plot Panel */}
        <div className="glass-panel p-6 flex flex-col gap-6" style={{ borderTop: '3px solid var(--accent-teal)' }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Valkartan / Fyrfältaren v3</h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Aggregerad position beräknad från vägda claimbidrag. Klicka på en partiprodukt för djupevidens.
            </p>
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
                stroke="rgba(255,255,255,0.06)" 
                strokeWidth={1}
              />

              {/* Quadrant Heading labels */}
              <text x={padding + 10} y={padding + 22} className="svg-axis-label" textAnchor="start">Tillsyn & Säkerhet</text>
              <text x={size - padding - 10} y={padding + 22} className="svg-axis-label" textAnchor="end">Statsledd Skydd</text>
              <text x={padding + 10} y={size - padding - 10} className="svg-axis-label" textAnchor="start">Teknikrestriktiv</text>
              <text x={size - padding - 10} y={size - padding - 10} className="svg-axis-label" textAnchor="end">Marknadsacceleration</text>

              {/* Outer Axis Title Labels */}
              <text x={size / 2} y={size - 14} className="svg-axis-heading" textAnchor="middle">AI-Acceleration &rarr;</text>
              <text x={18} y={size / 2} className="svg-axis-heading" textAnchor="middle" transform={`rotate(-90 18 ${size/2})`}>Skydd & Styrning &rarr;</text>

              {/* Party Dots */}
              {partyProfiles.map(p => {
                if (p.status === 'Ingen bedömning' && p.accelerationScore === 0 && p.protectionScore === 0) return null;

                const yVal = (p.protectionScore + p.governanceScore) / 2;
                const x = getXCoord(p.accelerationScore);
                const y = getYCoord(yVal);

                // Evidens count affects size of ring
                const ringRadius = 14 + Math.min(10, p.claimCount * 1.5);

                return (
                  <g 
                    key={p.party} 
                    className="svg-dot-group"
                    onClick={() => handlePartyDotClick(p.party)}
                  >
                    {/* Pulsing evidens ring */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={ringRadius} 
                      fill="none" 
                      className={`svg-dot-ring party-${p.party}`}
                    />
                    
                    {/* Glowing shadow circle */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={10} 
                      fill="currentColor" 
                      className={`party-${p.party}`} 
                      opacity="0.35"
                    />

                    {/* Main filled dot */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={11} 
                      className={`svg-dot-circle party-${p.party}`}
                    />

                    {/* Text initials inside */}
                    <text 
                      x={x} 
                      y={y + 3.5} 
                      textAnchor="middle" 
                      fill={['SD', 'MP'].includes(p.party) ? '#000' : '#fff'}
                      fontSize="9px" 
                      fontWeight="800"
                      fontFamily="var(--font-heading)"
                      pointerEvents="none"
                    >
                      {p.party}
                    </text>
                  </g>
                );
              })}

              {/* User Compass Position (Plotted if completed) */}
              {userStance && (
                <g className="svg-dot-group user-node">
                  {/* Glowing Pulse Rings */}
                  <circle 
                    cx={getXCoord(userStance.accelerationScore)} 
                    cy={getYCoord((userStance.protectionScore + userStance.governanceScore) / 2)} 
                    r={20} 
                    fill="none" 
                    stroke="var(--accent-teal)" 
                    strokeWidth={2}
                    className="animate-ping"
                    style={{ animationDuration: '3s', opacity: 0.6 }}
                  />
                  <circle 
                    cx={getXCoord(userStance.accelerationScore)} 
                    cy={getYCoord((userStance.protectionScore + userStance.governanceScore) / 2)} 
                    r={13} 
                    fill="var(--accent-teal)" 
                    opacity="0.25"
                    className="animate-pulse"
                  />
                  {/* Main filled dot */}
                  <circle 
                    cx={getXCoord(userStance.accelerationScore)} 
                    cy={getYCoord((userStance.protectionScore + userStance.governanceScore) / 2)} 
                    r={11} 
                    fill="var(--accent-teal)"
                    stroke="#fff"
                    strokeWidth={1.5}
                    style={{ filter: 'drop-shadow(0 0 8px var(--accent-teal))' }}
                  />
                  {/* Text initials inside */}
                  <text 
                    cx={getXCoord(userStance.accelerationScore)} 
                    cy={getYCoord((userStance.protectionScore + userStance.governanceScore) / 2) + 3.5} 
                    x={getXCoord(userStance.accelerationScore)}
                    y={getYCoord((userStance.protectionScore + userStance.governanceScore) / 2) + 3.5}
                    textAnchor="middle" 
                    fill="#000"
                    fontSize="9px" 
                    fontWeight="900"
                    fontFamily="var(--font-heading)"
                    pointerEvents="none"
                  >
                    DU
                  </text>
                </g>
              )}
            </svg>
          </div>

          <div className="flex flex-wrap gap-2 justify-center border-t border-white/5 pt-4">
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
        </div>

        {/* Side Panel: Intelligence Insights */}
        <div className="glass-panel p-6 flex flex-col gap-6">
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>AI-politiskt Lägesrapport</h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Analys och dolda konfliktlinjer inför riksdagsvalet 2026.</p>
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
          <div className="border-t border-white/5 pt-4 mt-auto">
            <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Arbetsflöde v3-Modellen</h4>
            <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex-grow p-3 bg-white/5 rounded-lg border border-white/5">
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>1. Hämta API</div>
                Ladda ner riksdagsdata varje vecka med fetch-skriptet.
              </div>
              <div className="flex-grow p-3 bg-white/5 rounded-lg border border-white/5">
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>2. Kalibrera</div>
                Granska policygrad 2-3 i assistenten för att aktivera claims.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Dashboard Grid: Leaderboard & Source categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '32px' }}>
        {/* Top Speakers Leaderboard Panel */}
        <div className="glass-panel p-6 flex flex-col gap-6" style={{ borderTop: '3px solid var(--accent-blue)', borderRadius: '20px' }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--accent-blue)' }} />
              Topp 5 AI-Politiska Debattörer
            </h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              De enskilda politiker och talespersoner som har registrerat flest unika utspel och ställningstaganden.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {(() => {
              const topActors = getTopActors(claims);
              return topActors.map((actor, index) => {
                const pColor = partyColorMap[actor.party as PartyAffiliation] || '#64748B';
                const rankColors = ['#F59E0B', '#94A3B8', '#D97706', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'];
                const rankBorder = index < 3 ? `2px solid ${rankColors[index]}` : '1px solid rgba(255,255,255,0.1)';
                const maxClaims = topActors[0]?.claimCount || 1;
                const widthPercent = (actor.claimCount / maxClaims) * 100;

                return (
                  <div 
                    key={actor.actor} 
                    onClick={() => setSelectedActorClaims(actor.actor)}
                    className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.005] hover:bg-white/[0.015] hover:border-white/10 transition-all duration-200"
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
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {actor.claimCount} st utspel
                        </span>
                      </div>
                    </div>

                    {/* Avg Evidence Strength Badge */}
                    <div style={{ textAlign: 'right', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
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
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold w-full"
              style={{ color: 'var(--accent-blue)', marginTop: '8px' }}
            >
              Visa alla debattörer ({getTopActors(claims, 1000).length} st) <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Source Categories Panel */}
        <div className="glass-panel p-6 flex flex-col gap-6" style={{ borderTop: '3px solid var(--accent-purple)', borderRadius: '20px' }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={18} style={{ color: 'var(--accent-purple)' }} />
              Käll- & Dokumentfördelning
            </h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Statistisk fördelning av de 349 AI-politiska källorna efter typ av handling och forum.
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
                  'Debattartikel': '#E2E8F0',
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
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${stat.percent}%`, 
                            height: '100%', 
                            backgroundColor: color,
                            boxShadow: `0 0 8px ${color}`
                          }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Summary footer for the sources */}
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Gap-analys: Agendatryck vs. Partirespons</h2>
            <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Sömlös jämförelse mellan externa krav (remisser, debatter) och riksdagspartiernas aktiva gensvar.
            </p>
          </div>
          <span className="badge badge-purple">12 LÅSTA DIMENSIONER</span>
        </div>

        <div className="overflow-x-auto">
          <table className="gap-table">
            <thead>
              <tr>
                <th className="gap-table-th">AI-Dimension</th>
                <th className="gap-table-th text-center" style={{ width: '220px' }}>Agendatryck (Externa aktörer)</th>
                <th className="gap-table-th text-center" style={{ width: '220px' }}>Partirespons (Viktat index)</th>
                <th className="gap-table-th">Gap-bedömning</th>
                <th className="gap-table-th text-right">Inlägg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {gapAnalysis.map(item => (
                <tr 
                  key={item.dimensionId} 
                  onClick={() => {
                    setSelectedDimensionId(item.dimensionId);
                    const stances = getPartyStancesInDimension(item.dimensionId);
                    const firstWithClaims = stances.find(s => s.count > 0);
                    setActiveDimensionTab(firstWithClaims ? firstWithClaims.party : 'S');
                  }}
                  className="hover:bg-white/[0.02] transition-colors"
                  style={{ cursor: 'pointer' }}
                >
                  <td className="gap-table-td gap-dim-name">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-white">{item.dimensionId}. {item.dimensionName}</span>
                      <span className="text-[10px] text-gray-500 font-normal">Klicka för att se partiernas ställningstaganden</span>
                    </div>
                  </td>
                  <td className="gap-table-td">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="gap-progress-bar">
                        <div 
                          className="gap-fill-coral" 
                          style={{ width: `${(item.agendaPressure / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-extrabold text-coral-400 text-[10px]">{item.agendaPressure} / 5</span>
                    </div>
                  </td>
                  <td className="gap-table-td">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="gap-progress-bar">
                        <div 
                          className="gap-fill-teal" 
                          style={{ width: `${(item.partyResponse / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-extrabold text-teal-400 text-[10px]">{item.partyResponse} / 5</span>
                    </div>
                  </td>
                  <td className="gap-table-td">
                    <span 
                      className={`badge ${
                        item.conclusion.includes('Tyst') 
                          ? 'badge-coral ai-glow' 
                          : item.conclusion.includes('Etablerad') 
                            ? 'badge-teal' 
                            : item.conclusion.includes('Blind') 
                              ? 'badge-gray text-opacity-40' 
                              : 'badge-purple'
                      }`}
                    >
                      {item.conclusion}
                    </span>
                  </td>
                  <td className="gap-table-td text-right font-bold text-gray-300">
                    {item.expertClaimCount} st
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Horizontal Interactive Timeline Panel */}
      <div className="glass-panel w-full flex flex-col gap-6 animate-slide" style={{ marginTop: '32px', padding: '24px', borderRadius: '20px' }}>
        <div className="flex justify-between items-center flex-wrap gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
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
          <div style={{ minWidth: '950px', position: 'relative', height: '390px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)', padding: '20px 40px' }}>
            
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
                          backgroundColor: isEven ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                          borderLeft: '1px dashed rgba(255, 255, 255, 0.08)',
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
                      borderLeft: '1px dashed rgba(255, 255, 255, 0.08)'
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
                        <div style={{ position: 'absolute', left: '120px', right: '40px', height: '1px', background: 'rgba(255,255,255,0.03)', top: '12px' }}>
                          
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
                                  transform: `translate(-50%, -50%) ${isHovered ? 'scale(1.5)' : 'scale(1)'}`,
                                  top: '50%',
                                  width: `${dotSize}px`,
                                  height: `${dotSize}px`,
                                  borderRadius: '50%',
                                  backgroundColor: pColor,
                                  boxShadow: isHovered ? `0 0 15px ${pColor}, 0 0 5px #fff` : `0 0 5px ${pColor}`,
                                  border: isHovered ? '1.5px solid #fff' : '1px solid rgba(255,255,255,0.3)',
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
            background: 'rgba(6, 8, 18, 0.92)',
            backdropFilter: 'blur(24px)',
            border: `1.5px solid ${partyColorMap[hoveredTimelineClaim.partyAffiliation] || 'var(--accent-teal)'}`,
            borderRadius: '14px',
            padding: '12px',
            width: '260px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            zIndex: 10000,
            fontSize: '0.78rem',
            color: 'var(--text-primary)',
            transition: 'opacity 0.15s ease'
          }}
        >
          <div className="flex justify-between items-center text-[10px] pb-1.5 mb-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="flex items-center gap-1.5 font-extrabold" style={{ color: partyColorMap[hoveredTimelineClaim.partyAffiliation] }}>
              <PartyLogo party={hoveredTimelineClaim.partyAffiliation} size={12} />
              {hoveredTimelineClaim.partyAffiliation}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {hoveredTimelineClaim.date}
            </span>
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8rem', lineHeight: '1.25' }}>
            {hoveredTimelineClaim.neutralSummary}
          </div>
          <div className="flex justify-between text-[9px] text-gray-500 pt-1.5 mt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
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
            backgroundColor: 'rgba(3, 4, 9, 0.8)',
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
              border: '1.5px solid rgba(255,255,255,0.08)',
              background: 'rgba(6, 8, 18, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-start" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px' }}>
                    {selectedTimelineClaim.id}
                  </span>
                  <span className="badge badge-teal" style={{ background: selectedTimelineClaim.reviewStatus === 'Granskad' ? 'rgba(59, 130, 246, 0.15)' : selectedTimelineClaim.reviewStatus === 'Kalibrerad' ? 'rgba(0, 230, 207, 0.15)' : 'rgba(255,255,255,0.04)', color: selectedTimelineClaim.reviewStatus === 'Granskad' ? 'var(--accent-blue)' : selectedTimelineClaim.reviewStatus === 'Kalibrerad' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
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
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '16px', fontStyle: 'italic', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
              &rdquo;{selectedTimelineClaim.originalQuote}&rdquo;
            </div>

            {/* Summary */}
            <div className="flex flex-col gap-1.5">
              <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Neutral sammanfattning</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0px', lineHeight: '1.35' }}>{selectedTimelineClaim.neutralSummary}</p>
            </div>

            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '0.82rem', padding: '16px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
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
                    onNavigate('assistent');
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
            backgroundColor: 'rgba(3, 4, 9, 0.8)',
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
              border: '1.5px solid rgba(255,255,255,0.08)',
              background: 'rgba(6, 8, 18, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
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
                className="focus:border-blue-500/50 focus:bg-white/[0.04]"
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
                      className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.005] hover:bg-white/[0.02] hover:border-white/10 transition-all duration-200"
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
                        border: isTop3 ? `2px solid ${rankColors[idx]}` : '1px solid rgba(255,255,255,0.06)',
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
            <div className="flex justify-end pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
            backgroundColor: 'rgba(3, 4, 9, 0.8)',
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
              border: '1.5px solid rgba(255,255,255,0.08)',
              background: 'rgba(6, 8, 18, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
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
                      className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.025] hover:border-white/10 transition-all duration-200 flex flex-col gap-2.5"
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
            backgroundColor: 'rgba(3, 4, 9, 0.8)',
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
              border: '1.5px solid rgba(255,255,255,0.08)',
              background: 'rgba(6, 8, 18, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
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

                  {/* Horizontal Tabs Selection */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      overflowX: 'auto', 
                      paddingBottom: '8px', 
                      borderBottom: '1px solid rgba(255,255,255,0.04)' 
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
                            border: isActive ? `1.5px solid ${pColor}` : '1.5px solid rgba(255,255,255,0.05)',
                            background: isActive ? `${pColor}12` : 'rgba(255,255,255,0.01)',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            boxShadow: isActive ? `0 0 10px ${pColor}15` : 'none',
                            transition: 'all 0.15s'
                          }}
                          className="hover:bg-white/[0.03]"
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
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 4px' }}></div>

                    {/* External sources tab */}
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
                        border: activeDimensionTab === 'Externa' ? '1.5px solid #64748B' : '1.5px solid rgba(255,255,255,0.05)',
                        background: activeDimensionTab === 'Externa' ? 'rgba(100,116,139,0.12)' : 'rgba(255,255,255,0.01)',
                        color: activeDimensionTab === 'Externa' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: activeDimensionTab === 'Externa' ? '0 0 10px rgba(100,116,139,0.15)' : 'none',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap'
                      }}
                      className="hover:bg-white/[0.03]"
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748B' }}></span>
                      Externa källor
                      <span 
                        style={{ 
                          fontSize: '0.64rem', 
                          opacity: 0.6, 
                          background: 'rgba(255,255,255,0.08)', 
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
                        <div className="flex justify-between items-center bg-white/[0.005] border border-white/5 p-4 rounded-2xl">
                          <div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Agendatryck i denna dimension</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--accent-coral)' }}>{gapItem ? gapItem.agendaPressure : 0} / 5</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                                (Baserat på {externalClaimsInDim.length} st expertkällor)
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Aktörstyper</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 700 }}>
                              SOU, Myndigheter & Utskott
                            </div>
                          </div>
                        </div>

                        {/* List of external claims */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                          <h4 style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
                            Registrerade expertrapporter & utskottsbetänkanden
                          </h4>
                          {externalClaimsInDim.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                              Inga externa utspel registrerade i denna dimension.
                            </div>
                          ) : (
                            externalClaimsInDim.map(claim => (
                              <div 
                                key={claim.id}
                                onClick={() => setSelectedTimelineClaim(claim)}
                                className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.025] hover:border-white/10 transition-all duration-200 flex flex-col gap-2"
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="flex justify-between items-center text-[10px] text-gray-500">
                                  <span style={{ fontWeight: 800 }}>{claim.actor} ({claim.actorType})</span>
                                  <span>{claim.date}</span>
                                </div>
                                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                  {claim.neutralSummary}
                                </div>
                                <div className="flex justify-between text-[9.5px] text-gray-500 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }} onClick={(e) => e.stopPropagation()}>
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
                                  <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(activeStance.avgAccel / 5) * 100}%`, height: '100%', background: 'var(--accent-teal)' }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{activeStance.avgAccel}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '70px' }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tillsyn/Skydd</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(activeStance.avgProt / 5) * 100}%`, height: '100%', background: 'var(--accent-coral)' }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{activeStance.avgProt}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '70px' }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Statlig Styr.</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
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
                              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'rgba(255,255,255,0.005)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                                Partiet {activeStance.party} saknar registrerade utspel eller policyförslag i denna dimension.
                              </div>
                            ) : (
                              activeStance.claims.map(claim => (
                                <div 
                                  key={claim.id}
                                  onClick={() => setSelectedTimelineClaim(claim)}
                                  className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.025] hover:border-white/10 transition-all duration-200 flex flex-col gap-2"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="flex justify-between items-center text-[10px] text-gray-500">
                                    <span style={{ fontWeight: 800, color: partyColorMap[claim.partyAffiliation] }}>{claim.actor} ({claim.actorType})</span>
                                    <span>{claim.date}</span>
                                  </div>
                                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                    {claim.neutralSummary}
                                  </div>
                                  <div className="flex justify-between text-[9.5px] text-gray-500 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }} onClick={(e) => e.stopPropagation()}>
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
            <div className="flex justify-end pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
    </div>
  );
};
