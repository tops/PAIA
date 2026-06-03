import React, { useState } from 'react';
import type { ClaimCard, PartyAffiliation, ActorType, ClaimType, SourceType, ReviewStatus, AssessmentConfidence } from '../types';
import { lockedDimensions } from '../data/mockClaims';
import { Sparkles, Save, Info, AlertTriangle, RefreshCw } from 'lucide-react';

interface AiAssistantProps {
  editingClaim: ClaimCard | null;
  onSaveClaim: (claim: ClaimCard) => void;
  onCancelEdit: () => void;
  onNavigate: (tab: string) => void;
}

const emptyClaimTemplate = (): ClaimCard => ({
  id: `claim-${Date.now().toString().slice(-6)}`,
  date: new Date().toISOString().split('T')[0],
  source: '',
  sourceType: 'Debattartikel',
  sourceWeight: 3,
  actor: '',
  actorType: 'Enskild riksdagsledamot',
  partyAffiliation: 'M',
  partyBearing: 'Medel',
  originalQuote: '',
  neutralSummary: '',
  claimType: 'Värdering',
  policyDegree: 2,
  primaryDimension: 1,
  secondaryDimensions: [],
  tags: [],
  concretionDegree: 2,
  investmentWill: 1,
  accelerationContribution: 2,
  protectionContribution: 2,
  stateGovernanceContribution: 2,
  implementationMaturity: 2,
  evidenceStrength: 3,
  assessmentConfidence: 'Medel',
  nearAiFlag: false,
  campaignPracticeFlag: false,
  externalPressureFlag: false,
  reviewStatus: 'Ny',
  comment: ''
});

