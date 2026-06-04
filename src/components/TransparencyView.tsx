import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Search, ChevronRight, Check } from 'lucide-react';
import { submitFeedback } from '../utils/feedbackService';
import { AiAssistant } from './AiAssistant';
import type { ClaimCard, Feedback } from '../types';

interface Section {
  title: string;
  id: string;
  elements: React.ReactNode[];
}

interface TransparencyViewProps {
  editingClaim: ClaimCard | null;
  onSaveClaim: (claim: ClaimCard) => void;
  onCancelEdit: () => void;
  onNavigate: (tab: string) => void;
  isAdminMode?: boolean;
}

export function TransparencyView({
  editingClaim,
  onSaveClaim,
  onCancelEdit,
  onNavigate,
  isAdminMode = false
}: TransparencyViewProps) {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // 1. Fetch transparency.md from public folder at runtime
  useEffect(() => {
    fetch('/transparens.md')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Kunde inte läsa transparensrapporten.');
        }
        return res.text();
      })
      .then((text) => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // 2. Scroll Spy: Track which heading is active in viewport
  useEffect(() => {
    if (loading || !markdown) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      let currentActive = '';

      const entries = Object.entries(sectionRefs.current);
      for (const [id, el] of entries) {
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            currentActive = id;
          }
        }
      }

      if (currentActive) {
        setActiveSectionId(currentActive);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Initial call
    setTimeout(handleScroll, 100);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, markdown]);

  // 3. Auto-scroll to AI-Lab if editing a claim
  useEffect(() => {
    if (editingClaim && !loading) {
      const timer = setTimeout(() => {
        const el = document.getElementById('8-testa-ai-analysatorn-ai-lab');
        if (el) {
          const offset = el.offsetTop - 40;
          window.scrollTo({
            top: offset,
            behavior: 'smooth',
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [editingClaim, loading]);

  // 4. Jump to section on TOC click
  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = el.offsetTop - 40;
      window.scrollTo({
        top: offset,
        behavior: 'smooth',
      });
      setActiveSectionId(id);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 flex-grow" style={{ minHeight: '60vh' }}>
        <div className="sidebar-logo-indicator ai-glow" style={{ width: '20px', height: '20px', marginBottom: '16px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Laddar transparensrapport...</p>
      </div>
    );
  }

  if (error || !markdown) {
    return (
      <div className="glass-panel p-8 text-center flex flex-col items-center gap-4">
        <p style={{ color: 'var(--accent-coral)' }}>Kunde inte läsa in transparensrapporten. Kontrollera att filen /public/transparens.md finns.</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary">Försök igen</button>
      </div>
    );
  }

  // 5. Custom LaTeX and HTML Inline/Block Parser
  const sections = parseMarkdown(markdown);

  // Filter sections/elements based on search query
  const filteredSections = searchQuery
    ? sections.map(sec => {
        const matchingElements = sec.elements.filter(el => {
          const text = getElementText(el).toLowerCase();
          return text.includes(searchQuery.toLowerCase());
        });
        return {
          ...sec,
          elements: matchingElements.length > 0 ? sec.elements : []
        };
      }).filter(sec => sec.elements.length > 0)
    : sections;

  return (
    <div className="flex flex-col gap-6 flex-grow">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-info">
          <span className="badge badge-teal" style={{ alignSelf: 'flex-start' }}>Metod & Transparens</span>
          <h1 className="page-title">Systembeskrivning</h1>
          <p className="page-subtitle">
            Här förklarar vi i detalj hur positionsbevakningen fungerar, från insamling av riksdagsdata till viktningsformler och gap-analys.
          </p>
        </div>
        <div className="status-indicator">
          <BookOpen size={16} className="party-SD" style={{ backgroundColor: 'transparent' }} />
          <span>Full insyn för användare</span>
        </div>
      </header>

      {/* Search and Layout Grid */}
      <div className="flex flex-col gap-6">
        <div className="glass-panel p-4 flex items-center gap-4" style={{ background: 'var(--bg-card)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Sök i transparensrapporten (t.ex. 'Totalvikt', 'Riksdagen', 'Spår A')..."
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: '4px' }}
          />
          {searchQuery && (
            <button 
              className="badge badge-gray" 
              onClick={() => setSearchQuery('')}
              style={{ cursor: 'pointer', background: 'rgba(15, 23, 42, 0.05)' }}
            >
              Rensa
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '40px', alignItems: 'start' }}>
          
          {/* Left Column: Floating Index / Table of Contents */}
          <aside style={{ position: 'sticky', top: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel p-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                Dokumentinnehåll
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => handleScrollToSection(sec.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      background: activeSectionId === sec.id ? 'rgba(0, 230, 207, 0.06)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: activeSectionId === sec.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: activeSectionId === sec.id ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      borderLeft: activeSectionId === sec.id ? '2px solid var(--accent-teal)' : '2px solid transparent',
                      paddingLeft: activeSectionId === sec.id ? '10px' : '12px'
                    }}
                  >
                    <ChevronRight size={14} style={{ color: activeSectionId === sec.id ? 'var(--accent-teal)' : 'var(--text-muted)', opacity: activeSectionId === sec.id ? 1 : 0.5 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.title}</span>
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="glass-panel p-4 text-center" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <Check size={14} style={{ color: 'var(--accent-teal)', marginBottom: '6px' }} />
              <div>Transparensrapporten speglar den aktiva koden i systemets beräkningsmotor.</div>
            </div>
          </aside>

          {/* Right Column: Content Area */}
          <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {filteredSections.length === 0 ? (
              <div className="glass-panel p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                Inga stycken matchade din sökning &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredSections.map((sec) => (
                <section
                  key={sec.id}
                  id={sec.id}
                  ref={(el) => { sectionRefs.current[sec.id] = el; }}
                  className="glass-panel p-6"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    scrollMarginTop: '80px',
                    background: 'var(--bg-card)'
                  }}
                >
                  {sec.id.includes('testa-ai-analysatorn') ? (
                    <>
                      {sec.elements}
                      <div className="mt-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <AiAssistant
                          editingClaim={editingClaim}
                          onSaveClaim={onSaveClaim}
                          onCancelEdit={onCancelEdit}
                          onNavigate={onNavigate}
                          isAdminMode={isAdminMode}
                        />
                      </div>
                    </>
                  ) : sec.id.includes('skicka-feedback') ? (
                    <>
                      {sec.elements}
                      <InlineFeedbackForm />
                    </>
                  ) : (
                    sec.elements
                  )}
                </section>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function InlineFeedbackForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<Feedback['category']>('Förbättringsförslag');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('Vänligen fyll i meddelandefältet.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await submitFeedback({
        name,
        email,
        category,
        message,
        page: 'Metod & Transparens (Inline)'
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod när feedbacken skickades.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4 p-5 glass-panel" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
      <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700 }}>
        Skicka dina synpunkter direkt till våra analytiker
      </h4>
      
      {success ? (
        <div style={{ padding: '16px', background: 'rgba(13, 148, 136, 0.08)', border: '1px solid var(--accent-teal)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--accent-teal)', fontSize: '1.2rem', fontWeight: 'bold' }}>✓</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Tack för din feedback!</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Vi läser allt som kommer in och försöker återkoppla till dig om vi hinner.</div>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div style={{ padding: '12px', background: 'rgba(255, 69, 36, 0.08)', border: '1px solid var(--accent-coral)', borderRadius: '8px', color: 'var(--accent-coral)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Namn (valfritt)</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="form-control" 
                placeholder="T.ex. Johan Andersson"
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>E-postadress (valfritt, om svar önskas)</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="form-control" 
                placeholder="T.ex. johan@example.se"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Kategori</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value as Feedback['category'])} 
              className="form-control"
            >
              <option value="Förbättringsförslag">Förbättringsförslag</option>
              <option value="Felaktig data">Felaktig data (Rapportera fel i ställningstagande)</option>
              <option value="Allmän feedback">Allmän feedback</option>
              <option value="Annat">Annat</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Meddelande *</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              className="form-control" 
              placeholder="Beskriv vad du tycker eller vad som kan förbättras..."
              rows={4}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start', marginTop: '8px' }}
          >
            {isSubmitting ? 'Skickar...' : 'Skicka feedback'}
          </button>
        </>
      )}
    </form>
  );
}


// ====================================================
// MARKDOWN PARSING ENGINE
// ====================================================

function FormulaCard() {
  return (
    <div className="glass-panel p-6 mb-4 mt-4" style={{ background: 'var(--bg-main)', border: '1px solid rgba(13, 148, 136, 0.15)', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(13, 148, 136, 0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <h4 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontFamily: 'var(--font-heading)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="sidebar-logo-indicator ai-glow" style={{ width: '8px', height: '8px', backgroundColor: 'var(--accent-teal)' }}></span>
        Beräkningsmodell för Anspråkets Totalvikt (Claim Weight)
      </h4>
      
      {/* Interactive Visual Flow Chart */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: '20px 0', padding: '16px', background: 'rgba(15, 23, 42, 0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', minWidth: '120px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Policygrad</span>
          <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>0.0 &rarr; 1.0</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Maturitetsgrad</span>
        </div>
        
        <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>&times;</span>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', minWidth: '120px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Källvikt</span>
          <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>1 &rarr; 5</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Dokumenttyngd</span>
        </div>
        
        <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>&times;</span>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', minWidth: '120px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Partibäring</span>
          <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>0.4 &rarr; 1.0</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Partiförankring</span>
        </div>
        
        <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>&times;</span>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', minWidth: '120px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Evidens</span>
          <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>0.2 &rarr; 1.0</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Styrka &times; 0.2</span>
        </div>
        
        <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>&times;</span>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', minWidth: '120px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Granskning</span>
          <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>0.5 &rarr; 1.0</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Verifieringsstatus</span>
        </div>
        
        <span style={{ fontSize: '1.5rem', color: 'var(--accent-teal)', fontWeight: 'bold' }}>=</span>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px', background: 'rgba(13, 148, 136, 0.08)', border: '1px solid var(--accent-teal)', borderRadius: '8px', minWidth: '140px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent-teal)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Totalvikt</span>
          <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 800 }}>Viktat Värde</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Anspråkets tyngd</span>
        </div>

      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Denna multiplikativa modell säkerställer att ett påstående får högt genomslag i partiprofilerna endast om det föreslås på högsta politiska nivå (t.ex. lagstiftning/proposition), har partiledningens stöd (hög partibäring), är väl underbyggt av evidens samt har kvalitetssäkrats och kalibrerats av våra analytiker.
      </p>
    </div>
  );
}

function parseMarkdown(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  
  // Create an initial section in case we have text before any ## heading
  let currentSection: Section = { title: 'Introduktion', id: 'introduktion', elements: [] };
  
  let listItems: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  let inList = false;
  let keyCounter = 0;

  const parseInline = (str: string): string => {
    let html = str;
    
    // Simple HTML escape for safety
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Apply bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Apply inline code
    html = html.replace(/`([^`]+)`/g, '<code class="trans-code" style="background: rgba(15, 23, 42, 0.04); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.85em; color: var(--accent-teal);">$1</code>');
    
    // Apply links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="trans-link" target="_blank" rel="noopener noreferrer" style="color: var(--accent-teal); text-decoration: none; border-bottom: 1px dashed var(--accent-teal); font-weight: 500;">$1</a>');
    
    return html;
  };

  const flushList = () => {
    if (listItems.length > 0) {
      const items = [...listItems];
      currentSection.elements.push(
        <ul key={`list-${keyCounter++}`} style={{ paddingLeft: '24px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item, idx) => (
            <li 
              key={idx} 
              style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }} 
              dangerouslySetInnerHTML={{ __html: parseInline(item) }} 
            />
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const rows = [...tableRows];
      const headers = rows[0];
      const dataRows = rows.slice(2); // Skip separator row at index 1
      
      currentSection.elements.push(
        <div key={`table-${keyCounter++}`} className="table-responsive p-3 mb-4" style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-main)' }}>
          <table className="gap-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="gap-table-th" style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rowIdx) => (
                <tr key={rowIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="gap-table-td" style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: parseInline(cell.trim()) }}>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 1. Skip Empty Lines
    if (line === '') {
      continue;
    }

    // 2. Detect and handle custom Math Block formula
    if (line.includes('$$\\text{Totalvikt}')) {
      flushList();
      flushTable();
      currentSection.elements.push(<FormulaCard key={`formula-${keyCounter++}`} />);
      // Fast forward until formula closes
      while (i < lines.length && !lines[i].includes('$$', 2) && lines[i].trim() !== '$$') {
        i++;
      }
      continue;
    }

    // 3. Detect and handle Tables
    if (line.startsWith('|')) {
      flushList();
      inTable = true;
      const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      tableRows.push(parts);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // 4. Detect and handle Bullet Lists
    if (line.startsWith('* ') || line.startsWith('- ')) {
      flushTable();
      inList = true;
      listItems.push(line.substring(2));
      continue;
    } else if (inList) {
      flushList();
    }

    // 5. Detect and handle Headers
    if (line.startsWith('## ')) {
      flushList();
      flushTable();
      // Store completed section
      if (currentSection.elements.length > 0) {
        sections.push(currentSection);
      }
      const title = line.substring(3).trim();
      const id = title.toLowerCase().replace(/[^a-z0-9\u00e0-\u00fc]+/g, '-');
      currentSection = { title, id, elements: [] };
      currentSection.elements.push(
        <h2 key={`h2-${keyCounter++}`} className="pb-2 mt-4" style={{ fontSize: '1.4rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '4px', height: '18px', background: 'var(--accent-teal)', borderRadius: '2px' }}></span>
          {title}
        </h2>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      flushTable();
      const title = line.substring(4).trim();
      currentSection.elements.push(
        <h3 key={`h3-${keyCounter++}`} className="mt-3 mb-2" style={{ fontSize: '1.1rem', color: 'var(--accent-teal)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
          {title}
        </h3>
      );
      continue;
    }

    if (line.startsWith('#### ')) {
      flushList();
      flushTable();
      const title = line.substring(5).trim();
      currentSection.elements.push(
        <h4 key={`h4-${keyCounter++}`} className="mt-3 mb-2" style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
          {title}
        </h4>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      flushList();
      flushTable();
      const title = line.substring(2).trim();
      currentSection.elements.push(
        <h1 key={`h1-${keyCounter++}`} className="pb-4 mb-4" style={{ fontSize: '2rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', borderBottom: '1px solid var(--border-color)', fontWeight: 800, letterSpacing: '-0.03em' }}>
          {title}
        </h1>
      );
      continue;
    }

    // 6. Detect and handle Horizontal Rules
    if (line === '---') {
      flushList();
      flushTable();
      currentSection.elements.push(<hr key={`hr-${keyCounter++}`} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />);
      continue;
    }

    // 7. Regular paragraph
    flushList();
    flushTable();
    currentSection.elements.push(
      <p 
        key={`p-${keyCounter++}`} 
        style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '14px' }} 
        dangerouslySetInnerHTML={{ __html: parseInline(line) }} 
      />
    );
  }

  // Flush remaining elements at EOF
  flushList();
  flushTable();
  if (currentSection.elements.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

// Helper to scrape text content from virtual React nodes for local text searching
function getElementText(el: React.ReactNode): string {
  if (!el) return '';
  if (typeof el === 'string' || typeof el === 'number') {
    return String(el);
  }
  if (Array.isArray(el)) {
    return el.map(getElementText).join(' ');
  }
  const reactEl = el as React.ReactElement<{ children?: React.ReactNode; dangerouslySetInnerHTML?: { __html: string } }>;
  if (reactEl && reactEl.props) {
    if (typeof reactEl.props.children === 'string') {
      return reactEl.props.children;
    }
    if (Array.isArray(reactEl.props.children)) {
      return reactEl.props.children.map((child: React.ReactNode) => {
        if (typeof child === 'string') return child;
        if (typeof child === 'object' && child !== null) return getElementText(child);
        return '';
      }).join(' ');
    }
    if (reactEl.props.dangerouslySetInnerHTML?.__html) {
      return reactEl.props.dangerouslySetInnerHTML.__html.replace(/<[^>]*>/g, '');
    }
    if (typeof reactEl.props.children === 'object' && reactEl.props.children !== null) {
      return getElementText(reactEl.props.children);
    }
  }
  return '';
}
