import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Check } from 'lucide-react';
import { submitFeedback } from '../utils/feedbackService';
import type { Feedback } from '../types';

interface FeedbackModalProps {
  activeTab: string;
}

const tabNameMap: Record<string, string> = {
  dashboard: 'Översikt & Analys',
  kompassen: 'AI-kompassen',
  profiler: 'Parti för parti',
  databas: 'Alla ställningstaganden',
  metod: 'Så fungerar det',
  admin: 'Adminpanel'
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ activeTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<Feedback['category']>('Förbättringsförslag');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on ESC keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('Vänligen fyll i meddelandefältet.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const pageName = tabNameMap[activeTab] || activeTab;
      await submitFeedback({
        name,
        email,
        category,
        message,
        page: pageName
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod när feedbacken skickades.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="feedback-fab"
        title="Skicka feedback"
        aria-label="Skicka feedback"
      >
        <MessageSquare size={20} />
        <span>Tyck till!</span>
      </button>

      {/* Glassmorphic Modal Backdrop */}
      {isOpen && (
        <div 
          className="feedback-modal-backdrop"
          onClick={() => !isSubmitting && setIsOpen(false)}
        >
          {/* Modal Container */}
          <div 
            className="feedback-modal-content glass-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="feedback-modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Skicka feedback</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Hjälp oss att göra sidan bättre. Vi läser allt som kommer in och försöker återkoppla om vi hinner.
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="feedback-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content / Form */}
            <div className="feedback-modal-body">
              {success ? (
                <div className="feedback-modal-success flex flex-col items-center justify-center text-center p-8 gap-4">
                  <div className="success-icon-badge">
                    <Check size={32} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-teal)' }}>Tack för dina synpunkter!</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      Vi läser allt som kommer in och försöker återkoppla till dig om vi hinner.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <div style={{ padding: '10px 14px', background: 'rgba(255, 69, 36, 0.08)', border: '1px solid var(--accent-coral)', borderRadius: '10px', color: 'var(--accent-coral)', fontSize: '0.8rem' }}>
                      {error}
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Namn (valfritt)</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="form-control" 
                      placeholder="Ditt namn"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>E-post (valfritt)</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="form-control" 
                      placeholder="din.epost@domän.se"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Kategori</label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value as Feedback['category'])} 
                      className="form-control"
                    >
                      <option value="Förbättringsförslag">Förbättringsförslag</option>
                      <option value="Felaktig data">Felaktig data (Rapportera fel)</option>
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
                      placeholder="Vad kan vi göra bättre? Beskriv ditt förslag eller rapportera fel..."
                      rows={4}
                      required
                    />
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Skickas från: <strong>{tabNameMap[activeTab] || activeTab}</strong>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    {isSubmitting ? 'Skickar...' : 'Skicka feedback'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
