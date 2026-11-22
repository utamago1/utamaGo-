import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Handled gracefully via fallback UI without crashing WebView
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-surface p-6 text-on-surface pt-safe pb-safe pl-safe pr-safe">
          <div className="w-full max-w-md rounded-3xl border border-outline-variant bg-surface-container-low p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="mt-4 font-display text-xl font-extrabold text-on-surface">
              Terjadi Gangguan Tampilan
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
              Data belajarmu tetap tersimpan aman di perangkat. Muat ulang
              aplikasi untuk melanjutkan belajar.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="m3-tactile mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Muat Ulang UtamaGo!</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
