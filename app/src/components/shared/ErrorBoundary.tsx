import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Label affiché dans le titre (ex: "Évaluation", "Synthèse") */
  section?: string
  /** Callback optionnel pour logger l'erreur */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary générique avec message en français.
 * Capture les erreurs de rendu React et affiche un fallback
 * au lieu de crasher toute l'application.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleExportDiagnostic = () => {
    const { error } = this.state
    const diagnostic = {
      timestamp: new Date().toISOString(),
      section: this.props.section ?? 'inconnue',
      error: error?.message ?? 'Erreur inconnue',
      stack: error?.stack ?? '',
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    const blob = new Blob([JSON.stringify(diagnostic, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mev-diagnostic-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const section = this.props.section ?? 'l\'application'

    return (
      <div className="flex items-center justify-center min-h-[400px] p-8" role="alert">
        <div className="bg-white border border-red-200 rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-600"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Erreur dans {section}
          </h2>

          {/* Message */}
          <p className="text-sm text-slate-600 mb-2">
            Une erreur inattendue s'est produite. Vos données sont sauvegardées automatiquement.
          </p>

          {/* Error detail */}
          {this.state.error && (
            <details className="mb-5 text-left">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
                Détails techniques
              </summary>
              <pre className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-red-700 overflow-auto max-h-32 whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
            >
              Réessayer
            </button>
            <button
              onClick={this.handleExportDiagnostic}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors active:scale-95"
            >
              Exporter le diagnostic
            </button>
          </div>

          {/* Tip */}
          <p className="text-[11px] text-slate-400 mt-4">
            Si le problème persiste, exportez le diagnostic et contactez le support.
          </p>
        </div>
      </div>
    )
  }
}
