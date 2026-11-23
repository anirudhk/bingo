import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../../utils/logger';
import { reportError } from '../../utils/errorReporter';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * App-root error boundary. React error boundaries can only be class components.
 *
 * Strategy: catch any render-time exception, log it (so production users still
 * surface the stack via console.error), and offer the user a single "Reload"
 * button. We do NOT try to recover in-place — the store / route may be in an
 * arbitrary state, so a hard reload is both simpler and more reliable.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('App error boundary caught:', error, info.componentStack);
    reportError(error, 'react', { componentStack: info.componentStack ?? undefined });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 safe-pad"
      >
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm text-center">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Something broke.</h2>
          <p className="text-sm text-gray-600 mb-4">
            The app hit an unexpected error and needs to reload. Your saved progress is safe.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-[11px] text-left bg-gray-100 rounded p-2 mb-4 overflow-auto max-h-40 allow-select">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
