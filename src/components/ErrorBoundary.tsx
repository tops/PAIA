import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#faf9f6', color: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h1 style={{ color: '#ef4444', fontSize: '1.8rem', margin: 0 }}>Ett fel uppstod i Politisk AI-analys</h1>
          <p style={{ fontSize: '1rem', color: '#475569' }}>
            Systemet stötte på ett oväntat fel under renderingen. Kopiera felrapporten nedan för att underlätta felsökning.
          </p>
          <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '20px', borderRadius: '12px', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '400px', fontSize: '0.85rem' }}>
            <strong>Felmeddelande:</strong>
            <br />
            {this.state.error && this.state.error.toString()}
            <br /><br />
            <strong>Komponentstack:</strong>
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </div>
          <button 
            onClick={() => {
              window.localStorage.clear();
              window.location.reload();
            }}
            style={{ padding: '12px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-start' }}
          >
            Återställ systemet (Rensa lokalt data & ladda om)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
