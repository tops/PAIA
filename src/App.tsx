import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ClaimCard, PartyAffiliation, UserStance } from './types';
import { Dashboard } from './components/Dashboard';
import { DatabaseView } from './components/DatabaseView';
import { PartyProfiles } from './components/PartyProfiles';
import { AiCompass } from './components/AiCompass';
import { TransparencyView } from './components/TransparencyView';
import { FeedbackModal } from './components/FeedbackModal';
import { FeedbackAdminView } from './components/FeedbackAdminView';
import { DimensionExplorer } from './components/DimensionExplorer';
import { 
  LayoutDashboard, Database, UserCheck, 
  Calendar, CheckSquare, Compass, BookOpen, ShieldAlert, Key, Lock, Layers
} from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedParty, setSelectedParty] = useState<PartyAffiliation>('S');
  const [editingClaim, setEditingClaim] = useState<ClaimCard | null>(null);

  // Administrative view state
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [adminPasscode, setAdminPasscode] = useState<string>('');

  // Integrate persistent Local Storage with mock claims fallback
  const [claims, setClaims] = useLocalStorage<ClaimCard[]>('ai_political_claims_v3', []);
  const [initialClaimsFromServer, setInitialClaimsFromServer] = useState<ClaimCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userStance, setUserStance] = useLocalStorage<UserStance | null>('ai_political_user_stance', null);

  // Dynamic date and election countdown calculation
  const today = new Date();
  const swedishDate = new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(today);

  const electionDate = new Date('2026-09-13T00:00:00');
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.ceil((electionDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeftText = diffDays > 0 
    ? `Riksdagsval: ${diffDays} dagar kvar` 
    : diffDays === 0 
      ? 'Riksdagsval: Idag!' 
      : 'Riksdagsval: Genomfört';

  // Automatic migration: If the database is missing any of the standard claims, contains mock claims, or is old, upgrade/merge it!
  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch('https://storage.googleapis.com/pai-claims-data-2026/imported_claims.json');
        if (!res.ok) {
          throw new Error('Misslyckades att hämta claims-databasen från servern.');
        }
        const data = await res.json() as ClaimCard[];
        setInitialClaimsFromServer(data);
        
        setClaims(prevClaims => {
          const currentClaims = prevClaims || [];
          
          // If local storage is empty, initialize with fetched claims
          if (currentClaims.length === 0) {
            return data;
          }
          
          let updated = [...currentClaims];
          
          // 1. Automatically remove only the 15 original mock claims (claim-1 to claim-15)
          const isMockClaimId = (id: string) => /^claim-(?:[1-9]|1[0-5])$/.test(id);
          const hasMockClaims = updated.some(c => isMockClaimId(c.id));
          if (hasMockClaims) {
            updated = updated.filter(c => !isMockClaimId(c.id));
          }

          // 2. Sync/merge standard claims if the size is smaller than the fetched package
          if (updated.length < data.length) {
            const initialIds = new Set(data.map(c => c.id));
            const hasCustomClaims = updated.some(c => !initialIds.has(c.id));
            if (!hasCustomClaims) {
              return data;
            } else {
              const prevIds = new Set(updated.map(c => c.id));
              const missing = data.filter(c => !prevIds.has(c.id));
              if (missing.length > 0) {
                updated = [...updated, ...missing];
              }
            }
          }

          // 3. Auto-update generic "Riksdagsledamot" actor names to real names
          const hasGenericClaims = updated.some(c => c.id.startsWith('riksdagen-') && c.actor === 'Riksdagsledamot');
          const initialHasGeneric = data.some(c => c.id.startsWith('riksdagen-') && c.actor === 'Riksdagsledamot');
          if (hasGenericClaims && !initialHasGeneric) {
            const initialMap = new Map(data.map(c => [c.id, c]));
            updated = updated.map(c => {
              if (c.id.startsWith('riksdagen-') && c.actor === 'Riksdagsledamot') {
                const fresh = initialMap.get(c.id);
                if (fresh && fresh.actor !== 'Riksdagsledamot') {
                  return {
                    ...c,
                    actor: fresh.actor,
                    actorType: fresh.actorType,
                    partyAffiliation: fresh.partyAffiliation,
                    neutralSummary: c.neutralSummary.replace('Riksdagsledamot', fresh.actor)
                  };
                }
              }
              return c;
            });
          }

          // 4. Clean up any leftover 'Externt' partyAffiliations
          const hasMisplacedExternal = updated.some(c => c.id.startsWith('riksdagen-') && c.partyAffiliation === 'Externt' && data.find(ic => ic.id === c.id)?.partyAffiliation !== 'Externt');
          if (hasMisplacedExternal) {
            const initialMap = new Map(data.map(c => [c.id, c]));
            updated = updated.map(c => {
              if (c.id.startsWith('riksdagen-') && c.partyAffiliation === 'Externt') {
                const fresh = initialMap.get(c.id);
                if (fresh && fresh.partyAffiliation !== 'Externt') {
                  return {
                    ...c,
                    partyAffiliation: fresh.partyAffiliation
                  };
                }
              }
              return c;
            });
          }

          // 5. Auto-update generic "Riksdagsutskottet" actor names
          const hasGenericUtskott = updated.some(c => c.id.startsWith('riksdagen-') && c.actor === 'Riksdagsutskottet');
          const initialHasGenericUtskott = data.some(c => c.id.startsWith('riksdagen-') && c.actor === 'Riksdagsutskottet');
          if (hasGenericUtskott && !initialHasGenericUtskott) {
            const initialMap = new Map(data.map(c => [c.id, c]));
            updated = updated.map(c => {
              if (c.id.startsWith('riksdagen-') && c.actor === 'Riksdagsutskottet') {
                const fresh = initialMap.get(c.id);
                if (fresh && fresh.actor !== 'Riksdagsutskottet') {
                  return {
                    ...c,
                    actor: fresh.actor,
                    actorType: fresh.actorType,
                    neutralSummary: c.neutralSummary
                      .replace('Riksdagsutskottet', fresh.actor)
                      .replace('riksdagsutskottet', fresh.actor)
                  };
                }
              }
              return c;
            });
          }

          return updated;
        });
      } catch (err) {
        console.error("Kunde inte hämta claims från servern:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchClaims();
  }, [setClaims]);

  // Save or edit a claim
  const handleSaveClaim = (updatedClaim: ClaimCard) => {
    setClaims(prevClaims => {
      const exists = prevClaims.some(c => c.id === updatedClaim.id);
      if (exists) {
        // Edit existing
        return prevClaims.map(c => c.id === updatedClaim.id ? updatedClaim : c);
      } else {
        // Add new
        return [updatedClaim, ...prevClaims];
      }
    });
    setEditingClaim(null);
  };

  // Delete a claim
  const handleDeleteClaim = (id: string) => {
    setClaims(prevClaims => prevClaims.filter(c => c.id !== id));
  };

  // Import claims list (overwrites or merges)
  const handleImportClaims = (imported: ClaimCard[]) => {
    setClaims(imported);
  };

  const handleEditClaimTrigger = (claim: ClaimCard) => {
    setEditingClaim(claim);
    setActiveTab('metod');
  };

  return (
    <div className="app-container">
      {/* Premium Sidebar Navigation */}
      <aside className="sidebar">
        {/* Logo Section */}
        <div className="sidebar-logo-section">
          <div className="sidebar-logo">
            <span className="sidebar-logo-indicator ai-glow"></span>
            Politisk AI-analys
          </div>
          <div className="sidebar-subtitle">
            Medborgarguide inför valet
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="nav-menu">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            Översikt & Analys
          </button>

          <button 
            onClick={() => setActiveTab('kompassen')} 
            className={`nav-item ${activeTab === 'kompassen' ? 'active' : ''}`}
          >
            <Compass size={18} />
            AI-kompassen
          </button>

          <button 
            onClick={() => setActiveTab('dimensioner')} 
            className={`nav-item ${activeTab === 'dimensioner' ? 'active' : ''}`}
          >
            <Layers size={18} />
            De 12 dimensionerna
          </button>

          <button 
            onClick={() => setActiveTab('profiler')} 
            className={`nav-item ${activeTab === 'profiler' ? 'active' : ''}`}
          >
            <UserCheck size={18} />
            Parti för parti
          </button>
          
          <button 
            onClick={() => setActiveTab('databas')} 
            className={`nav-item ${activeTab === 'databas' ? 'active' : ''}`}
          >
            <Database size={18} />
            Alla ställningstaganden
          </button>

          <button 
            onClick={() => setActiveTab('metod')} 
            className={`nav-item ${activeTab === 'metod' ? 'active' : ''}`}
          >
            <BookOpen size={18} />
            Så fungerar det
          </button>

          {isAdminMode && (
            <button 
              onClick={() => setActiveTab('admin')} 
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              style={{ 
                color: activeTab === 'admin' ? 'var(--accent-purple)' : 'var(--text-secondary)',
                borderLeftColor: activeTab === 'admin' ? 'var(--accent-purple)' : 'transparent' 
              }}
            >
              <ShieldAlert size={18} />
              Adminpanel
            </button>
          )}
        </nav>

        {/* Footer date & election details */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-item" style={{ color: 'var(--text-secondary)' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            {swedishDate}
          </div>
          <div className="sidebar-footer-item" style={{ color: 'var(--text-secondary)' }}>
            <CheckSquare size={14} style={{ color: 'var(--text-muted)' }} />
            {daysLeftText}
          </div>
          <div className="sidebar-footer-sub">
            Oberoende medborgarguide inför riksdagsvalet 2026. Vi använder AI för att bearbeta och strukturera politiska data. Analyser kan innehålla felaktigheter och bör granskas källkritiskt.
          </div>
          
          {/* Admin Mode Toggle */}
          <div className="sidebar-footer-item" style={{ marginTop: '12px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
            {isAdminMode ? (
              <button 
                type="button"
                onClick={() => {
                  setIsAdminMode(false);
                  if (activeTab === 'admin') setActiveTab('dashboard');
                }}
                className="btn btn-secondary flex items-center gap-2"
                style={{ padding: '8px 12px', width: '100%', fontSize: '0.72rem', borderRadius: '8px', color: 'var(--accent-coral)', minHeight: 'auto' }}
              >
                <Lock size={11} /> Logga ut Admin
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => setShowAdminLogin(true)}
                className="flex items-center gap-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, padding: 0 }}
              >
                <Key size={11} /> Admin-läge
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {isLoading && claims.length === 0 ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Laddar in claims-databasen...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard 
                claims={claims} 
                onSelectParty={setSelectedParty}
                onNavigate={setActiveTab}
                onEditClaim={isAdminMode ? handleEditClaimTrigger : undefined}
                userStance={userStance}
              />
            )}

            {activeTab === 'databas' && (
              <DatabaseView 
                claims={claims} 
                initialClaims={initialClaimsFromServer}
                onEditClaim={handleEditClaimTrigger} 
                onDeleteClaim={handleDeleteClaim}
                onImportClaims={handleImportClaims}
                onNavigate={setActiveTab}
                isAdminMode={isAdminMode}
              />
            )}

            {activeTab === 'profiler' && (
              <PartyProfiles 
                claims={claims} 
                selectedParty={selectedParty}
                onSelectParty={setSelectedParty}
              />
            )}

            {activeTab === 'kompassen' && (
              <AiCompass 
                userStance={userStance}
                onUpdateStance={setUserStance}
                claims={claims}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'dimensioner' && (
              <DimensionExplorer 
                userStance={userStance}
                onUpdateStance={setUserStance}
                claims={claims}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'metod' && (
              <TransparencyView 
                editingClaim={editingClaim}
                onSaveClaim={handleSaveClaim}
                onCancelEdit={() => setEditingClaim(null)}
                onNavigate={setActiveTab}
                isAdminMode={isAdminMode}
              />
            )}

            {activeTab === 'admin' && isAdminMode && (
              <FeedbackAdminView />
            )}
          </>
        )}
      </main>

      {/* Global Feedback Trigger and Modal */}
      <FeedbackModal activeTab={activeTab} />

      {/* Admin Login Dialog Overlay */}
      {showAdminLogin && (
        <div className="feedback-modal-backdrop" onClick={() => setShowAdminLogin(false)}>
          <div className="feedback-modal-content glass-panel p-6" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="feedback-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Aktivera Admin-vy</h3>
              <button 
                type="button"
                className="feedback-modal-close" 
                onClick={() => setShowAdminLogin(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Ange administratörslösenordet för att låsa upp feedback-dashboarden.
              </p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Lösenord</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="Ange lösenord (admin2026)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (adminPasscode === 'admin2026') {
                        setIsAdminMode(true);
                        setShowAdminLogin(false);
                        setAdminPasscode('');
                        setActiveTab('admin');
                      } else {
                        alert('Felaktigt lösenord!');
                      }
                    }
                  }}
                />
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (adminPasscode === 'admin2026') {
                    setIsAdminMode(true);
                    setShowAdminLogin(false);
                    setAdminPasscode('');
                    setActiveTab('admin');
                  } else {
                    alert('Felaktigt lösenord!');
                  }
                }}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Logga in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