export const AiAssistant: React.FC<AiAssistantProps> = ({
  editingClaim,
  onSaveClaim,
  onCancelEdit,
  onNavigate
}) => {
  const [claim, setClaim] = useState<ClaimCard>(() => editingClaim || emptyClaimTemplate());
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tagsInput, setTagsInput] = useState(() => editingClaim ? editingClaim.tags.join(', ') : '');

  // Simulated AI Analyzer with Local Swedish Heuristics
  const handleAiAnalysis = () => {
    if (!inputText.trim()) {
      alert('Vänligen klistra in en politisk text att analysera först.');
      return;
    }

    setIsAnalyzing(true);

    setTimeout(() => {
      const text = inputText.toLowerCase();
      
      // Default setup
      let actor = 'Politisk företrädare';
      let party: PartyAffiliation = 'M';
      let actorType: ActorType = 'Enskild riksdagsledamot';
      let source = 'Politisk debatt / Artikel';
      let sourceType: SourceType = 'Debattartikel';
      let dimensionId = 1; // Styrning
      let policyDegree: 0 | 1 | 2 | 3 = 2;
      let accel = 2;
      let prot = 2;
      let gov = 2;
      let tags: string[] = ['ai'];
      let nearAi = false;
      let campaign = false;
      let external = false;
      let claimType: ClaimType = 'Värdering';

      // 1. Detect Actor
      if (text.includes('hultqvist') || text.includes('socialdemokraterna') || text.includes(' s ')) {
        actor = text.includes('hultqvist') ? 'Peter Hultqvist (S)' : 'Socialdemokraterna';
        party = 'S';
        actorType = text.includes('hultqvist') ? 'Riksdagsgrupp' : 'Parti';
        source = 'Utskottsinitiativ / Debatt';
      } else if (text.includes('kokalari')) {
        actor = 'Sara Kokalari (M-MEP)';
        party = 'M';
        actorType = 'EU-parlamentariker';
        source = 'EU-utspel / Intervju';
        sourceType = 'Intervju';
      } else if (text.includes('ebba busch') || text.includes('kristdemokraterna') || text.includes(' kd ')) {
        actor = text.includes('ebba busch') ? 'Ebba Busch (KD)' : 'Kristdemokraterna';
        party = 'KD';
        actorType = text.includes('ebba busch') ? 'Minister' : 'Parti';
        sourceType = text.includes('ebba busch') ? 'Pressmeddelande' : 'Motion';
      } else if (text.includes('sverigedemokraterna') || text.includes(' sd ')) {
        actor = 'Sverigedemokraterna i riksdagen';
        party = 'SD';
        actorType = 'Riksdagsgrupp';
      } else if (text.includes('centerpartiet') || text.includes(' c ')) {
        actor = 'Centerpartiets kampanjchef';
        party = 'C';
        actorType = 'Partisekreterare/kampanjorganisation';
      } else if (text.includes('miljöpartiet') || text.includes(' mp ')) {
        actor = 'Miljöpartiet de Gröna';
        party = 'MP';
        actorType = 'Parti';
      } else if (text.includes('almega') || text.includes('svenskt näringsliv')) {
        actor = text.includes('almega') ? 'Almega Techföretagen' : 'Svenskt Näringsliv';
        party = 'Externt';
        actorType = 'Intresseorganisation';
        external = true;
      } else if (text.includes('forskare') || text.includes('universitet') || text.includes('rapport')) {
        actor = 'Akademisk Forskare / Expert';
        party = 'Externt';
        actorType = 'Expert/forskare';
        external = true;
      }

      // 2. Detect Dimension and weights
      if (text.includes('skola') || text.includes('lärare') || text.includes('kompetens') || text.includes('utbildning')) {
        dimensionId = 6; // Arbetsmarknad och kompetens
        tags = ['skola', 'vidareutbildning', 'läromedel'];
        gov = 3;
        accel = 2;
        prot = 3;
      } else if (text.includes('qwen') || text.includes('kina') || text.includes('säkerhet') || text.includes('cyber')) {
        dimensionId = 9; // Säkerhet och totalförsvar
        tags = ['säkerhetsrisk', 'Kina', 'cyberrisker'];
        accel = 0;
        prot = 5;
        gov = 4;
        claimType = 'Risk';
      } else if (text.includes('imy') || text.includes('sandlåda') || text.includes('tillsyn') || text.includes('ai act')) {
        dimensionId = 4; // Reglering och tillsyn
        tags = ['AI Act', 'IMY', 'sandlåda'];
        accel = 2;
        prot = 4;
        gov = 3;
        claimType = 'Åtgärd';
      } else if (text.includes('superdator') || text.includes('fabrik') || text.includes('beräkning') || text.includes('moln')) {
        dimensionId = 3; // Infrastruktur och data
        tags = ['beräkningskapacitet', 'superdator', 'molnresurser'];
        accel = 5;
        prot = 1;
        gov = 3;
        claimType = 'Åtgärd';
      } else if (text.includes('verkstad') || text.includes('välfärd') || text.includes('kommun') || text.includes('förvaltning')) {
        dimensionId = 5; // Offentlig välfärd
        tags = ['AI-verkstad', 'välfärd', 'effektivisering'];
        accel = 4;
        prot = 2;
        gov = 4;
        claimType = 'Åtgärd';
      } else if (text.includes('valet') || text.includes('kampanj') || text.includes('trollkonton') || text.includes('desinformation')) {
        dimensionId = 8; // Demokrati
        tags = ['valrörelse', 'deepfakes', 'transparens'];
        campaign = true;
        policyDegree = 1;
        accel = 0;
        prot = 4;
        gov = 2;
      } else if (text.includes('kundtjänst') || text.includes('mänsklig') || text.includes('skärm')) {
        dimensionId = 7; // Etik och inkludering
        tags = ['kundtjänst', 'digitalisering', 'mänsklig kontakt'];
        nearAi = true;
        policyDegree = 1;
        accel = 0;
        prot = 3;
        gov = 2;
      }

      // Generate simulated results
      const quote = inputText.length > 150 ? inputText.slice(0, 150) + '...' : inputText;
      const summary = `AI-assistent sammanfattar: Uttalande från ${actor} rörande ${lockedDimensions.find(d => d.id === dimensionId)?.name.toLowerCase()}.`;

      setClaim(prev => ({
        ...prev,
        actor,
        partyAffiliation: party,
        actorType,
        source,
        sourceType,
        originalQuote: quote,
        neutralSummary: summary,
        primaryDimension: dimensionId,
        policyDegree,
        accelerationContribution: accel,
        protectionContribution: prot,
        stateGovernanceContribution: gov,
        nearAiFlag: nearAi,
        campaignPracticeFlag: campaign,
        externalPressureFlag: external,
        claimType,
        tags,
        comment: 'AI-förkodat claim baserat på lokal politisk nyckelordsanalys.'
      }));

      setTagsInput(tags.join(', '));
      setIsAnalyzing(false);
      alert('AI-klassificering slutförd! Förslaget har fyllts i formuläret nedan. Vänligen granska alla fält innan du sparar.');
    }, 1200);
  };

  const handleFieldChange = <K extends keyof ClaimCard>(field: K, value: ClaimCard[K]) => {
    setClaim(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSecondaryDimsChange = (dimId: number, checked: boolean) => {
    let current = [...claim.secondaryDimensions];
    if (checked) {
      if (current.length >= 2) {
        alert('Du kan maximalt välja två sekundära dimensioner.');
        return;
      }
      current.push(dimId);
    } else {
      current = current.filter(id => id !== dimId);
    }
    handleFieldChange('secondaryDimensions', current);
  };

  const handleTagsChange = (val: string) => {
    setTagsInput(val);
    const splitTags = val.split(',').map(t => t.trim()).filter(t => t !== '');
    handleFieldChange('tags', splitTags);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.source || !claim.actor || !claim.originalQuote || !claim.neutralSummary) {
      alert('Vänligen fyll i alla obligatoriska fält (Källa, Aktör, Originalcitat och Sammanfattning).');
      return;
    }
    onSaveClaim(claim);
    alert('Claim har sparats i databasen!');
    
    // Clear and navigate
    onCancelEdit();
    onNavigate('databas');
  };

  return (
    <div className="animate-slide flex flex-col gap-8">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">
            {editingClaim ? 'Redigera Claim-kort' : 'AI-assistent & Claim-Editor'}
          </h1>
          <p className="page-subtitle">
            {editingClaim 
              ? 'Justera värden och klassificeringar för det befintliga uttalandet.' 
              : 'Klistra in ny politisk text för automatisk klassificering, eller fyll i ett nytt claim-kort manuellt.'
            }
          </p>
        </div>
      </div>

      {/* AI Classifier Box (only visible when not editing existing) */}
      {!editingClaim && (
        <div className="glass-panel ai-box flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-400 ai-glow" size={20} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>AI-snabbklassificering (v3)</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Klistra in ett svenskt politiskt citat, utskottsinitiativ eller pressmeddelande nedan. Vår lokala AI-assistent kommer att tolka dimensioner, aktörstyper och indexpoäng direkt.
          </p>

          <textarea
            className="form-control"
            style={{ minHeight: '120px' }}
            placeholder="Exempel: Peter Hultqvist (S) i försvarsutskottet varnar för kinesiska AI-modeller som Qwen i statliga myndigheter, då de utgör en allvarlig geopolitisk risk..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>

          <div className="flex justify-between items-center flex-wrap gap-4">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Analyserar partier, policygrad, 12 låsta dimensioner, och källvikt.
            </span>
            <button
              onClick={handleAiAnalysis}
              disabled={isAnalyzing}
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--accent-purple)', color: '#fff', boxShadow: '0 4px 15px var(--accent-purple-glow)' }}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="animate-spin" size={16} /> Analyserar text...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Klassificera uttalande
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="glass-panel editor-form flex flex-col gap-8">
        <div className="flex justify-between items-center pb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Save className="text-teal-400" size={22} />
            Claim-kort Detaljer (v3)
          </h2>
          {editingClaim && (
            <button 
              type="button" 
              onClick={onCancelEdit} 
              className="btn btn-secondary"
              style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem' }}
            >
              Avbryt redigering
            </button>
          )}
        </div>

        {/* Section 1: Basinformation */}
        <div>
          <h3 className="form-section-title">
            1. Basinformation
          </h3>
          
          <div className="form-grid-3">
            <div className="form-group">
              <label className="flex items-center gap-2">
                Claim-ID <span title="Unikt ID för detta uttalande" className="flex items-center"><Info size={12} className="text-gray-500" /></span>
              </label>
              <input
                type="text"
                value={claim.id}
                onChange={(e) => handleFieldChange('id', e.target.value)}
                className="form-control"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                disabled // Keep readonly
              />
            </div>

            <div className="form-group">
              <label>Uttalandedatum *</label>
              <input
                type="date"
                value={claim.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Källtyp *</label>
              <select
                value={claim.sourceType}
                onChange={(e) => handleFieldChange('sourceType', e.target.value as SourceType)}
                className="form-control"
              >
                <option value="Budget">Budget</option>
                <option value="Strategi">Strategi</option>
                <option value="Motion">Motion</option>
                <option value="Intervju">Intervju</option>
                <option value="Tweet">Tweet</option>
                <option value="Debattartikel">Debattartikel</option>
                <option value="Regeringsbeslut">Regeringsbeslut</option>
                <option value="Pressmeddelande">Pressmeddelande</option>
              </select>
            </div>

            <div className="form-group">
              <label>Källa / Referens *</label>
              <input
                type="text"
                placeholder="T.ex. Regeringens AI-strategi s. 12"
                value={claim.source}
                onChange={(e) => handleFieldChange('source', e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Källvikt (1-5) *</label>
              <select
                value={claim.sourceWeight}
                onChange={(e) => handleFieldChange('sourceWeight', Number(e.target.value))}
                className="form-control"
              >
                <option value="1">1 (Mycket svag / tweet)</option>
                <option value="2">2 (Svag / lokal debatt)</option>
                <option value="3">3 (Medel / talesperson)</option>
                <option value="4">4 (Stark / motion, anslag)</option>
                <option value="5">5 (Tung / regeringsbeslut, budget)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Partianknytning *</label>
              <select
                value={claim.partyAffiliation}
                onChange={(e) => handleFieldChange('partyAffiliation', e.target.value as PartyAffiliation)}
                className="form-control"
              >
                <option value="S">Socialdemokraterna (S)</option>
                <option value="M">Moderaterna (M)</option>
                <option value="SD">Sverigedemokraterna (SD)</option>
                <option value="C">Centerpartiet (C)</option>
                <option value="V">Vänsterpartiet (V)</option>
                <option value="MP">Miljöpartiet (MP)</option>
                <option value="L">Liberalerna (L)</option>
                <option value="KD">Kristdemokraterna (KD)</option>
                <option value="Externt">Externt (Expert/Intresseorg)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Aktör / Person / Organisation *</label>
              <input
                type="text"
                placeholder="T.ex. Ebba Busch (KD)"
                value={claim.actor}
                onChange={(e) => handleFieldChange('actor', e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Aktörstyp *</label>
              <select
                value={claim.actorType}
                onChange={(e) => handleFieldChange('actorType', e.target.value as ActorType)}
                className="form-control"
              >
                <option value="Parti">Parti (Partiprogram, partistyrelse)</option>
                <option value="Regering">Regering (Gemensamt beslut)</option>
                <option value="Minister">Minister (Statsråd)</option>
                <option value="Riksdagsgrupp">Riksdagsgrupp (Motion, reservation)</option>
                <option value="Enskild riksdagsledamot">Enskild riksdagsledamot</option>
                <option value="EU-parlamentariker">EU-parlamentariker</option>
                <option value="Partisekreterare/kampanjorganisation">Partisekreterare / Kampanj</option>
                <option value="Myndighet">Myndighet (Rapport, remissvar)</option>
                <option value="Intresseorganisation">Intresseorganisation (Almega, LO)</option>
                <option value="Expert/forskare">Expert / Forskare</option>
                <option value="Civilsamhälle">Civilsamhälle</option>
              </select>
            </div>

            <div className="form-group">
              <label>Partibäring *</label>
              <select
                value={claim.partyBearing}
                onChange={(e) => handleFieldChange('partyBearing', e.target.value as 'Låg' | 'Medel' | 'Hög')}
                className="form-control"
              >
                <option value="Låg">Låg (Enskild kommentar, svag koppling)</option>
                <option value="Medel">Medel (Talesperson, debattartikel)</option>
                <option value="Hög">Hög (Partiprogram, budgetmotion)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Innehåll */}
        <div>
          <h3 className="form-section-title">
            2. Uttalandets Innehåll
          </h3>

          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label>Originalcitat (Svenska) *</label>
              <textarea
                value={claim.originalQuote}
                onChange={(e) => handleFieldChange('originalQuote', e.target.value)}
                className="form-control"
                placeholder="Skriv eller klistra in det exakta originalcitatet..."
                rows={3}
                required
              ></textarea>
            </div>

            <div className="form-group">
              <label>Neutral sammanfattning *</label>
              <input
                type="text"
                placeholder="Vad sägs konkret utan tolkning?"
                value={claim.neutralSummary}
                onChange={(e) => handleFieldChange('neutralSummary', e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label>Claimtyp</label>
                <select
                  value={claim.claimType}
                  onChange={(e) => handleFieldChange('claimType', e.target.value as ClaimType)}
                  className="form-control"
                >
                  <option value="Problem">Problem</option>
                  <option value="Mål">Mål</option>
                  <option value="Åtgärd">Åtgärd</option>
                  <option value="Risk">Risk</option>
                  <option value="Värdering">Värdering</option>
                  <option value="Ansvar">Ansvar</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Taggar (separera med kommatecken)</label>
                <input
                  type="text"
                  placeholder="T.ex. språkmodell, välfärd, tillsyn"
                  value={tagsInput}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Relevans, Flaggor & Dimensioner */}
        <div>
          <h3 className="form-section-title">
            3. AI-Politisk Relevans & Dimensioner
          </h3>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="flex items-center gap-2">
                Policygrad (0-3) *
                <span title="0 = Ingen AI-politik, 1 = Samhällsclaim, 2 = Policyclaim, 3 = Skarp åtgärd" className="flex items-center"><Info size={12} className="text-gray-500" /></span>
              </label>
              <select
                value={claim.policyDegree}
                onChange={(e) => handleFieldChange('policyDegree', Number(e.target.value) as 0 | 1 | 2 | 3)}
                className="form-control"
              >
                <option value="0">Grad 0: AI nämns, men ingen politik (faktor 0)</option>
                <option value="1">Grad 1: AI-nära samhällsclaim (faktor 0.25)</option>
                <option value="2">Grad 2: AI-policyclaim (faktor 0.75)</option>
                <option value="3">Grad 3: Konkret AI-politisk åtgärd (faktor 1.0)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Primär Dimension (Låsta 12) *</label>
              <select
                value={claim.primaryDimension}
                onChange={(e) => handleFieldChange('primaryDimension', Number(e.target.value))}
                className="form-control"
              >
                {lockedDimensions.map(d => (
                  <option key={d.id} value={d.id}>{d.id}. {d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>AI-spår Flaggor</label>
              <div className="flex flex-col gap-2 pt-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={claim.nearAiFlag}
                    onChange={(e) => handleFieldChange('nearAiFlag', e.target.checked)}
                  />
                  <span>AI-nära samhällsclaim (Spår B)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={claim.campaignPracticeFlag}
                    onChange={(e) => handleFieldChange('campaignPracticeFlag', e.target.checked)}
                  />
                  <span>AI i kampanjpraktik (Spår C)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={claim.externalPressureFlag}
                    onChange={(e) => handleFieldChange('externalPressureFlag', e.target.checked)}
                  />
                  <span>Externt Agendatryck</span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Sekundära Dimensioner (Välj max 2)</label>
            <div className="flex flex-wrap gap-2.5 pt-2 text-xs">
              {lockedDimensions.map(d => (
                <label 
                  key={d.id} 
                  className={`flex items-center gap-2 cursor-pointer p-2.5 rounded border ${
                    claim.primaryDimension === d.id ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                  style={{
                    backgroundColor: claim.secondaryDimensions.includes(d.id) ? 'rgba(0,230,207,0.04)' : 'rgba(255,255,255,0.01)',
                    borderColor: claim.secondaryDimensions.includes(d.id) ? 'var(--accent-teal)' : 'rgba(255,255,255,0.04)',
                    color: claim.secondaryDimensions.includes(d.id) ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={claim.primaryDimension === d.id}
                    checked={claim.secondaryDimensions.includes(d.id)}
                    onChange={(e) => handleSecondaryDimsChange(d.id, e.target.checked)}
                  />
                  <span>{d.id}. {d.name.substring(0, 18)}...</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Indexbidrag & Kvalitetsmått */}
        <div>
          <h3 className="form-section-title">
            4. Indexbidrag & Bedömningsvärden (v3)
          </h3>

          <div className="form-grid-3">
            <div className="form-group flex flex-col gap-2">
              <label>Accelerationsbidrag (0-5)</label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={claim.accelerationContribution}
                onChange={(e) => handleFieldChange('accelerationContribution', Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--accent-teal)' }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-teal)', textAlign: 'right', marginTop: '4px' }}>
                {claim.accelerationContribution} / 5
              </span>
            </div>

            <div className="form-group flex flex-col gap-2">
              <label>Skyddsbidrag (0-5)</label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={claim.protectionContribution}
                onChange={(e) => handleFieldChange('protectionContribution', Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--accent-coral)' }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-coral)', textAlign: 'right', marginTop: '4px' }}>
                {claim.protectionContribution} / 5
              </span>
            </div>

            <div className="form-group flex flex-col gap-2">
              <label>Statligt styrningsbidrag (0-5)</label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={claim.stateGovernanceContribution}
                onChange={(e) => handleFieldChange('stateGovernanceContribution', Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--accent-purple)' }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-purple)', textAlign: 'right', marginTop: '4px' }}>
                {claim.stateGovernanceContribution} / 5
              </span>
            </div>

            <div className="form-group">
              <label>Konkretionsgrad (0-4)</label>
              <select
                value={claim.concretionDegree}
                onChange={(e) => handleFieldChange('concretionDegree', Number(e.target.value))}
                className="form-control"
              >
                <option value="0">0 (Löst tyckande)</option>
                <option value="1">1 (Allmän vision)</option>
                <option value="2">2 (Riktlinje)</option>
                <option value="3">3 (Konkret förslag)</option>
                <option value="4">4 (Färdigt regeringsbeslut/lag)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Investeringsvilja (0-4)</label>
              <select
                value={claim.investmentWill}
                onChange={(e) => handleFieldChange('investmentWill', Number(e.target.value))}
                className="form-control"
              >
                <option value="0">0 (Ingen finansiering nämns)</option>
                <option value="1">1 (Allmän viljeinriktning)</option>
                <option value="2">2 (Mindre anslag)</option>
                <option value="3">3 (Medelstor budgetsatsning)</option>
                <option value="4">4 (Storskalig statlig miljardsatsning)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Evidensstyrka (0-5)</label>
              <select
                value={claim.evidenceStrength}
                onChange={(e) => handleFieldChange('evidenceStrength', Number(e.target.value))}
                className="form-control"
              >
                <option value="0">0 (Ingen evidens)</option>
                <option value="1">1 (Mycket svag)</option>
                <option value="2">2 (Svag)</option>
                <option value="3">3 (Medel)</option>
                <option value="4">4 (Stark)</option>
                <option value="5">5 (Mycket stark / spikad lag)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Granskningsstatus *</label>
              <select
                value={claim.reviewStatus}
                onChange={(e) => handleFieldChange('reviewStatus', e.target.value as ReviewStatus)}
                className="form-control"
              >
                <option value="Ny">Ny (ej mänskligt granskad - faktor 0.5)</option>
                <option value="Granskad">Granskad (faktor 0.8)</option>
                <option value="Kalibrerad">Kalibrerad (faktor 1.0)</option>
                <option value="Låst">Låst (faktor 1.0)</option>
                <option value="Arkiverad">Arkiverad (faktor 1.0)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Bedömningssäkerhet</label>
              <select
                value={claim.assessmentConfidence}
                onChange={(e) => handleFieldChange('assessmentConfidence', e.target.value as AssessmentConfidence)}
                className="form-control"
              >
                <option value="Låg">Låg</option>
                <option value="Medel">Medel</option>
                <option value="Hög">Hög</option>
              </select>
            </div>

            <div className="form-group">
              <label>Genomförandemognad (0-5)</label>
              <select
                value={claim.implementationMaturity}
                onChange={(e) => handleFieldChange('implementationMaturity', Number(e.target.value))}
                className="form-control"
              >
                <option value="0">0 (Enbart idé)</option>
                <option value="1">1 (Tidigt utkast)</option>
                <option value="2">2 (Utredningsdirektiv)</option>
                <option value="3">3 (Remissfas)</option>
                <option value="4">4 (Beslutad men ej driftsatt)</option>
                <option value="5">5 (Helt implementerad)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Analytisk kommentar / Motivering</label>
            <textarea
              value={claim.comment}
              onChange={(e) => handleFieldChange('comment', e.target.value)}
              className="form-control"
              placeholder="Skriv en kort kommentar om tolkningen av detta claim..."
              rows={2}
            ></textarea>
          </div>
        </div>

        {/* Warning Indicator for status weights */}
        {claim.reviewStatus === 'Ny' && (
          <div className="flex gap-2 p-4 bg-coral-500/10 border border-coral-500/20 text-coral-400 rounded-xl text-xs items-start" style={{ lineHeight: '1.6' }}>
            <AlertTriangle className="flex-shrink-0" size={16} style={{ marginTop: '2px' }} />
            <div>
              <span className="font-bold" style={{ fontSize: '0.82rem' }}>Observera:</span> Detta claim har status &rdquo;Ny&rdquo;, vilket innebär att det väger hälften så mycket (faktor 0.5) i partipoängens sammanställning tills det har markerats som &rdquo;Granskad&rdquo; eller högre.
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button
            type="button"
            onClick={onCancelEdit}
            className="btn btn-secondary"
          >
            Nollställ
          </button>
          <button
            type="submit"
            className="btn btn-primary"
          >
            Spara Claim till Databas
          </button>
        </div>
      </form>
    </div>
  );
};
