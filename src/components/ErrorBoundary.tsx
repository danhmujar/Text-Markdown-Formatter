import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          id="root-error-boundary-container"
          role="alert"
          aria-live="assertive"
          className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950 text-slate-100 font-sans"
        >
          <div className="max-w-md w-full p-6 rounded-xl border border-slate-800 bg-slate-900 shadow-xl space-y-4 text-center">
            <div aria-hidden="true" className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h1 className="text-lg font-semibold text-slate-100">Something went wrong</h1>
            <p className="text-xs text-slate-400 leading-relaxed font-mono bg-slate-950/70 p-3 rounded border border-slate-800 break-all text-left">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                id="error-boundary-retry-btn"
                type="button"
                onClick={this.handleRetry}
                aria-label="Try recovering from this error"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium shadow-sm transition active:scale-95 cursor-pointer"
              >
                Try Again
              </button>
              <button
                id="error-boundary-reload-btn"
                type="button"
                onClick={() => window.location.reload()}
                aria-label="Reload application page"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium border border-slate-700 transition active:scale-95 cursor-pointer"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
