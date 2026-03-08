import React from 'react'
import { ErrorBlock } from '../../ErrorBlock/ui/ErrorBlock'
import i18n from '@/shared/configs/i18n/i18n'

interface SectionErrorBoundaryProps {
    name?: string
    fallback?: React.ReactNode | ((args: { error: Error; reset: () => void; name?: string }) => React.ReactNode)
    children: React.ReactNode
}

interface SectionErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class SectionErrorBoundary extends React.Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
    state: SectionErrorBoundaryState = {
        hasError: false,
        error: null
    }

    static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
        return {
            hasError: true,
            error
        }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        // eslint-disable-next-line no-console
        console.error('[SectionErrorBoundary]', this.props.name, error, info)
    }

    private reset = () => {
        this.setState({
            hasError: false,
            error: null
        })
    }

    render(): React.ReactNode {
        const { hasError, error } = this.state
        const { fallback, children, name } = this.props

        if (!hasError) {
            return children
        }

        const safeError = error ?? new Error('Unknown client error')

        if (typeof fallback === 'function') {
            return fallback({ error: safeError, reset: this.reset, name })
        }

        if (fallback) {
            return fallback
        }

        return (
            <ErrorBlock
                code='CLIENT'
                title={i18n.t('errors:ui.sectionErrorBoundary.title', {
                    defaultValue: 'Section render error'
                })}
                description={i18n.t('errors:ui.sectionErrorBoundary.description', {
                    defaultValue:
                        'This block is temporarily unavailable due to a client-side error. The rest of the page remains available.'
                })}
                details={safeError.message}
                onRetry={this.reset}
            />
        )
    }
}
