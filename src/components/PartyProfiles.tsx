import React from 'react';
import type { ClaimCard, PartyAffiliation } from '../types';
import { aggregatePartyProfiles, calculateClaimWeight, calculateClaimWeightsMap, calculateDimensionOpposites } from '../utils/scoring';
import { lockedDimensions } from '../data/mockClaims';
import { Award, Shield, Cpu, BarChart2, ExternalLink, GitCompare, RefreshCw, Info } from 'lucide-react';

interface PartyProfilesProps {
  claims: ClaimCard[];
  selectedParty: PartyAffiliation;
  onSelectParty: (party: PartyAffiliation) => void;
}

import { PartyLogo } from '../utils/partyAssets';
import { partyColorMap, partyNames } from '../utils/partyConstants';

const statusDescriptions: Record<string, string> = {
  'Ingen bedömning': 'Färre än 2 relevanta claims har identifierats. Det går inte att göra en rättvis bedömning av partiets AI-politiska linje för närvarande.',
  'Indikation': 'Det finns en indikation på partiets inställning, men underlaget är fortfarande svagt och bygger främst på enskilda kommentarer eller intervjuer.',
  'Preliminär position': 'Partiet har en preliminär position. Flera claims har dokumenterats, varav minst ett med hög partibäring eller tung källvikt.',
  'Fast position': 'Partiets linje är tydligt belagd över tid med stöd av officiella motioner eller regeringsunderlag. Linjen framstår som konsekvent.',
  'Stark position': 'Partiet driver en mycket stark position med spikad officiell linje, återkommande riksdagsförslag och skarpa åtgärdsförslag (policygrad 3).'
};

interface OfficialProgramDetails {
  hasProgram: 'Ja' | 'Nej' | 'Delvis' | 'Regeringsansvar';
  programTitle: string;
  description: string;
  sourceUrl: string;
  sourceLabel: string;
  keyProposal: string;
  partyWebsiteUrl?: string;
  partyWebsiteLabel?: string;
}

