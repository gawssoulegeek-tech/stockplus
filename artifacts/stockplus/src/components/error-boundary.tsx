'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary pour éviter les pages blanches.
 * Affiche un message d'erreur friendly avec bouton de rechargement.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Une erreur est survenue</h2>
              <p className="text-gray-500 text-sm">
                La page n'a pas pu se charger correctement. Cela peut être dû à une donnée manquante
                ou un problème temporaire.
              </p>
            </div>
            {this.state.error && (
              <details className="text-left bg-gray-50 rounded-2xl p-4 text-xs">
                <summary className="font-bold text-gray-700 cursor-pointer">Détails techniques</summary>
                <pre className="mt-2 whitespace-pre-wrap text-red-600">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button
              onClick={this.handleReload}
              className="h-12 px-8 rounded-2xl sena-gradient text-white font-bold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recharger la page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
