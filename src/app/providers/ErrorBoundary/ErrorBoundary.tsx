import { Btn } from '@/shared/ui'
import { Component, ErrorInfo, ReactNode } from 'react'

export interface ErrorBoundaryFallbackProps {
    error: Error | null
    resetErrorBoundary: () => void
}

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
    fallbackRender?: (props: ErrorBoundaryFallbackProps) => ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
    onReset?: () => void
    resetKeys?: unknown[]
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
        error: null
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.props.onError?.(error, errorInfo)
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        const { resetKeys } = this.props
        if (!this.state.hasError || !resetKeys) {
            return
        }

        const prevResetKeys = prevProps.resetKeys
        if (!prevResetKeys || prevResetKeys.length !== resetKeys.length) {
            this.reset()
            this.props.onReset?.()
            return
        }
        const changed = resetKeys.some((key, index) => !Object.is(key, prevResetKeys[index]))

        if (changed) {
            this.reset()
            this.props.onReset?.()
        }
    }
    reset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children
        }

        const { fallback, fallbackRender } = this.props

        const fallbackProps: ErrorBoundaryFallbackProps = {
            error: this.state.error,
            resetErrorBoundary: this.reset
        }
        if (fallbackRender) {
            return fallbackRender(fallbackProps)
        }
        if (fallback) {
            return fallback
        }
        return (
            <div style={{ padding: 16 }}>
                <h2>Что-то пошло не так.</h2>
                {this.state.error && <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>}
                <Btn onClick={this.reset}>Попробовать ещё раз</Btn>
            </div>
        )
    }
}