const officialPartyPrograms: Record<string, OfficialProgramDetails | null> = {
  S: {
    hasProgram: 'Delvis',
    programTitle: 'Socialdemokraternas digitala välfärdsstrategi',
    description: 'Socialdemokraterna driver ingen separat AI-politisk plattform, men har integrerat AI och digitalisering som en kärnpunkt i sitt välfärds- och omställningsprogram inför 2026, med fokus på anställdas vidareutbildning och rättssäkra algoritmer i offentlig tjänst.',
    sourceUrl: 'https://data.riksdagen.se/dokument/H8022830.html',
    sourceLabel: 'Riksdagsmotion 2020/21:2830',
    keyProposal: 'Skatteavdrag för anställdas AI-omställning samt krav på mänsklig överprövning vid algoritmiskt beslutsfattande i välfärden.',
    partyWebsiteUrl: 'https://www.socialdemokraterna.se/var-politik/a-till-o/ai',
    partyWebsiteLabel: 'S-politik på socialdemokraterna.se'
  },
  M: {
    hasProgram: 'Regeringsansvar',
    programTitle: 'Moderaternas regeringsprogram för tech & innovation',
    description: 'Moderaterna leder regeringsarbetet med implementeringen av EU:s AI Act och fokuserar på regelförenklingar, innovationssandlådor samt att främja svensk konkurrenskraft under digitaliseringsminister Erik Slottner.',
    sourceUrl: 'https://www.regeringen.se/regeringsuppdrag/2024/08/uppdrag-till-myndigheten-for-digital-forvaltning-och-integritetsskyddsmyndigheten-att-ta-fram-riktlinjer-for-anvandningen-av-generativ-artificiell-intelligens-inom-den-offentliga-forvaltningen/',
    sourceLabel: 'Regeringens AI-samordningsuppdrag',
    keyProposal: 'Inrättandet av en nationell AI-samordning under Digg samt införande av regulatoriska sandlådor för start-ups under AI Act.',
    partyWebsiteUrl: 'https://moderaterna.se/var-politik/',
    partyWebsiteLabel: 'M-politik på moderaterna.se'
  },
  SD: {
    hasProgram: 'Delvis',
    programTitle: 'Sverigedemokraternas säkerhetsplattform 2026',
    description: 'Sverigedemokraterna har integrerat AI-risker i sitt nationella säkerhets- och valmanifest för 2026, med fokus på deepfakes, desinformation och cybersäkerhetsmandat för Säpo.',
    sourceUrl: 'https://data.riksdagen.se/dokument/H8023167.html',
    sourceLabel: 'Riksdagsmotion 2020/21:3167',
    keyProposal: 'Utökade befogenheter till Säpo för övervakning av AI-genererad utländsk valpåverkan och desinformationskampanjer.',
    partyWebsiteUrl: 'https://www.sd.se/',
    partyWebsiteLabel: 'SD-politik på sd.se'
  },
  C: {
    hasProgram: 'Ja',
    programTitle: 'Centerpartiets nationella AI-strategi',
    description: 'Centerpartiet har tagit fram en av de mest konkreta oppositionspolitisma plattformarna för AI, med förslag om miljardsatsningar på nationella forskningscenter och en balanserad upphovsrättsmodell.',
    sourceUrl: 'https://data.riksdagen.se/dokument/H7023260.html',
    sourceLabel: 'Riksdagsmotion 2019/20:3260',
    keyProposal: '3 miljarder kronor till ett nationellt AI-center i Linköping samt inrättandet av ett kollektivt upphovsrättslicenssystem för AI-träning.',
    partyWebsiteUrl: 'https://www.centerpartiet.se/centerpartiets-politik/centerpartiets-politik-a-o/digitalisering',
    partyWebsiteLabel: 'C-politik på centerpartiet.se'
  },
  V: {
    hasProgram: 'Delvis',
    programTitle: 'Vänsterpartiets motion för rättvis digitalisering',
    description: 'Vänsterpartiet saknar ett separat AI-dokument men har en välutvecklad motion i riksdagen om digitaliseringens samhällseffekter, med skarpa krav mot ansiktsigenkänning och förslag om AI-skatt.',
    sourceUrl: 'https://data.riksdagen.se/dokument/HD023947.html',
    sourceLabel: 'Riksdagsmotion 2025/26:3947',
    keyProposal: 'Strikt förbud mot biometrisk ansiktsigenkänning i realtid hos polisen samt utredning av en statlig AI-skatt på automatiserat kapital.',
    partyWebsiteUrl: 'https://www.vansterpartiet.se/var-politik/politik-a-o/ai/',
    partyWebsiteLabel: 'V-politik på vansterpartiet.se'
  },
  MP: {
    hasProgram: 'Ja',
    programTitle: 'Miljöpartiets Gröna AI-politik',
    description: 'Miljöpartiet har ett dedikerat politiskt program för AI ("En grön AI-politik") som balanserar teknisk potential för klimatomställning mot stenhårda hållbarhetskrav på datacenter.',
    sourceUrl: 'https://data.riksdagen.se/dokument/HD023425.html',
    sourceLabel: 'Miljöpartiets Motion 2025/26:3425',
    keyProposal: 'Tvingande klimatkrav och spillvärmeåtervinning på datacenter samt statliga anslag reserverade för öppen och etisk AI.',
    partyWebsiteUrl: 'https://www.mp.se/politik/en-gron-ai-politik/',
    partyWebsiteLabel: 'MP-politik på mp.se'
  },
  L: {
    hasProgram: 'Ja',
    programTitle: 'Liberalernas AI- och utbildningsinitiativ',
    description: 'Liberalerna har en framträdande AI-linje driven av Helena Gellerman, med fokus på AI-kompetens i hela befolkningen, innovationszoner i välfärden och skolan som en testbädd.',
    sourceUrl: 'https://data.riksdagen.se/dokument/H8023808.html',
    sourceLabel: 'Riksdagsmotion 2020/21:3808',
    keyProposal: 'Införandet av en "hem-chatt-reform" med skatteavdrag för AI-utbildning och inrättandet av regionala innovationsområden för etisk AI.',
    partyWebsiteUrl: 'https://www.liberalerna.se/politik/ai',
    partyWebsiteLabel: 'L-politik på liberalerna.se'
  },
  KD: {
    hasProgram: 'Regeringsansvar',
    programTitle: 'Kristdemokraternas digitaliseringslinje',
    description: 'Som partiet som innehar digitaliseringsministerposten fokuserar Kristdemokraterna på praktisk tillämpning av AI i den offentliga förvaltningen samt reella infrastruktursatsningar för techsektorn.',
    sourceUrl: 'https://data.riksdagen.se/dokument/HD023667.html',
    sourceLabel: 'Riksdagsmotion 2025/26:3667',
    keyProposal: 'Skatteavdrag för företagsinvesteringar i AI-diagnostik och beräkningskapacitet samt ökad samordning av statliga hälsodata.',
    partyWebsiteUrl: 'https://kristdemokraterna.se/var-politik/a-till-o/',
    partyWebsiteLabel: 'KD-politik på kristdemokraterna.se'
  },
  Externt: null
};

