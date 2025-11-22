import { Component, ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('UI error boundary caught an exception', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
          <div className="bg-white p-8 rounded-lg shadow max-w-lg">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">{this.state.message || 'An unexpected error occurred. Our recovery procedures were triggered automatically.'}</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-primary-600 text-white px-4 py-2 rounded"
              >
                Reload Application
              </button>
              <button
                onClick={this.handleReset}
                className="border border-gray-300 px-4 py-2 rounded"
              >
                Retry Session
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
