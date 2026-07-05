import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCw, AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    });
    window.location.reload();
  };

  private handleCopy = () => {
    const { error, errorInfo } = this.state;
    const errorReport = `
Error: ${error?.message || 'Unknown Error'}
Stack: ${error?.stack || 'No stack trace available'}
Component Stack: ${errorInfo?.componentStack || 'No component stack available'}
Browser: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorReport)
      .then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      })
      .catch(err => {
        console.error('Failed to copy error report:', err);
      });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-colors duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 overflow-hidden flex flex-col">
            
            {/* Header / Brand */}
            <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-100 dark:border-red-900/40 text-red-500 dark:text-red-400">
                <AlertTriangle className="h-10 w-10 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Application Error Caught
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  A rendering component crashed in the active route. We've captured the diagnostics and prevented the screen from going completely white.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2 justify-center">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-5 py-2.5 text-sm font-semibold shadow-md shadow-teal-900/10 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RotateCw className="h-4 w-4" />
                  Reload Application
                </button>
                <button
                  onClick={this.handleCopy}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 px-5 py-2.5 text-sm font-semibold transition-all duration-150"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Report Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Error Log
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message & Details accordion */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 sm:p-8 space-y-4 flex-1">
              <div className="bg-red-50/45 dark:bg-red-950/10 border border-red-100/60 dark:border-red-950/30 rounded-xl p-4">
                <span className="block text-[11px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest mb-1 font-mono">
                  Runtime Exception Message
                </span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono line-clamp-3">
                  {this.state.error?.message || 'Unknown javascript exception'}
                </p>
              </div>

              <div className="border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span>Detailed Call Stack</span>
                  {this.state.showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {this.state.showDetails && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-950 text-slate-300 font-mono text-[11px] overflow-auto max-h-64 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
                    <div>
                      <span className="text-red-400 font-bold block mb-1">Stack Trace:</span>
                      <pre className="whitespace-pre-wrap leading-relaxed">
                        {this.state.error?.stack || 'No call stack details'}
                      </pre>
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <div className="border-t border-slate-800 pt-3">
                        <span className="text-teal-400 font-bold block mb-1">Component Hierarchy:</span>
                        <pre className="whitespace-pre-wrap leading-relaxed text-slate-400">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">
                SPECS Organization Management System
              </span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
