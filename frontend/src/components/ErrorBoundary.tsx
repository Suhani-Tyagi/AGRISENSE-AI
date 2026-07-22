import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-terracotta-50 dark:bg-terracotta-900/10 border border-terracotta-200 dark:border-terracotta-900/40 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-terracotta-500 mx-auto animate-pulse" />
          <h3 className="text-sm font-bold text-earth-900 dark:text-forest-100">
            {this.props.fallbackTitle || "Card Load Error"}
          </h3>
          <p className="text-xs text-earth-500 dark:text-forest-400 max-w-xs mx-auto">
            This farming panel encountered a rendering error. Other features remain fully operational.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs font-bold text-forest-600 dark:text-forest-400 hover:underline focus:outline-none"
          >
            Reset Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
