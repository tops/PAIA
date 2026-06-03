import React, { useState } from 'react';
import type { ClaimCard } from '../types';
import { calculateClaimWeight } from '../utils/scoring';
import { lockedDimensions } from '../data/mockClaims';
import { 
  Filter, Search, ArrowUpDown, Edit, Trash2, 
  Download, Upload, RotateCcw, LayoutGrid, List, Clock, Grid3X3, ExternalLink,
  FileText, ChevronDown, ChevronRight, FolderOpen
} from 'lucide-react';
import { PartyLogo } from '../utils/partyAssets';
import { partyColorMap } from '../utils/partyConstants';

interface DatabaseViewProps {
  claims: ClaimCard[];
  initialClaims: ClaimCard[];
  onEditClaim: (claim: ClaimCard) => void;
  onDeleteClaim: (id: string) => void;
  onImportClaims: (imported: ClaimCard[]) => void;
  onNavigate: (tab: string) => void;
}

// Removed duplicate local partyColorMap dictionary
export const DatabaseView: React.FC<DatabaseViewProps> = ({
  claims,
  initialClaims,
  onEditClaim,
  onDeleteClaim,
  onImportClaims,
  onNavigate
}) => {
  // Database Tracks (Spår)
  // Spår A: AI-policy, Spår B: AI-nära samhälle, Spår C: Kampanj & demokrati
  const [activeTrack, setActiveTrack] = useState<'A' | 'B' | 'C'>('A');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'timeline' | 'compact' | 'sources'>('cards');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterParty, setFilterParty] = useState<string>('Alla');
  const [filterActorType, setFilterActorType] = useState<string>('Alla');
  const [filterDimension, setFilterDimension] = useState<string>('Alla');
  const [filterPolicyDegree, setFilterPolicyDegree] = useState<string>('Alla');
  const [filterStatus, setFilterStatus] = useState<string>('Alla');
  
  // Sorting states
  const [sortBy, setSortBy] = useState<'date' | 'weight' | 'sourceWeight'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle Export to JSON
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(claims, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ai_politisk_bevakning_db_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle Import from JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportClaims(parsed);
            alert('Databasen importerades framgångsrikt!');
          } else {
            alert('Fel: Filen måste innehålla en JSON-lista över claims.');
          }
        } catch (err) {
          alert('Det gick inte att parsa JSON-filen. Kontrollera formatet.');
          console.error(err);
        }
      };
    }
  };

  // Återställ till standard (inkl. Riksdagsdata)
  const handleResetToDefault = () => {
    if (confirm(`Detta kommer att återställa hela databasen till standardlistan (${initialClaims.length} claims inklusive Riksdagsmotioner, propositioner och utskottsbeslut). Vill du fortsätta?`)) {
      onImportClaims(initialClaims);
      alert(`Databasen har återställts till ${initialClaims.length} standardclaims!`);
    }
  };

  // Filtering claims based on Track first
  const trackClaims = claims.filter(c => {
    if (activeTrack === 'A') {
      // Spår A: AI-policy (nearAiFlag and campaignPracticeFlag must be false)
      return !c.nearAiFlag && !c.campaignPracticeFlag;
    } else if (activeTrack === 'B') {
      // Spår B: AI-nära samhällsclaims (nearAiFlag is true)
      return c.nearAiFlag;
    } else {
      // Spår C: AI i politisk praktik (campaignPracticeFlag is true)
      return c.campaignPracticeFlag;
    }
  });

  // Apply filters
  const filteredClaims = trackClaims.filter(c => {
    const matchesSearch = 
      c.originalQuote.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.neutralSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesParty = filterParty === 'Alla' || c.partyAffiliation === filterParty;
    const matchesActorType = filterActorType === 'Alla' || c.actorType === filterActorType;
    const matchesDimension = filterDimension === 'Alla' || 
      c.primaryDimension === Number(filterDimension) || 
      c.secondaryDimensions.includes(Number(filterDimension));
    const matchesPolicy = filterPolicyDegree === 'Alla' || c.policyDegree === Number(filterPolicyDegree);
    const matchesStatus = filterStatus === 'Alla' || c.reviewStatus === filterStatus;

    return matchesSearch && matchesParty && matchesActorType && matchesDimension && matchesPolicy && matchesStatus;
  });

  // Apply Sorting
  const sortedClaims = [...filteredClaims].sort((a, b) => {
    let valA: string | number = a.date;
    let valB: string | number = b.date;

    if (sortBy === 'weight') {
      valA = calculateClaimWeight(a);
      valB = calculateClaimWeight(b);
    } else if (sortBy === 'sourceWeight') {
      valA = a.sourceWeight;
      valB = b.sourceWeight;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: 'date' | 'weight' | 'sourceWeight') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterParty('Alla');
    setFilterActorType('Alla');
    setFilterDimension('Alla');
    setFilterPolicyDegree('Alla');
    setFilterStatus('Alla');
  };

  // Group claims by sourceType and then by source
  const groupClaimsBySource = () => {
    const groups: Record<string, Record<string, ClaimCard[]>> = {};
    sortedClaims.forEach(claim => {
      const type = claim.sourceType || 'Övrigt';
      const src = claim.source || 'Okänd källa';
      if (!groups[type]) {
        groups[type] = {};
      }
      if (!groups[type][src]) {
        groups[type][src] = [];
      }
      groups[type][src].push(claim);
    });
    return groups;
  };

  const setAllSourcesExpanded = (expand: boolean) => {
    const newExpanded: Record<string, boolean> = {};
    sortedClaims.forEach(claim => {
      if (claim.source) {
        newExpanded[claim.source] = expand;
      }
    });
    setExpandedSources(newExpanded);
  };

  return (
    <div className="animate-slide flex flex-col gap-6">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Claims-Databas</h1>
          <p className="page-subtitle">
            Hantera, filtrera och granska de tre spåren av uttalanden och policyutspel inför valet 2026.
          </p>
        </div>

        {/* Database actions */}
        <div className="flex gap-3">
          <button onClick={handleResetToDefault} className="btn btn-secondary" style={{ borderColor: 'var(--accent-teal)', color: 'var(--accent-teal)' }}>
            <RotateCcw size={16} /> Återställ Standard ({initialClaims.length} st)
          </button>
          <label className="btn btn-secondary cursor-pointer">
            <Upload size={16} /> Importera DB
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              className="hidden" 
            />
          </label>
          <button onClick={handleExport} className="btn btn-secondary">
            <Download size={16} /> Exportera DB
          </button>
        </div>
      </div>

      {/* Track Selector Tabs */}
      <div className="tabs-container">
        <button 
          onClick={() => { setActiveTrack('A'); resetFilters(); }} 
          className={`tab-btn ${activeTrack === 'A' ? 'active' : ''}`}
        >
          Spår A: AI-policy ({claims.filter(c => !c.nearAiFlag && !c.campaignPracticeFlag).length})
        </button>
        <button 
          onClick={() => { setActiveTrack('B'); resetFilters(); }} 
          className={`tab-btn ${activeTrack === 'B' ? 'active' : ''}`}
        >
          Spår B: AI-nära samhällsclaims ({claims.filter(c => c.nearAiFlag).length})
        </button>
        <button 
          onClick={() => { setActiveTrack('C'); resetFilters(); }} 
          className={`tab-btn ${activeTrack === 'C' ? 'active' : ''}`}
        >
          Spår C: AI i politisk praktik ({claims.filter(c => c.campaignPracticeFlag).length})
        </button>
      </div>

      {/* Filter panel */}
      <div className="glass-panel filter-panel flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
          <Filter size={16} className="text-teal-400" />
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Avancerad Sökning & Filtrering</h3>
        </div>

        <div className="filter-grid">
          {/* Search box */}
          <div className="form-group mb-2" style={{ gridColumn: 'span 2' }}>
            <label>Fritextsökning</label>
            <div style={{ position: 'relative' }}>
              <Search className="text-gray-500" size={16} style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type="text"
                placeholder="Citat, sammanfattning, tagg..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          {/* Party Filter */}
          <div className="form-group mb-2">
            <label>Partianknytning</label>
            <select 
              value={filterParty} 
              onChange={(e) => setFilterParty(e.target.value)}
              className="form-control"
            >
              <option value="Alla">Alla</option>
              <option value="S">Socialdemokraterna (S)</option>
              <option value="M">Moderaterna (M)</option>
              <option value="SD">Sverigedemokraterna (SD)</option>
              <option value="C">Centerpartiet (C)</option>
              <option value="V">Vänsterpartiet (V)</option>
              <option value="MP">Miljöpartiet (MP)</option>
              <option value="L">Liberalerna (L)</option>
              <option value="KD">Kristdemokraterna (KD)</option>
              <option value="Externt">Externa aktörer</option>
            </select>
          </div>

          {/* Dimension Filter */}
          <div className="form-group mb-2">
            <label>AI-Dimension</label>
            <select 
              value={filterDimension} 
              onChange={(e) => setFilterDimension(e.target.value)}
              className="form-control"
            >
              <option value="Alla">Alla</option>
              {lockedDimensions.map(d => (
                <option key={d.id} value={d.id}>{d.id}. {d.name.substring(0, 18)}...</option>
              ))}
            </select>
          </div>

          {/* Policygrad Filter */}
          <div className="form-group mb-2">
            <label>Policygrad (0-3)</label>
            <select 
              value={filterPolicyDegree} 
              onChange={(e) => setFilterPolicyDegree(e.target.value)}
              className="form-control"
            >
              <option value="Alla">Alla</option>
              <option value="0">Grad 0: Ingen AI-politik</option>
              <option value="1">Grad 1: AI-nära samhällsclaim</option>
              <option value="2">Grad 2: AI-policyclaim</option>
              <option value="3">Grad 3: Konkret åtgärd</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="form-group mb-2">
            <label>Granskningsstatus</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-control"
            >
              <option value="Alla">Alla</option>
              <option value="Ny">Ny</option>
              <option value="Granskad">Granskad</option>
              <option value="Kalibrerad">Kalibrerad</option>
              <option value="Låst">Låst</option>
              <option value="Arkiverad">Arkiverad</option>
            </select>
          </div>
        </div>

        {/* Sorting controls & stats */}
        <div className="filter-footer flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div>
              Hittade <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{sortedClaims.length}</span> claims i detta spår.
            </div>
            
            {/* View Mode Toggle Buttons */}
            <div className="flex bg-white/5 rounded-lg p-0.5" style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
              <button 
                onClick={() => setViewMode('cards')} 
                className="p-1.5 rounded flex items-center justify-center transition-all"
                style={{ border: 'none', borderRadius: '6px', padding: '6px 10px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: viewMode === 'cards' ? 'rgba(0, 230, 207, 0.12)' : 'transparent', color: viewMode === 'cards' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}
                title="Visa som kort"
              >
                <LayoutGrid size={13} /> Kortvy
              </button>
              <button 
                onClick={() => setViewMode('compact')} 
                className="p-1.5 rounded flex items-center justify-center transition-all"
                style={{ border: 'none', borderRadius: '6px', padding: '6px 10px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: viewMode === 'compact' ? 'rgba(0, 230, 207, 0.12)' : 'transparent', color: viewMode === 'compact' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}
                title="Kompakt kortvy"
              >
                <Grid3X3 size={13} /> Kompaktvy
              </button>
              <button 
                onClick={() => setViewMode('table')} 
                className="p-1.5 rounded flex items-center justify-center transition-all"
                style={{ border: 'none', borderRadius: '6px', padding: '6px 10px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: viewMode === 'table' ? 'rgba(0, 230, 207, 0.12)' : 'transparent', color: viewMode === 'table' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}
                title="Visa som tabell"
              >
                <List size={13} /> Tabellvy
              </button>
              <button 
                onClick={() => setViewMode('timeline')} 
                className="p-1.5 rounded flex items-center justify-center transition-all"
                style={{ border: 'none', borderRadius: '6px', padding: '6px 10px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: viewMode === 'timeline' ? 'rgba(0, 230, 207, 0.12)' : 'transparent', color: viewMode === 'timeline' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}
                title="Visa som tidslinje"
              >
                <Clock size={13} /> Tidslinje
              </button>
              <button 
                onClick={() => setViewMode('sources')} 
                className="p-1.5 rounded flex items-center justify-center transition-all"
                style={{ border: 'none', borderRadius: '6px', padding: '6px 10px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: viewMode === 'sources' ? 'rgba(0, 230, 207, 0.12)' : 'transparent', color: viewMode === 'sources' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}
                title="Visa grupperat per källa"
              >
                <FileText size={13} /> Källvy
              </button>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            <span>Sortera efter:</span>
            <button 
              onClick={() => toggleSort('date')} 
              className="flex items-center gap-1"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: sortBy === 'date' ? 'var(--accent-teal)' : 'var(--text-secondary)', fontWeight: sortBy === 'date' ? 700 : 500 }}
            >
              Datum <ArrowUpDown size={12} />
            </button>
            <button 
              onClick={() => toggleSort('weight')} 
              className="flex items-center gap-1"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: sortBy === 'weight' ? 'var(--accent-teal)' : 'var(--text-secondary)', fontWeight: sortBy === 'weight' ? 700 : 500 }}
            >
              Totalvikt <ArrowUpDown size={12} />
            </button>
            <button 
              onClick={() => toggleSort('sourceWeight')} 
              className="flex items-center gap-1"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: sortBy === 'sourceWeight' ? 'var(--accent-teal)' : 'var(--text-secondary)', fontWeight: sortBy === 'sourceWeight' ? 700 : 500 }}
            >
              Källvikt <ArrowUpDown size={12} />
            </button>
            <button 
              onClick={resetFilters} 
              className="flex items-center"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-coral)', fontWeight: 700, textDecoration: 'underline' }}
            >
              Återställ
            </button>
          </div>
        </div>
      </div>

      {/* Grid or Table listing */}
      <div>
        {sortedClaims.length === 0 ? (
          <div className="glass-panel p-8 text-center text-gray-500">
            Inga claims matchade dina filter. Försök att nollställa eller justera sökningen.
          </div>
        ) : viewMode === 'sources' ? (
          <div className="flex flex-col gap-6 animate-slide">
            {/* Global Expand/Collapse Controls */}
            <div className="flex justify-end gap-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                onClick={() => setAllSourcesExpanded(true)} 
                className="btn btn-secondary text-xs" 
                style={{ padding: '6px 12px', display: 'flex', gap: '6px', alignItems: 'center', borderColor: 'rgba(255,255,255,0.15)' }}
              >
                <FolderOpen size={13} className="text-teal-400" /> Expandera alla
              </button>
              <button 
                onClick={() => setAllSourcesExpanded(false)} 
                className="btn btn-secondary text-xs" 
                style={{ padding: '6px 12px', display: 'flex', gap: '6px', alignItems: 'center', borderColor: 'rgba(255,255,255,0.15)' }}
              >
                Kollapsa alla
              </button>
            </div>

            {/* Source Types List */}
            {(() => {
              const grouped = groupClaimsBySource();
              const sourceTypes = Object.keys(grouped).sort();
              
              if (sourceTypes.length === 0) {
                return (
                  <div className="glass-panel p-8 text-center text-gray-500">
                    Inga källor hittades för de valda filtren.
                  </div>
                );
              }

              return sourceTypes.map(type => {
                const sourcesInType = grouped[type];
                const sourceNames = Object.keys(sourcesInType).sort();
                
                // Count total claims in this sourceType group
                const totalClaimsInType = Object.values(sourcesInType).reduce((sum, list) => sum + list.length, 0);

                return (
                  <div key={type} className="flex flex-col gap-3">
                    {/* Source Type Section Header */}
                    <div className="flex items-center gap-3 mt-4 mb-2">
                      <h2 
                        className="text-lg font-bold tracking-wide" 
                        style={{ 
                          color: 'var(--text-primary)', 
                          fontSize: '0.9rem', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          textShadow: '0 0 10px rgba(0, 230, 207, 0.1)'
                        }}
                      >
                        {type === 'Motion' ? 'Riksdagsmotioner' :
                         type === 'Regeringsbeslut' ? 'Regeringspropositioner & beslut' :
                         type === 'Strategi' ? 'Utskottsbetänkanden & strategier' :
                         type === 'Pressmeddelande' ? 'Pressmeddelanden & valmanifest' :
                         type === 'Debattartikel' ? 'Debattartiklar & opinion' :
                         type === 'Intervju' ? 'Intervjuer & interpellationsdebatter' : type}
                      </h2>
                      <span 
                        className="badge badge-teal text-xs" 
                        style={{ 
                          background: 'rgba(0, 230, 207, 0.08)', 
                          color: 'var(--accent-teal)',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '3px 8px'
                        }}
                      >
                        {sourceNames.length} {sourceNames.length === 1 ? 'dokument' : 'dokument'}, {totalClaimsInType} {totalClaimsInType === 1 ? 'claim' : 'claims'}
                      </span>
                    </div>

                    {/* Source Document Panels */}
                    <div className="flex flex-col gap-3">
                      {sourceNames.map(sourceName => {
                        const claimsList = sourcesInType[sourceName];
                        const isExpanded = !!expandedSources[sourceName];
                        
                        // Use the details of the first claim as doc info
                        const firstClaim = claimsList[0];
                        const partyColor = partyColorMap[firstClaim.partyAffiliation] || 'var(--accent-teal)';
                        
                        return (
                          <div 
                            key={sourceName} 
                            className="glass-panel" 
                            style={{ 
                              padding: '0px', 
                              borderRadius: '16px',
                              overflow: 'hidden',
                              border: isExpanded ? `1px solid rgba(255,255,255,0.12)` : '1px solid rgba(255,255,255,0.04)',
                              background: isExpanded ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.008)',
                              boxShadow: isExpanded ? '0 8px 32px rgba(0, 0, 0, 0.3)' : 'none',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {/* Panel Header */}
                            <div 
                              onClick={() => setExpandedSources(prev => ({ ...prev, [sourceName]: !prev[sourceName] }))}
                              className="flex justify-between items-center p-4 cursor-pointer hover:bg-white/[0.02] transition-all"
                              style={{ 
                                borderLeft: `4px solid ${partyColor}`,
                                userSelect: 'none'
                              }}
                            >
                              <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
                                {/* Toggle Indicator Icon */}
                                <span className="text-gray-500 hover:text-white transition-all flex items-center justify-center">
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </span>

                                {/* Source Date */}
                                <span className="text-xs text-gray-500 font-semibold">{firstClaim.date}</span>

                                {/* Source Document Title / Code */}
                                <h3 
                                  className="font-bold truncate text-sm" 
                                  style={{ 
                                    maxWidth: '300px', 
                                    color: 'var(--text-primary)',
                                    letterSpacing: '0.01em'
                                  }}
                                >
                                  {sourceName}
                                </h3>

                                {/* Actor & Party Badge */}
                                <div className="flex items-center gap-2">
                                  <PartyLogo party={firstClaim.partyAffiliation} size={14} />
                                  <span className="text-xs font-semibold text-gray-300 truncate" style={{ maxWidth: '200px' }}>
                                    {firstClaim.actor}
                                  </span>
                                  {firstClaim.partyAffiliation !== 'Externt' && (
                                    <span 
                                      className="text-[0.6rem] font-black px-1.5 py-0.5 rounded flex items-center gap-1"
                                      style={{ 
                                        backgroundColor: `${partyColor}15`, 
                                        color: partyColor,
                                        border: `1px solid ${partyColor}25`
                                      }}
                                    >
                                      <PartyLogo party={firstClaim.partyAffiliation} size={10} />
                                      {firstClaim.partyAffiliation}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Claims Count badge inside source header */}
                              <div className="flex items-center gap-3">
                                <span 
                                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                                  style={{ 
                                    backgroundColor: isExpanded ? 'rgba(0, 230, 207, 0.12)' : 'rgba(255,255,255,0.03)',
                                    color: isExpanded ? 'var(--accent-teal)' : 'var(--text-muted)',
                                    border: isExpanded ? '1px solid rgba(0, 230, 207, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                                    fontSize: '0.65rem'
                                  }}
                                >
                                  {claimsList.length} {claimsList.length === 1 ? 'claim' : 'claims'}
                                </span>
                              </div>
                            </div>

                            {/* Inner Constituent Claims List (Rendered when expanded) */}
                            {isExpanded && (
                              <div 
                                className="p-4 flex flex-col gap-4" 
                                style={{ 
                                  backgroundColor: 'rgba(0,0,0,0.18)',
                                  borderTop: '1px solid rgba(255,255,255,0.05)'
                                }}
                              >
                                {claimsList.map(claim => {
                                  const claimWeight = calculateClaimWeight(claim);
                                  const primaryDimName = lockedDimensions.find(d => d.id === claim.primaryDimension)?.name || 'Okänd';
                                  
                                  let statusBadgeClass = 'badge-gray';
                                  if (claim.reviewStatus === 'Granskad') statusBadgeClass = 'badge-blue';
                                  else if (['Kalibrerad', 'Låst'].includes(claim.reviewStatus)) statusBadgeClass = 'badge-teal';

                                  return (
                                    <div 
                                      key={claim.id} 
                                      className="glass-panel"
                                      style={{ 
                                        padding: '16px', 
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                        background: 'rgba(255,255,255,0.015)',
                                        borderLeft: `3px solid ${partyColor}`
                                      }}
                                    >
                                      {/* Claim Header Row */}
                                      <div className="flex justify-between items-center flex-wrap gap-2 pb-2 mb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[0.62rem] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                                            {claim.id}
                                          </span>
                                          <span 
                                            className="text-xs font-bold"
                                            style={{ color: partyColor }}
                                          >
                                            Dimension {claim.primaryDimension}: {primaryDimName}
                                          </span>
                                          <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.58rem', padding: '2px 6px' }}>
                                            {claim.reviewStatus}
                                          </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                          {(() => {
                                            const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                                            if (sourceUrl) {
                                              return (
                                                <a 
                                                  href={sourceUrl} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  className="p-1 rounded hover:bg-white/5 text-sky-400 hover:text-sky-300 transition-all"
                                                  title="Öppna originaldokumentet"
                                                >
                                                  <ExternalLink size={12} />
                                                </a>
                                              );
                                            }
                                            return null;
                                          })()}
                                          <button 
                                            onClick={() => {
                                              onEditClaim(claim);
                                              onNavigate('assistent');
                                            }}
                                            className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white"
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                            title="Redigera"
                                          >
                                            <Edit size={12} />
                                          </button>
                                          <button 
                                            onClick={() => {
                                              if (confirm('Är du säker på att du vill ta bort detta claim?')) {
                                                onDeleteClaim(claim.id);
                                              }
                                            }}
                                            className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-coral-400"
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                            title="Ta bort"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Claim Text content */}
                                      <div className="flex flex-col gap-2">
                                        <p className="text-xs font-semibold text-white" style={{ lineHeight: '1.4' }}>
                                          {claim.neutralSummary}
                                        </p>
                                        <blockquote 
                                          className="text-[0.7rem] text-gray-400 italic bg-black/10 p-3 rounded-lg border border-white/5"
                                          style={{ fontStyle: 'italic', margin: '0px', marginTop: '4px' }}
                                        >
                                          &rdquo;{claim.originalQuote}&rdquo;
                                        </blockquote>
                                      </div>

                                      {/* Claim Footer/Metrics */}
                                      <div className="flex justify-between items-center flex-wrap gap-4 text-[0.68rem] text-gray-500 pt-3 mt-3 border-t border-white/5">
                                        <div className="flex gap-4">
                                          <span>Policygrad: <span className="text-gray-300 font-semibold">{claim.policyDegree}</span></span>
                                          <span>Evidens: <span className="text-gray-300 font-semibold">{claim.evidenceStrength}/5</span></span>
                                          <span>Claimvikt: <span className="text-gray-300 font-bold">{claimWeight}</span></span>
                                        </div>
                                        <div className="flex gap-2">
                                          {claim.tags.map(tag => (
                                            <span key={tag} className="text-[0.58rem] bg-white/5 px-2 py-0.5 rounded text-gray-400">
                                              #{tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
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
              });
            })()}
          </div>
        ) : viewMode === 'table' ? (
          <div className="glass-panel overflow-x-auto" style={{ padding: '0px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
            <table className="w-full text-left border-collapse" style={{ minWidth: '950px', fontSize: '0.8rem', borderSpacing: '0px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', width: '110px' }}>ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', width: '90px' }}>Datum</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', width: '60px' }}>Parti</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', width: '130px' }}>Aktör</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', width: '180px' }}>Dimension</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', width: '150px' }}>Källa</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>Sammanfattning / Citat</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', width: '55px', textAlign: 'center' }}>Vikt</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', width: '100px' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)', width: '80px', textAlign: 'center' }}>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {sortedClaims.map(claim => {
                  const weight = calculateClaimWeight(claim);
                  const primaryDimName = lockedDimensions.find(d => d.id === claim.primaryDimension)?.name || 'Okänd';
                  const partyColor = partyColorMap[claim.partyAffiliation] || 'var(--accent-teal)';
                  
                  let statusBadgeClass = 'badge-gray';
                  if (claim.reviewStatus === 'Granskad') statusBadgeClass = 'badge-blue';
                  else if (['Kalibrerad', 'Låst'].includes(claim.reviewStatus)) statusBadgeClass = 'badge-teal';

                  return (
                    <tr 
                      key={claim.id} 
                      className="hover:bg-white/[0.02]" 
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {claim.id}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {claim.date}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: partyColor }}>
                        <div className="flex items-center gap-1.5">
                          <PartyLogo party={claim.partyAffiliation} size={14} />
                          <span>{claim.partyAffiliation}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }} title={`${claim.actor} (${claim.actorType})`}>
                        <div className="truncate" style={{ maxWidth: '120px' }}>{claim.actor}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }} title={`${claim.primaryDimension}. ${primaryDimName}`}>
                        <div className="truncate" style={{ maxWidth: '160px', color: partyColor }}>
                          {claim.primaryDimension}. {primaryDimName}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }} title={claim.source}>
                        <div className="truncate" style={{ maxWidth: '130px' }}>
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
                                  {claim.source} <ExternalLink size={10} />
                                </a>
                              );
                            }
                            return claim.source;
                          })()}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex flex-col gap-0.5">
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{claim.neutralSummary}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontStyle: 'italic', display: 'block', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={claim.originalQuote}>
                            &rdquo;{claim.originalQuote}&rdquo;
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>
                        {weight}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.62rem', padding: '3px 8px' }}>
                          {claim.reviewStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div className="flex gap-1 justify-center">
                          <button 
                            onClick={() => {
                              onEditClaim(claim);
                              onNavigate('assistent');
                            }}
                            className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            title="Redigera"
                          >
                            <Edit size={13} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Är du säker på att du vill ta bort detta claim?')) {
                                onDeleteClaim(claim.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-coral-400"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            title="Ta bort"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'compact' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide">
            {sortedClaims.map(claim => {
              const weight = calculateClaimWeight(claim);
              const partyColor = partyColorMap[claim.partyAffiliation] || 'var(--accent-teal)';
              
              let statusBadgeClass = 'badge-gray';
              if (claim.reviewStatus === 'Granskad') statusBadgeClass = 'badge-blue';
              else if (['Kalibrerad', 'Låst'].includes(claim.reviewStatus)) statusBadgeClass = 'badge-teal';

              return (
                <div 
                  key={claim.id} 
                  className="glass-panel flex flex-col gap-2 cursor-pointer hover:-translate-y-1 transition-all duration-300"
                  style={{ 
                    borderLeft: `3px solid ${partyColor}`, 
                    padding: '16px', 
                    borderRadius: '16px',
                    fontSize: '0.82rem',
                    minHeight: '140px',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)'
                  }}
                  onClick={() => {
                    onEditClaim(claim);
                    onNavigate('assistent');
                  }}
                  title="Klicka för att redigera"
                >
                  <div className="flex justify-between items-center text-xs pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="flex items-center gap-1 font-extrabold" style={{ color: partyColor }}>
                      <PartyLogo party={claim.partyAffiliation} size={12} />
                      {claim.partyAffiliation} &bull; {claim.date}
                    </span>
                    <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.58rem', padding: '2px 6px' }}>{claim.reviewStatus}</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem', lineHeight: '1.3', padding: '8px 0px' }}>
                    {claim.neutralSummary}
                  </div>
                  <div className="flex justify-between items-center text-[0.72rem] text-gray-400 border-t border-white/5 pt-2 mt-1" onClick={(e) => e.stopPropagation()}>
                    <span className="truncate" style={{ maxWidth: '80px' }} title={claim.actor}>{claim.actor}</span>
                    <span className="truncate flex items-center gap-1 hover:text-white" style={{ maxWidth: '110px' }} title={claim.source}>
                      {(() => {
                        const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                        if (sourceUrl) {
                          return (
                            <a 
                              href={sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sky-400 hover:underline flex items-center gap-0.5 font-semibold"
                            >
                              {claim.source} <ExternalLink size={10} />
                            </a>
                          );
                        }
                        return claim.source;
                      })()}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>Dim {claim.primaryDimension} ({weight})</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'timeline' ? (
          <div className="relative flex flex-col gap-6 pl-8 animate-slide" style={{ borderLeft: '2px solid rgba(255,255,255,0.06)', marginLeft: '12px', paddingBottom: '20px' }}>
            {sortedClaims.map(claim => {
              const weight = calculateClaimWeight(claim);
              const primaryDimName = lockedDimensions.find(d => d.id === claim.primaryDimension)?.name || 'Okänd';
              const partyColor = partyColorMap[claim.partyAffiliation] || 'var(--accent-teal)';
              
              let statusBadgeClass = 'badge-gray';
              if (claim.reviewStatus === 'Granskad') statusBadgeClass = 'badge-blue';
              else if (['Kalibrerad', 'Låst'].includes(claim.reviewStatus)) statusBadgeClass = 'badge-teal';

              return (
                <div key={claim.id} className="relative flex flex-col gap-2">
                  {/* Timeline Dot with Party Logo */}
                  <span 
                    className="absolute flex items-center justify-center"
                    style={{ 
                      left: '-43px', 
                      top: '4px', 
                      width: '24px', 
                      height: '24px', 
                      backgroundColor: '#060812',
                      borderRadius: '50%',
                      zIndex: 10
                    }}
                  >
                    <PartyLogo party={claim.partyAffiliation} size={18} glow />
                  </span>
                  
                  {/* Timeline Card */}
                  <div 
                    className="glass-panel flex flex-col gap-3" 
                    style={{ 
                      padding: '16px', 
                      borderRadius: '16px', 
                      borderLeft: `4px solid ${partyColor}`,
                      marginLeft: '4px'
                    }}
                  >
                    <div className="flex justify-between items-center flex-wrap gap-2 text-xs">
                      <div className="flex gap-2 items-center flex-wrap">
                        <span style={{ fontWeight: 800, color: partyColor, fontSize: '0.85rem' }}>{claim.partyAffiliation}</span>
                        <span style={{ color: 'var(--text-muted)' }}>&bull; {claim.date}</span>
                        <span style={{ color: 'var(--text-muted)' }}>&bull;</span>
                        <span className="flex items-center gap-1 text-gray-300">
                          Källa: {(() => {
                            const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                            if (sourceUrl) {
                              return (
                                <a 
                                  href={sourceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-sky-400 hover:underline flex items-center gap-0.5 font-semibold"
                                >
                                  {claim.source} <ExternalLink size={10} />
                                </a>
                              );
                            }
                            return claim.source;
                          })()}
                        </span>
                        <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.6rem' }}>{claim.reviewStatus}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{claim.id}</span>
                    </div>

                    <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 600 }}>
                      {claim.neutralSummary}
                    </div>

                    <div className="claim-card-quote text-xs" style={{ margin: '0px', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      &rdquo;{claim.originalQuote}&rdquo;
                    </div>

                    <div className="flex justify-between items-center flex-wrap gap-4 text-xs pt-2 border-t border-white/5 text-gray-400">
                      <div>
                        Aktör: <span style={{ color: 'var(--text-primary)' }}>{claim.actor} ({claim.actorType})</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <span>Dimension: <span style={{ color: partyColor }}>{claim.primaryDimension}. {primaryDimName}</span></span>
                        <span>Vikt: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{weight}</span></span>
                        <div className="flex gap-1 justify-center ml-2">
                          <button 
                            onClick={() => {
                              onEditClaim(claim);
                              onNavigate('assistent');
                            }}
                            className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            title="Redigera"
                          >
                            <Edit size={13} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Är du säker på att du vill ta bort detta claim?')) {
                                onDeleteClaim(claim.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-coral-400"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            title="Ta bort"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="claims-list">
            {sortedClaims.map(claim => {
              const weight = calculateClaimWeight(claim);
              const primaryDimName = lockedDimensions.find(d => d.id === claim.primaryDimension)?.name || 'Okänd';
              const partyColor = partyColorMap[claim.partyAffiliation] || 'var(--accent-teal)';
              
              let statusBadgeClass = 'badge-gray';
              if (claim.reviewStatus === 'Granskad') statusBadgeClass = 'badge-blue';
              else if (['Kalibrerad', 'Låst'].includes(claim.reviewStatus)) statusBadgeClass = 'badge-teal';
              
              return (
                <div 
                  key={claim.id} 
                  className="glass-panel claim-card flex flex-col gap-4"
                  style={{ borderLeft: `4px solid ${partyColor}` }}
                >
                  {/* ID and Status Row */}
                  <div className="claim-card-header">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '6px' }}>
                        {claim.id}
                      </span>
                      <span className={`badge ${statusBadgeClass}`}>
                        {claim.reviewStatus}
                      </span>
                      
                      {claim.nearAiFlag && <span className="badge badge-purple">AI-NÄRA</span>}
                      {claim.campaignPracticeFlag && <span className="badge badge-coral">KAMPANJPRAKTIK</span>}
                      {claim.externalPressureFlag && <span className="badge badge-gray">AGENDATRYCK (EXTERNT)</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          onEditClaim(claim);
                          onNavigate('assistent');
                        }} 
                        className="p-2 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        title="Redigera detta claim"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Är du säker på att du vill ta bort detta claim?')) {
                            onDeleteClaim(claim.id);
                          }
                        }} 
                        className="p-2 rounded hover:bg-white/5 text-gray-400 hover:text-coral-400 transition-all"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        title="Ta bort detta claim"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Primary Dimension Heading */}
                  <div>
                    <div className="claim-card-title" style={{ color: partyColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PartyLogo party={claim.partyAffiliation} size={16} glow />
                      Primär Dimension: {claim.primaryDimension}. {primaryDimName}
                    </div>
                    {claim.secondaryDimensions.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Sekundära: {claim.secondaryDimensions.map(id => {
                          const name = lockedDimensions.find(d => d.id === id)?.name || '';
                          return `${id}. ${name}`;
                        }).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Original Quote */}
                  <div className="claim-card-quote">
                    &rdquo;{claim.originalQuote}&rdquo;
                  </div>

                  {/* Summary */}
                  <div className="flex flex-col">
                    <h4 className="claim-card-summary-label">Neutral sammanfattning</h4>
                    <p className="claim-card-summary-text">{claim.neutralSummary}</p>
                  </div>

                  {/* Grid metadata */}
                  <div className="claim-card-meta">
                    {/* Actor details */}
                    <div className="flex flex-col">
                      <span className="claim-card-meta-label">Aktör / Typ</span>
                      <span className="claim-card-meta-val flex items-center gap-2">
                        <PartyLogo party={claim.partyAffiliation} size={14} />
                        {claim.actor}
                      </span>
                      <span className="claim-card-meta-sub">{claim.actorType}</span>
                    </div>

                    {/* Source details */}
                    <div className="flex flex-col">
                      <span className="claim-card-meta-label">Källa / Typ</span>
                      <span className="claim-card-meta-val truncate" style={{ maxWidth: '170px', display: 'flex', alignItems: 'center', gap: '4px' }} title={claim.source}>
                        {claim.source}
                        {(() => {
                          const sourceUrl = claim.sourceUrl || (claim.id.startsWith('riksdagen-') ? `https://data.riksdagen.se/dokument/${claim.id.replace('riksdagen-', '').replace(/-d\d+$/, '')}.html` : null);
                          if (!sourceUrl) return null;
                          return (
                            <a 
                              href={sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center' }}
                              title="Öppna originaldokumentet"
                            >
                              <ExternalLink size={11} />
                            </a>
                          );
                        })()}
                      </span>
                      <span className="claim-card-meta-sub">{claim.sourceType} (Vikt {claim.sourceWeight})</span>
                    </div>

                    {/* Scoring indexes */}
                    <div className="flex flex-col">
                      <span className="claim-card-meta-label">Indexbidrag (0-5)</span>
                      <div className="flex gap-3 flex-wrap pt-1 font-bold">
                        <span className="text-teal-400" style={{ fontSize: '0.8rem' }}>Acc: {claim.accelerationContribution}</span>
                        <span className="text-coral-400" style={{ fontSize: '0.8rem' }}>Sky: {claim.protectionContribution}</span>
                        <span className="text-purple-400" style={{ fontSize: '0.8rem' }}>Sty: {claim.stateGovernanceContribution}</span>
                      </div>
                    </div>

                    {/* Calculations & Weight */}
                    <div className="flex flex-col">
                      <span className="claim-card-meta-label">Beräknad Claimvikt</span>
                      <span className="claim-card-meta-val text-sm flex items-center gap-2">
                        <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>{weight}</span>
                        {activeTrack === 'A' ? (
                          <span className="badge badge-teal" style={{ fontSize: '0.62rem', padding: '3px 8px' }}>
                            Styr profil
                          </span>
                        ) : (
                          <span className="badge badge-gray" style={{ fontSize: '0.62rem', padding: '3px 8px' }}>
                            Endast kontext
                          </span>
                        )}
                      </span>
                      {/* Math breakdown */}
                      <span className="claim-card-meta-sub truncate" style={{ fontSize: '0.72rem' }} title="Formel: Policygrad_faktor * Källvikt * Partibäring_faktor * Evidens_faktor * Gransknings_faktor">
                        pg {claim.policyDegree} × pb {claim.partyBearing === 'Hög' ? '1.0' : claim.partyBearing === 'Medel' ? '0.7' : '0.4'} × ev {claim.evidenceStrength}
                      </span>
                    </div>
                  </div>

                  {/* Bottom line tags & comment */}
                  <div className="flex justify-between items-center flex-wrap gap-4 text-xs">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {claim.tags.map(tag => (
                        <span key={tag} className="tag-pill">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Bearing info */}
                    <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                      Partibäring: <span style={{ color: 'var(--text-primary)' }}>{claim.partyBearing}</span> | Evidens: <span style={{ color: 'var(--text-primary)' }}>{claim.evidenceStrength}/5</span>
                    </div>
                  </div>

                  {/* Optional analytical comment */}
                  {claim.comment && (
                    <div style={{ marginTop: '16px', fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Analyskommentar: </span>
                      {claim.comment}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
