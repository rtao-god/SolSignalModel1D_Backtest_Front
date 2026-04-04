import React from 'react'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { markErrorHandledByBoundary } from '@/shared/lib/logging/setupGlobalErrorHandlers'
import { logError } from '@/shared/lib/logging/logError'
import { PageLocalIssuesContext } from '../../PageLocalIssues'

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
    static contextType = PageLocalIssuesContext
    declare context: React.ContextType<typeof PageLocalIssuesContext>

    state: SectionErrorBoundaryState = {
        hasError: false,
        error: null
    }
    private readonly issueId = `section-error-boundary:${Math.random().toString(36).slice(2)}`
    private reportIssueTimerId: number | null = null

    static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
        markErrorHandledByBoundary(error)
        return {
            hasError: true,
            error
        }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        markErrorHandledByBoundary(error)
        const safeError = normalizeErrorLike(error, 'Unknown client error.', {
            source: 'section-error-boundary',
            domain: 'ui_section',
            owner: 'section-error-boundary',
            expected: 'React boundary should receive an Error instance from the failed section render.',
            requiredAction: 'Inspect the failed section render path and throw owner-specific Error instances.'
        })

        logError(safeError, info, {
            source: 'section-error-boundary',
            domain: 'ui_section',
            extra: { sectionName: this.props.name }
        })

        this.schedulePageIssueReport(safeError)
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
        this.clearPendingIssueReport()
        this.context?.clearIssue(this.issueId)
        this.setState({
            hasError: false,
            error: null
        })
    }

    componentWillUnmount(): void {
        this.clearPendingIssueReport()
        this.context?.clearIssue(this.issueId)
    }

    private schedulePageIssueReport(error: Error) {
        this.clearPendingIssueReport()
        this.reportIssueTimerId = window.setTimeout(() => {
            this.reportIssueTimerId = null
            this.context?.upsertIssue({
                id: this.issueId,
                title: this.props.name ? `Ошибка блока: ${this.props.name}` : 'Ошибка одного из блоков страницы',
                description:
                    error.message ||
                    'Локальный блок страницы завершился с ошибкой и был снят с рендера. Остальная страница продолжает работать.'
            })
        }, 0)
    }

    private clearPendingIssueReport() {
        if (this.reportIssueTimerId !== null) {
            window.clearTimeout(this.reportIssueTimerId)
            this.reportIssueTimerId = null
        }
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

        return null
    }
}