export const PartyProfiles: React.FC<PartyProfilesProps> = ({
  claims,
  selectedParty,
  onSelectParty
}) => {
  const [viewMode, setViewMode] = React.useState<'single' | 'compare'>('single');
  const [comparedParties, setComparedParties] = React.useState<PartyAffiliation[]>(['S', 'M']);

  // Sorting states for the claims table
  type SortColumn = 'date' | 'source' | 'quote' | 'policyDegree' | 'partyBearing' | 'weight';
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  // Weights map and opposites calculations
  const claimWeightsMap = React.useMemo(() => calculateClaimWeightsMap(claims), [claims]);
  const dimensionOpposites = React.useMemo(() => calculateDimensionOpposites(claims), [claims]);

  // Filter party claims unconditional for React rules
  const partyClaims = React.useMemo(() => {
    return claims.filter(c => c.partyAffiliation === selectedParty && !c.nearAiFlag && !c.campaignPracticeFlag && !c.externalPressureFlag);
  }, [claims, selectedParty]);

  const sortedClaims = React.useMemo(() => {
    const claimsCopy = [...partyClaims];
    return claimsCopy.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          if (comparison === 0) {
            comparison = a.id.localeCompare(b.id);
          }
          break;
        case 'source':
          comparison = a.source.localeCompare(b.source);
          if (comparison === 0) {
            comparison = a.actor.localeCompare(b.actor);
          }
          break;
        case 'quote':
          comparison = a.originalQuote.localeCompare(b.originalQuote);
          break;
        case 'policyDegree':
          comparison = a.policyDegree - b.policyDegree;
          break;
        case 'partyBearing': {
          const bearingOrder: Record<string, number> = { 'Låg': 1, 'Medel': 2, 'Hög': 3 };
          const bearingA = bearingOrder[a.partyBearing] || 0;
          const bearingB = bearingOrder[b.partyBearing] || 0;
          comparison = bearingA - bearingB;
          break;
        }
        case 'weight':
          comparison = (claimWeightsMap.get(a.id) || 0) - (claimWeightsMap.get(b.id) || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [partyClaims, sortColumn, sortDirection, claimWeightsMap]);

  // Aggregate profiles and find selected
  const partyProfiles = React.useMemo(() => aggregatePartyProfiles(claims), [claims]);
  const profile = React.useMemo(() => partyProfiles.find(p => p.party === selectedParty), [partyProfiles, selectedParty]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const renderHeader = (label: string, column: SortColumn, align: 'left' | 'center' | 'right' = 'left') => {
    const isActive = sortColumn === column;
    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
    
    return (
      <th 
        className={`gap-table-th ${alignClass} group hover:bg-[rgba(15,23,42,0.02)]`}
        onClick={() => handleSort(column)}
        style={{ 
          cursor: 'pointer', 
          userSelect: 'none',
          transition: 'color 0.2s, background-color 0.2s',
          backgroundColor: isActive ? 'rgba(15, 23, 42, 0.03)' : 'transparent',
        }}
      >
        <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          <span 
            className={`transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}
            style={{ 
              color: isActive ? 'var(--accent-teal)' : 'var(--text-muted)',
              fontSize: '0.65rem',
            }}
          >
            {isActive ? (sortDirection === 'asc' ? '▲' : '▼') : '▲'}
          </span>
        </div>
      </th>
    );
  };

  // Safe early-exit check if profile doesn't exist (done AFTER all hook declarations)
  if (!profile) {
    return <div className="glass-panel p-6 text-center" style={{ color: 'var(--text-primary)' }}>Partiprofil kunde inte hittas.</div>;
  }

  // Also get B and C claims for supplementary stats
  const countTrackB = claims.filter(c => c.partyAffiliation === selectedParty && c.nearAiFlag).length;
  const countTrackC = claims.filter(c => c.partyAffiliation === selectedParty && c.campaignPracticeFlag).length;

  const partyColor = partyColorMap[selectedParty] || 'var(--accent-teal)';

  // Comparison calculations
  const comparedProfiles = partyProfiles.filter(p => comparedParties.includes(p.party));

  // Compute comparison insights
  let maxDiff = -1;
  let maxDiffDimId = 1;
  let minDiff = 10;
  let minDiffDimId = 1;
  let maxClaims = -1;
  let maxClaimsDimId = 1;

  lockedDimensions.forEach(d => {
    const scores = comparedProfiles.map(p => p.dimensionScores[d.id] || 0);
    const counts = comparedProfiles.map(p => p.dimensionClaimsCount[d.id] || 0);
    const combinedCount = counts.reduce((sum, c) => sum + c, 0);

    if (scores.length > 1) {
      const diff = Math.max(...scores) - Math.min(...scores);
      if (diff > maxDiff) {
        maxDiff = diff;
        maxDiffDimId = d.id;
      }
      
      const allActive = counts.every(c => c > 0);
      if (allActive && diff < minDiff) {
        minDiff = diff;
        minDiffDimId = d.id;
      }
    }

    if (combinedCount > maxClaims) {
      maxClaims = combinedCount;
      maxClaimsDimId = d.id;
    }
  });

  const maxDiffDim = lockedDimensions.find(d => d.id === maxDiffDimId);
  const minDiffDim = lockedDimensions.find(d => d.id === minDiffDimId);
  const maxClaimsDim = lockedDimensions.find(d => d.id === maxClaimsDimId);

  return (
    <div className="animate-slide flex flex-col gap-8">
      {/* Header */}
      <div className="page-header flex justify-between items-center flex-wrap gap-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
        <div className="page-header-info">
          <h1 className="page-title">Partiprofiler & Jämförelser</h1>
          <p className="page-subtitle">
            Här kan du fördjupa dig i varje riksdagspartis AI-politiska ståndpunkter eller jämföra dem sida vid sida.
          </p>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex bg-[var(--bg-main)] rounded-lg p-0.5" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <button 
            onClick={() => setViewMode('single')} 
            className="p-1.5 rounded flex items-center justify-center transition-all"
            style={{ border: 'none', borderRadius: '6px', padding: '6px 14px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: viewMode === 'single' ? 'rgba(0, 230, 207, 0.12)' : 'transparent', color: viewMode === 'single' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}
          >
            Enskild profil
          </button>
          <button 
            onClick={() => setViewMode('compare')} 
            className="p-1.5 rounded flex items-center justify-center transition-all"
            style={{ border: 'none', borderRadius: '6px', padding: '6px 14px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: viewMode === 'compare' ? 'rgba(0, 230, 207, 0.12)' : 'transparent', color: viewMode === 'compare' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}
          >
            <GitCompare size={13} /> Jämförelsematris
          </button>
        </div>
      </div>

      {viewMode === 'single' ? (
        <>
          {/* Party selector bar */}
          <div className="party-selector">
            {(['S', 'M', 'SD', 'C', 'V', 'MP', 'L', 'KD'] as PartyAffiliation[]).map(p => {
              const isSelected = p === selectedParty;
              const count = claims.filter(c => c.partyAffiliation === p).length;
              return (
                <button
                  key={p}
                  onClick={() => onSelectParty(p)}
                  className={`party-selector-btn ${isSelected ? 'active' : ''}`}
                >
                  <PartyLogo party={p} size={16} />
                  {p} ({count})
                </button>
              );
            })}
          </div>

          {/* Guiding / Transparency Box */}
          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-teal)', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(15, 23, 42, 0.015)', marginBottom: '16px', borderRadius: '16px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Vägledning för partiprofilerna
            </span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              Profilen och dess indexvärden sammanfattar partipolitiken baserat på riksdagsdata bearbetad med AI. Kom ihåg:
              <br />
              • **Poängen (0-5)** visar hur aktivt och konkret partiet driver frågorna i sina motioner – inte huruvida förslagen är bra eller dåliga.
              <br />
              • **Politisk mognadsgrad** indikerar underlagets styrka (från enstaka riksdagsfrågor till fastlagd partipolitik).
              <br />
              • Du kan själv verifiera AI-sammanfattningarna genom att granska de **faktiska riksdagsmotionerna** och citaten i tabellen längst ner på sidan.
            </p>
          </div>

          {/* Grid: Overview Card & High Level Scores */}
          <div className="profile-grid">
            {/* Overview Stats */}
            <div className="glass-panel p-6 flex flex-col gap-6" style={{ borderTop: `3px solid ${partyColor}` }}>
              <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <PartyLogo party={selectedParty} size={32} glow />
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{partyNames[selectedParty]}</h2>
              </div>

              <div className="flex flex-col gap-6">
                {/* Position status box */}
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Politisk mognadsgrad</div>
                  <span className={`badge badge-teal text-xs font-bold py-1 px-3 ${
                    profile.status === 'Ingen bedömning' ? 'badge-gray' : 'ai-glow'
                  }`}>
                    {profile.status}
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '12px', fontStyle: 'italic', lineHeight: '1.6' }}>
                    {statusDescriptions[profile.status]}
                  </p>
                </div>

                {/* Claims counts */}
                <div className="grid grid-cols-3 gap-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                  <div className="profile-stats-card">
                    <div className="profile-stats-val">{profile.claimCount}</div>
                    <div className="profile-stats-label">Policy (A)</div>
                  </div>
                  <div className="profile-stats-card">
                    <div className="profile-stats-val">{countTrackB}</div>
                    <div className="profile-stats-label">Samhälle (B)</div>
                  </div>
                  <div className="profile-stats-card">
                    <div className="profile-stats-val">{countTrackC}</div>
                    <div className="profile-stats-label">Kampanj (C)</div>
                  </div>
                </div>

                {/* Total weight sum */}
                <div className="flex justify-between items-center text-xs pt-2">
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Antal tyngre förslag (Vägt):</span>
                  <span style={{ color: 'var(--accent-teal)', fontWeight: 800, fontSize: '1rem' }}>{profile.weightedScoreCount}</span>
                </div>
              </div>
            </div>

            {/* High-level indexes */}
            <div className="glass-panel p-6 flex flex-col gap-6">
              <div>
                <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Ideologiska AI-profiler</h2>
                <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Värdena beräknas på en skala 0–5 baserat på partiernas konkreta ställningstaganden.</p>
              </div>

              <div className="index-slider-group">
                {/* Acceleration Index */}
                <div className="index-slider-item">
                  <div className="index-slider-header">
                    <span className="flex items-center gap-2 text-teal-400">
                      <Cpu size={14} /> Främja & Accelerera AI (Fokus på tillväxt & innovation)
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>{profile.accelerationScore} / 5</span>
                  </div>
                  <div className="index-slider-bar">
                    <div 
                      className="index-slider-bar-fill teal" 
                      style={{ width: `${(profile.accelerationScore / 5) * 100}%` }}
                    ></div>
                  </div>
                  <div className="index-slider-labels">
                    <span>0 = Avvaktande inställning</span>
                    <span>5 = Maximal drivkraft & innovation</span>
                  </div>
                </div>

                {/* Protection Index */}
                <div className="index-slider-item">
                  <div className="index-slider-header">
                    <span className="flex items-center gap-2 text-coral-400">
                      <Shield size={14} /> Reglera & Skydda (Fokus på integritet & etik)
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>{profile.protectionScore} / 5</span>
                  </div>
                  <div className="index-slider-bar">
                    <div 
                      className="index-slider-bar-fill coral" 
                      style={{ width: `${(profile.protectionScore / 5) * 100}%` }}
                    ></div>
                  </div>
                  <div className="index-slider-labels">
                    <span>0 = Minimal lagstiftning</span>
                    <span>5 = Strikta regler & integritetsskydd</span>
                  </div>
                </div>

                {/* Governance Index */}
                <div className="index-slider-item">
                  <div className="index-slider-header">
                    <span className="flex items-center gap-2 text-purple-400">
                      <Award size={14} /> Offentlig Styrning (Fokus på statlig samordning & välfärd)
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>{profile.governanceScore} / 5</span>
                  </div>
                  <div className="index-slider-bar">
                    <div 
                      className="index-slider-bar-fill purple" 
                      style={{ width: `${(profile.governanceScore / 5) * 100}%` }}
                    ></div>
                  </div>
                  <div className="index-slider-labels">
                    <span>0 = Helt marknadsdrivet</span>
                    <span>5 = Stark offentlig samordning</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Shift Section */}
          {profile.stanceShifts && profile.stanceShifts.length > 0 ? (
            <div className="glass-panel p-6 flex flex-col gap-4" style={{ borderLeft: '4px solid var(--accent-coral)', background: 'rgba(251, 113, 133, 0.03)', borderRadius: '16px' }}>
              <h2 className="panel-title flex items-center gap-2" style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>
                <RefreshCw size={16} className="text-coral-400" /> Detekterat linjebyte / policyförskjutning (Sedan 2024)
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Systemet har upptäckt en signifikant förändring (&ge; 1.0 poängs skillnad) i partiets ställningstaganden före och efter den 1 januari 2024.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {profile.stanceShifts.map((shift, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] flex flex-col justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                        Axel: {shift.axis === 'Acceleration' ? 'Främja & Accelerera' : shift.axis === 'Protection' ? 'Reglera & Skydda' : 'Offentlig Styrning'}
                      </span>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                        Före 2024: <strong>{shift.oldScore}</strong> &rarr; Efter 2024: <strong>{shift.newScore}</strong>
                      </p>
                    </div>
                    <span className={`badge ${shift.amount > 0 ? 'badge-teal' : 'badge-coral'}`} style={{ fontSize: '0.72rem', alignSelf: 'flex-start', padding: '4px 8px' }}>
                      {shift.amount > 0 ? `+${shift.amount}` : shift.amount} poängs förskjutning
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-4 flex gap-3 items-center" style={{ background: 'var(--bg-main)', borderRadius: '16px' }}>
              <RefreshCw size={14} className="text-gray-500" style={{ opacity: 0.6 }} />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Inga större ideologiska linjebyten (&ge; 1.0 poängs förändring på kompassaxlarna) har detekterats för detta parti över tid.
              </p>
            </div>
          )}

          {/* Official AI Program & Manifest Card */}
          {(() => {
            const prog = officialPartyPrograms[selectedParty];
            if (!prog) return null;

            const statusColorMap: Record<string, string> = {
              'Ja': 'rgba(0, 230, 207, 0.12)',
              'Regeringsansvar': 'rgba(0, 94, 162, 0.15)',
              'Delvis': 'rgba(168, 85, 247, 0.12)',
              'Nej': 'rgba(100, 116, 139, 0.12)'
            };
            const statusBorderMap: Record<string, string> = {
              'Ja': 'var(--accent-teal)',
              'Regeringsansvar': '#005EA2',
              'Delvis': 'var(--accent-purple)',
              'Nej': '#64748b'
            };
            const statusTextMap: Record<string, string> = {
              'Ja': '#00e6cf',
              'Regeringsansvar': '#38bdf8',
              'Delvis': '#c084fc',
              'Nej': '#94a3b8'
            };

            return (
              <div 
                className="glass-panel flex flex-col md:flex-row gap-6 items-start justify-between" 
                style={{ 
                  padding: '28px 32px', 
                  borderRadius: '24px', 
                  borderLeft: `5px solid ${statusBorderMap[prog.hasProgram] || partyColor}`,
                  boxShadow: `0 0 20px ${statusBorderMap[prog.hasProgram]}08`
                }}
              >
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span 
                      className="text-[0.68rem] font-black uppercase tracking-widest px-3 py-1 rounded-full border"
                      style={{ 
                        backgroundColor: statusColorMap[prog.hasProgram], 
                        color: statusTextMap[prog.hasProgram],
                        borderColor: `${statusBorderMap[prog.hasProgram]}30` 
                      }}
                    >
                      {prog.hasProgram === 'Ja' ? '🟢 Officiellt AI-Program' : prog.hasProgram === 'Regeringsansvar' ? '⚡ Regeringsansvar' : '🔵 Integrerad Politik'}
                    </span>
                    <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {prog.programTitle}
                    </h3>
                  </div>
                  
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: '1.6' }}>
                    {prog.description}
                  </p>

                  <div 
                    className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]"
                    style={{ borderLeft: `3px dashed ${partyColor}50` }}
                  >
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Huvudförslag inför valet 2026:
                    </span>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {prog.keyProposal}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px] w-full md:w-auto mt-4 md:mt-0 justify-center">
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Källor & Dokumentation
                  </span>
                  <a 
                    href={prog.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-secondary text-xs py-3 px-4 flex items-center justify-center gap-2 hover:bg-[var(--bg-card-hover)]"
                    style={{ 
                      color: 'var(--text-primary)', 
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-main)',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      display: 'inline-flex'
                    }}
                  >
                    {prog.sourceLabel} <ExternalLink size={12} />
                  </a>

                  {prog.partyWebsiteUrl && (
                    <a 
                      href={prog.partyWebsiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn text-xs py-2.5 px-4 flex items-center justify-center gap-2 transition-all"
                      style={{ 
                        color: 'var(--accent-teal)', 
                        border: '1px solid rgba(0, 230, 207, 0.15)',
                        backgroundColor: 'rgba(0, 230, 207, 0.03)',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        fontWeight: 700
                      }}
                    >
                      {prog.partyWebsiteLabel || 'Partiets hemsida'} <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 12 Locked Dimensions Breakdown */}
          <div className="glass-panel p-6">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Politiskt fokus & detaljrikedom</h2>
                <p className="panel-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Politisk konkretionsgrad och detaljnivå för de 12 låsta dimensionerna, baserat på weighted concretion score.
                </p>
              </div>
              <BarChart2 className="text-gray-500" size={24} />
            </div>

            <div className="glass-panel p-4 mb-6 flex gap-3 items-start" style={{ background: 'rgba(0, 230, 207, 0.03)', border: '1px solid rgba(0, 230, 207, 0.1)', borderRadius: '12px' }}>
              <Info size={16} className="text-teal-400" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                <strong>Viktig information om poängsättningen:</strong> Detta betyg (0-5) visar hur detaljerad och konkret partiets politik är inom respektive område. En hög poäng innebär mycket skarpa förslag, men indikerar inte om förslagen är för eller emot dimensionens innebörd (t.ex. hårdare övervakning kontra ökat integritetsskydd). För att se ideologiska motsättningar, se motpolerna under respektive dimensionskort.
              </p>
            </div>

            <div className="dimension-grid">
              {lockedDimensions.map(d => {
                const score = profile.dimensionScores[d.id] || 0;
                const count = profile.dimensionClaimsCount[d.id] || 0;
                const opposite = dimensionOpposites[d.id];

                return (
                  <div key={d.id} className="dimension-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'between' }}>
                    <div>
                      <div className="dimension-card-header">
                        <div className="dimension-card-title">
                          {d.id}. {d.name}
                        </div>
                        <span className="badge badge-gray" style={{ fontSize: '0.62rem' }}>
                          {count} st
                        </span>
                      </div>
                      <p className="dimension-card-desc" style={{ marginBottom: '12px' }}>{d.description}</p>
                    </div>
                    
                    <div style={{ marginTop: 'auto' }}>
                      <div className="flex items-center gap-3" style={{ paddingTop: '8px' }}>
                        <div className="gap-progress-bar">
                          <div 
                            className="gap-fill-teal" 
                            style={{ width: `${(score / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span style={{ fontWeight: 800, color: 'var(--accent-teal)' }}>{score} / 5</span>
                      </div>

                      {opposite && (
                        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <GitCompare size={11} style={{ color: 'var(--accent-coral)' }} /> Motpoler i denna fråga:
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-primary)', fontWeight: 700 }}>
                              <PartyLogo party={opposite.partyA} size={11} /> {opposite.partyA} ({opposite.scoreA})
                            </span>
                            <span>vs.</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-primary)', fontWeight: 700 }}>
                              <PartyLogo party={opposite.partyB} size={11} /> {opposite.partyB} ({opposite.scoreB})
                            </span>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            Skiljer sig på: <em>{opposite.axis === 'Acceleration' ? 'Främja/Driva på' : opposite.axis === 'Protection' ? 'Reglera/Skydda' : 'Offentlig Styrning'}</em>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contributing claims list */}
          <div className="glass-panel p-6">
            <h2 className="panel-title" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Bidragande ställningstaganden i policyprofilen ({partyClaims.length} st)</h2>
            
            {partyClaims.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                Inga bidragande ställningstaganden registrerade för närvarande.
              </div>
            ) : (
              <div className="overflow-x-auto party-claims-table-container">
                <table className="gap-table">
                  <thead>
                    <tr>
                      {renderHeader('ID / Datum', 'date')}
                      {renderHeader('Källa / Aktör', 'source')}
                      {renderHeader('Originalcitat', 'quote')}
                      {renderHeader('Policygrad', 'policyDegree', 'center')}
                      {renderHeader('Bäring', 'partyBearing', 'center')}
                      {renderHeader('Vikt', 'weight', 'right')}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {sortedClaims.map(claim => {
                      const weight = claimWeightsMap.get(claim.id) || 0;
                      const baseWeight = calculateClaimWeight(claim);
                      const isGrouped = weight < baseWeight;
                      const claimYear = parseInt(claim.date.substring(0, 4)) || 2026;
                      const isOld = claimYear < 2025;

                      return (
                        <tr key={claim.id} className="hover:bg-[rgba(15,23,42,0.015)] transition-colors">
                          <td className="gap-table-td" style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', backgroundColor: 'rgba(15, 23, 42, 0.04)', padding: '3px 8px', borderRadius: '6px', marginRight: '6px' }}>
                              {claim.id}
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>{claim.date}</span>
                          </td>
                          <td className="gap-table-td" style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{claim.actor}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                              {(() => {
                                const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                                if (sourceUrl) {
                                  return (
                                    <a 
                                      href={sourceUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-sky-600 hover:underline inline-flex items-center gap-0.5 font-semibold"
                                    >
                                      {claim.source} <ExternalLink size={10} />
                                    </a>
                                  );
                                }
                                return claim.source;
                              })()}
                            </div>
                          </td>
                          <td className="gap-table-td truncate" style={{ maxWidth: '300px', color: 'var(--text-primary)' }} title={claim.originalQuote}>
                            &rdquo;{claim.originalQuote}&rdquo;
                          </td>
                          <td className="gap-table-td text-center font-bold" style={{ color: 'var(--text-primary)' }}>
                            {claim.policyDegree}
                          </td>
                          <td className="gap-table-td text-center" style={{ color: 'var(--text-secondary)' }}>
                            {claim.partyBearing}
                          </td>
                          <td className="gap-table-td text-right font-extrabold" style={{ color: 'var(--accent-teal)', fontSize: '0.95rem' }}>
                            <div className="flex flex-col items-end gap-0.5">
                              <span>{weight.toFixed(3)}</span>
                              {isGrouped && (
                                <span style={{ fontSize: '0.58rem', color: 'var(--accent-coral)', fontWeight: 700, backgroundColor: 'rgba(251, 113, 133, 0.08)', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(251, 113, 133, 0.15)' }}>
                                  Överlapp (dämpad)
                                </span>
                              )}
                              {isOld && !isGrouped && (
                                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                  Äldre utspel ({claimYear})
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* COMPARISON MATRIX VIEW */}
          {/* Party Selector Section */}
          <div className="glass-panel p-6 flex flex-col gap-4">
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Välj partier att jämföra side-by-side
            </h3>
            <div className="flex flex-wrap gap-2 pt-2">
              {(['S', 'M', 'SD', 'C', 'V', 'MP', 'L', 'KD'] as PartyAffiliation[]).map(p => {
                const isChecked = comparedParties.includes(p);
                const color = partyColorMap[p];
                return (
                  <label 
                    key={p}
                    onClick={() => {
                      if (isChecked) {
                        if (comparedParties.length > 2) {
                          setComparedParties(comparedParties.filter(x => x !== p));
                        } else {
                          alert('Minst två partier måste väljas för att kunna jämföra.');
                        }
                      } else {
                        setComparedParties([...comparedParties, p]);
                      }
                    }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border select-none transition-all duration-200 cursor-pointer`}
                    style={{
                      backgroundColor: isChecked ? `${color}15` : 'rgba(255,255,255,0.01)',
                      borderColor: isChecked ? color : 'rgba(255,255,255,0.06)',
                      boxShadow: isChecked ? `0 0 10px ${color}10` : 'none',
                      color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <PartyLogo party={p} size={14} />
                    <span className="font-extrabold text-sm">{p}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Grouped Index Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Acceleration Group */}
            <div className="glass-panel p-6 flex flex-col gap-5" style={{ borderTop: '3px solid var(--accent-teal)' }}>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Cpu size={14} className="text-teal-400" /> Främja & Accelerera AI
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Fokus på tillväxt, innovation & forskning.</p>
              </div>
              <div className="flex flex-col gap-4">
                {comparedProfiles.map(p => (
                  <div key={p.party} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <PartyLogo party={p.party} size={12} />
                        {p.party}
                      </span>
                      <span>{p.accelerationScore} / 5</span>
                    </div>
                    <div className="w-full bg-[rgba(15,23,42,0.04)] rounded-full h-2.5" style={{ border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div 
                        className="rounded-full h-full transition-all duration-500" 
                        style={{ 
                          width: `${(p.accelerationScore / 5) * 100}%`,
                          backgroundColor: partyColorMap[p.party]
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Protection Group */}
            <div className="glass-panel p-6 flex flex-col gap-5" style={{ borderTop: '3px solid var(--accent-coral)' }}>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Shield size={14} className="text-coral-400" /> Reglera & Skydda
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Fokus på integritet, etik & riskminimering.</p>
              </div>
              <div className="flex flex-col gap-4">
                {comparedProfiles.map(p => (
                  <div key={p.party} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <PartyLogo party={p.party} size={12} />
                        {p.party}
                      </span>
                      <span>{p.protectionScore} / 5</span>
                    </div>
                    <div className="w-full bg-[rgba(15,23,42,0.04)] rounded-full h-2.5" style={{ border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div 
                        className="rounded-full h-full transition-all duration-500" 
                        style={{ 
                          width: `${(p.protectionScore / 5) * 100}%`,
                          backgroundColor: partyColorMap[p.party]
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Governance Group */}
            <div className="glass-panel p-6 flex flex-col gap-5" style={{ borderTop: '3px solid var(--accent-purple)' }}>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Award size={14} className="text-purple-400" /> Offentlig Styrning
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Fokus på samordning, digital välfärd & statligt ansvar.</p>
              </div>
              <div className="flex flex-col gap-4">
                {comparedProfiles.map(p => (
                  <div key={p.party} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <PartyLogo party={p.party} size={12} />
                        {p.party}
                      </span>
                      <span>{p.governanceScore} / 5</span>
                    </div>
                    <div className="w-full bg-[rgba(15,23,42,0.04)] rounded-full h-2.5" style={{ border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div 
                        className="rounded-full h-full transition-all duration-500" 
                        style={{ 
                          width: `${(p.governanceScore / 5) * 100}%`,
                          backgroundColor: partyColorMap[p.party]
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analytical Contrasts Section */}
          <div className="glass-panel p-6 flex flex-col gap-4">
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Systematiska ideologiska kontraster
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]">
                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-coral)' }}>Störst ideologisk konflikt</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
                  {maxDiffDim ? `${maxDiffDim.id}. ${maxDiffDim.name}` : 'Ingen'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Här skiljer sig partiernas ställningstaganden som mest (Mognadsskillnad: {maxDiff.toFixed(1)}).
                </div>
                <div className="flex gap-2 flex-wrap pt-3">
                  {comparedProfiles.map(p => (
                    <span key={p.party} className="badge bg-[var(--bg-card)]" style={{ fontSize: '0.62rem', color: partyColorMap[p.party], borderColor: `${partyColorMap[p.party]}20` }}>
                      {p.party}: {p.dimensionScores[maxDiffDimId] || 0} / 5
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]">
                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-teal)' }}>Största enighet</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
                  {minDiffDim ? `${minDiffDim.id}. ${minDiffDim.name}` : 'Ingen gemensam dimension'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Mest samstämmiga mognad bland dimensioner där alla har utspel (Maximal differens: {minDiff === 10 ? 'N/A' : minDiff.toFixed(1)}).
                </div>
                {minDiff < 10 && (
                  <div className="flex gap-2 flex-wrap pt-3">
                    {comparedProfiles.map(p => (
                      <span key={p.party} className="badge bg-[var(--bg-card)]" style={{ fontSize: '0.62rem', color: partyColorMap[p.party], borderColor: `${partyColorMap[p.party]}20` }}>
                        {p.party}: {p.dimensionScores[minDiffDimId] || 0} / 5
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]">
                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-purple)' }}>Starkt gemensamt fokus</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
                  {maxClaimsDim ? `${maxClaimsDim.id}. ${maxClaimsDim.name}` : 'Ingen'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Dimensionen med flest gemensamma utspel totalt bland valda partier ({maxClaims} st claims registrerade).
                </div>
                <div className="flex gap-2 flex-wrap pt-3">
                  {comparedProfiles.map(p => (
                    <span key={p.party} className="badge bg-[var(--bg-card)]" style={{ fontSize: '0.62rem', color: partyColorMap[p.party], borderColor: `${partyColorMap[p.party]}20` }}>
                      {p.party}: {p.dimensionClaimsCount[maxClaimsDimId] || 0} st
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 12 Dimensions Matrix Table */}
          <div className="glass-panel p-6 overflow-x-auto" style={{ border: '1px solid var(--border-color)', borderRadius: '16px' }}>
            <div className="mb-4">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Dimensionell Mognadsmatris</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Jämförelse av concretion score (0-5) och antal registrerade utspel per dimension för de valda partierna.</p>
            </div>
            <table className="w-full text-left border-collapse" style={{ minWidth: '700px', fontSize: '0.8rem', borderSpacing: '0px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>Dimension</th>
                  {comparedProfiles.map(p => (
                    <th 
                      key={p.party} 
                      className="text-center" 
                      style={{ padding: '14px 16px', fontWeight: 800, color: partyColorMap[p.party], width: `${Math.max(100, 450 / comparedProfiles.length)}px` }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <PartyLogo party={p.party} size={18} glow />
                        <span style={{ fontSize: '0.72rem' }}>{p.party}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lockedDimensions.map(d => (
                  <tr 
                    key={d.id} 
                    className="hover:bg-[var(--bg-main)]" 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                        {d.id}. {d.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', whiteSpace: 'normal', lineHeight: '1.3' }}>
                        {d.description}
                      </div>
                    </td>
                    {comparedProfiles.map(p => {
                      const score = p.dimensionScores[d.id] || 0;
                      const count = p.dimensionClaimsCount[d.id] || 0;
                      
                      return (
                        <td key={p.party} style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div className="flex flex-col items-center gap-1 justify-center">
                            <span 
                              style={{ 
                                fontWeight: 800, 
                                fontSize: '0.9rem', 
                                color: score > 0 ? partyColorMap[p.party] : 'var(--text-muted)' 
                              }}
                            >
                              {score > 0 ? `${score} / 5` : '-'}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                              {count} utspel
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
