import React from 'react'
import { ErrorBlock } from '../../ErrorBlock/ui/ErrorBlock'
import i18n from '@/shared/configs/i18n/i18n'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { markErrorHandledByBoundary } from '@/shared/lib/logging/setupGlobalErrorHandlers'
import { buildDetailedErrorDetails, logError } from '@/shared/lib/logging/logError'

interface SectionErrorBoundaryProps {
    name?: string
    fallback?: React.ReactNode | ((args: { error: Error; reset: () => void; name?: string }) => React.ReactNode)
    children: React.ReactNode
    resetKeys?: unknown[]
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
        markErrorHandledByBoundary(error)
        return {
            hasError: true,
            error
        }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        markErrorHandledByBoundary(error)
        logError(error, info, {
            source: 'section-error-boundary',
            domain: 'ui_section',
            extra: { sectionName: this.props.name }
        })
    }

    componentDidUpdate(prevProps: SectionErrorBoundaryProps): void {
        const { resetKeys } = this.props
        if (!this.state.hasError || !resetKeys) {
            return
        }

        const prevResetKeys = prevProps.resetKeys
        if (!prevResetKeys || prevResetKeys.length !== resetKeys.length) {
            this.reset()
            return
        }

        const changed = resetKeys.some((key, index) => !Object.is(key, prevResetKeys[index]))
        if (changed) {
            this.reset()
        }
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

        const safeError = normalizeErrorLike(error, 'Unknown client error.', {
            source: 'section-error-boundary',
            domain: 'ui_section',
            owner: 'section-error-boundary',
            expected: 'React boundary should receive an Error instance from the failed section render.',
            requiredAction: 'Inspect the failed section render path and throw owner-specific Error instances.'
        })

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
                details={buildDetailedErrorDetails(safeError, {
                    source: 'section-error-boundary',
                    domain: 'ui_section',
                    extra: { sectionName: name }
                })}
                onRetry={this.reset}
            />
        )
    }
}
