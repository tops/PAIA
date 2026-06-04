import React, { useState, useEffect } from 'react';
import { getFeedback, deleteFeedback, toggleFeedbackResolved } from '../utils/feedbackService';
import type { Feedback } from '../types';
import { CheckCircle, AlertCircle, Trash2, Check, RefreshCw, Layers } from 'lucide-react';

export const FeedbackAdminView: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeedback();
      // Sort by date descending
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeedbacks(data);
    } catch (err: any) {
      setError(err.message || 'Kunde inte hämta feedback-listan från databasen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleToggleResolve = async (id: string, currentStatus: boolean) => {
    try {
      await toggleFeedbackResolved(id, currentStatus);
      // Optimistic UI update
      setFeedbacks(prev => prev.map(item => 
        item.id === id ? { ...item, resolved: !currentStatus } : item
      ));
    } catch (err: any) {
      alert('Kunde inte uppdatera status: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFeedback(id);
      setFeedbacks(prev => prev.filter(item => item.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert('Kunde inte ta bort feedback: ' + err.message);
    }
  };

  // Compute metrics
  const totalCount = feedbacks.length;
  const resolvedCount = feedbacks.filter(f => f.resolved).length;
  const unresolvedCount = totalCount - resolvedCount;

  const categoryCounts = feedbacks.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter(item => {
    const statusMatch = 
      filterStatus === 'all' || 
      (filterStatus === 'resolved' && item.resolved) ||
      (filterStatus === 'unresolved' && !item.resolved);
      
    const categoryMatch = 
      filterCategory === 'all' || 
      item.category === filterCategory;

    return statusMatch && categoryMatch;
  });

  return (
    <div className="animate-slide flex flex-col gap-8">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <span className="badge badge-purple" style={{ alignSelf: 'flex-start' }}>Administration</span>
          <h1 className="page-title">Feedback Dashboard</h1>
          <p className="page-subtitle">
            Här visas alla synpunkter och rapporter som användare har skickat in via systemet till Google Cloud Firestore.
          </p>
        </div>
        <button 
          onClick={fetchFeedbacks}
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Uppdatera listan
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="stats-row">
        <div className="glass-panel stats-card">
          <div className="stats-card-icon" style={{ background: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-purple)' }}>
            <Layers size={22} />
          </div>
          <div>
            <div className="stats-card-value">{totalCount}</div>
            <div className="stats-card-label">Totalt inskickat</div>
          </div>
        </div>

        <div className="glass-panel stats-card">
          <div className="stats-card-icon" style={{ background: 'rgba(255, 69, 36, 0.08)', color: 'var(--accent-coral)' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="stats-card-value">{unresolvedCount}</div>
            <div className="stats-card-label">Ej åtgärdade</div>
          </div>
        </div>

        <div className="glass-panel stats-card">
          <div className="stats-card-icon" style={{ background: 'rgba(0, 230, 207, 0.08)', color: 'var(--accent-teal)' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="stats-card-value">{resolvedCount}</div>
            <div className="stats-card-label">Åtgärdade</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="glass-panel p-6" style={{ background: 'var(--bg-card)' }}>
        <h3 className="form-section-title" style={{ marginBottom: '16px' }}>Filtrera och sortera feedback</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Åtgärdsstatus</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="form-control"
            >
              <option value="all">Alla ärenden ({totalCount})</option>
              <option value="unresolved">Ej åtgärdade ({unresolvedCount})</option>
              <option value="resolved">Åtgärdade ({resolvedCount})</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Kategori</label>
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="form-control"
            >
              <option value="all">Alla kategorier</option>
              <option value="Förbättringsförslag">Förbättringsförslag ({categoryCounts['Förbättringsförslag'] || 0})</option>
              <option value="Felaktig data">Felaktig data ({categoryCounts['Felaktig data'] || 0})</option>
              <option value="Allmän feedback">Allmän feedback ({categoryCounts['Allmän feedback'] || 0})</option>
              <option value="Annat">Annat ({categoryCounts['Annat'] || 0})</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Table / List */}
      <div className="glass-panel p-4" style={{ overflow: 'hidden' }}>
        {loading && feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw size={24} className="animate-spin text-purple-400 mb-4" />
            <p style={{ color: 'var(--text-secondary)' }}>Hämtar feedback från Google Cloud Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center" style={{ color: 'var(--accent-coral)' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600 }}>Ett fel uppstod</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{error}</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
            Inga feedback-ärenden matchade dina valda filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="gap-table">
              <thead>
                <tr>
                  <th className="gap-table-th" style={{ width: '120px' }}>Datum</th>
                  <th className="gap-table-th" style={{ width: '180px' }}>Avsändare</th>
                  <th className="gap-table-th" style={{ width: '140px' }}>Sida</th>
                  <th className="gap-table-th" style={{ width: '140px' }}>Kategori</th>
                  <th className="gap-table-th">Meddelande</th>
                  <th className="gap-table-th" style={{ width: '120px', textAlign: 'center' }}>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.map((item) => {
                  const dateStr = new Date(item.timestamp).toLocaleString('sv-SE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  // Select category badge class
                  let badgeClass = 'badge-gray';
                  if (item.category === 'Förbättringsförslag') badgeClass = 'badge-purple';
                  if (item.category === 'Felaktig data') badgeClass = 'badge-coral';
                  if (item.category === 'Allmän feedback') badgeClass = 'badge-teal';

                  return (
                    <tr 
                      key={item.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        opacity: item.resolved ? 0.65 : 1,
                        background: item.resolved ? 'rgba(15, 23, 42, 0.01)' : 'transparent',
                        transition: 'opacity 0.2s ease'
                      }}
                    >
                      <td className="gap-table-td" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </td>
                      <td className="gap-table-td" style={{ fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.name || <em style={{ color: 'var(--text-muted)' }}>Anonym</em>}
                        </div>
                        {item.email && (
                          <a 
                            href={`mailto:${item.email}`}
                            style={{ fontSize: '0.75rem', color: 'var(--accent-teal)', textDecoration: 'none' }}
                          >
                            {item.email}
                          </a>
                        )}
                      </td>
                      <td className="gap-table-td" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {item.page}
                      </td>
                      <td className="gap-table-td">
                        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.65rem' }}>
                          {item.category}
                        </span>
                      </td>
                      <td className="gap-table-td" style={{ fontSize: '0.88rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                        {item.message}
                      </td>
                      <td className="gap-table-td" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {/* Toggle Resolved Button */}
                          <button
                            onClick={() => handleToggleResolve(item.id, item.resolved)}
                            title={item.resolved ? 'Markera som oåtgärdad' : 'Markera som åtgärdad'}
                            className={`btn ${item.resolved ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ 
                              padding: '8px', 
                              borderRadius: '8px', 
                              backgroundColor: item.resolved ? 'var(--accent-teal)' : 'transparent',
                              color: item.resolved ? '#fff' : 'var(--text-secondary)',
                              minHeight: 'auto',
                              width: '32px',
                              height: '32px'
                            }}
                          >
                            <Check size={16} />
                          </button>

                          {/* Delete/Trash Button */}
                          {confirmDeleteId === item.id ? (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="btn btn-danger"
                              style={{ 
                                padding: '6px 10px', 
                                borderRadius: '8px', 
                                fontSize: '0.7rem',
                                minHeight: 'auto',
                                height: '32px'
                              }}
                            >
                              Säker?
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              title="Ta bort feedback"
                              className="btn btn-secondary"
                              style={{ 
                                padding: '8px', 
                                borderRadius: '8px', 
                                color: 'var(--accent-coral)',
                                borderColor: 'rgba(255, 69, 36, 0.1)',
                                minHeight: 'auto',
                                width: '32px',
                                height: '32px'
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                          
                          {confirmDeleteId === item.id && (
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              className="btn btn-secondary"
                              style={{ 
                                padding: '6px 8px', 
                                borderRadius: '8px', 
                                fontSize: '0.7rem',
                                minHeight: 'auto',
                                height: '32px'
                              }}
                            >
                              Avbryt
                            </button>
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
    </div>
  );
};
