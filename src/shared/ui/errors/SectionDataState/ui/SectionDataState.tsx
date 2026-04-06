import { useEffect, useMemo, type ReactNode } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { buildDetailedErrorDetails, logError, type LogErrorContext } from '@/shared/lib/logging/logError'
import { ErrorBlock } from '../../ErrorBlock/ui/ErrorBlock'
import { Loader, Text } from '@/shared/ui'
import cls from './SectionDataState.module.scss'

export interface SectionDataStateProps {
    className?: string
    isLoading?: boolean
    isError?: boolean
    error?: unknown
    hasData: boolean
    onRetry?: () => void
    title: string
    description?: string
    loadingText?: string
    compact?: boolean
    logContext?: LogErrorContext
    children: ReactNode
}

function normalizeError(error: unknown): Error | null {
    if (!error) {
        return null
    }

    return normalizeErrorLike(error, 'Unknown section data error.', {
        source: 'section-data-state',
        domain: 'ui_section',
        owner: 'section-data-state',
        expected: 'Section data boundary should receive an Error or API envelope with owner context.',
        requiredAction: 'Inspect the upstream query, loader, or memo wrapper that passed a non-Error failure.'
    })
}

function formatErrorDetails(error: unknown): string | null {
    if (!error) {
        return null
    }

    if (typeof error === 'string') {
        return buildDetailedErrorDetails(normalizeErrorLike(error, 'Unknown section data error.', {
            source: 'section-data-state',
            domain: 'ui_section',
            owner: 'section-data-state',
            expected: 'Section data boundary should receive an Error or API envelope with owner context.',
            requiredAction: 'Inspect the upstream query, loader, or memo wrapper that passed a string failure.'
        }))
    }

    if (error instanceof Error) {
        return buildDetailedErrorDetails(error)
    }

    return buildDetailedErrorDetails(normalizeErrorLike(error, 'Unknown section data error.', {
        source: 'section-data-state',
        domain: 'ui_section',
        owner: 'section-data-state',
        expected: 'Section data boundary should receive an Error or API envelope with owner context.',
        requiredAction: 'Inspect the upstream query, loader, or memo wrapper that passed a non-serializable failure.'
    }))
}

function buildLogKey(error: Error, context?: LogErrorContext): string {
    const source = context?.source ?? 'section-data-state'
    const path = context?.path ?? ''
    const extra = context?.extra ? JSON.stringify(context.extra) : ''
    return `${source}|${path}|${error.name}|${error.message}|${extra}`
}

const sectionDataStateGlobal = globalThis as typeof globalThis & {
    __sectionDataStateLoggedKeys?: Set<string>
}

const loggedSectionErrorKeys =
    sectionDataStateGlobal.__sectionDataStateLoggedKeys ??
    (sectionDataStateGlobal.__sectionDataStateLoggedKeys = new Set<string>())

/**
 * Секционный data-state для async/query/validation блоков внутри уже смонтированной страницы.
 * Root shell страницы остаётся снаружи, а этот компонент управляет только локальным loading/error UI.
 */
export default function SectionDataState({
    className,
    isLoading,
    isError,
    error,
    hasData,
    onRetry,
    title,
    description,
    loadingText,
    compact = true,
    logContext,
    children
}: SectionDataStateProps) {
    const normalizedError = useMemo(() => normalizeError(error), [error])
    const hasVisibleError = Boolean(isError || normalizedError)

    useEffect(() => {
        if (!normalizedError) {
            return
        }

        const nextLogKey = buildLogKey(normalizedError, logContext)
        if (loggedSectionErrorKeys.has(nextLogKey)) {
            return
        }

        loggedSectionErrorKeys.add(nextLogKey)
        logError(normalizedError, undefined, {
            ...logContext,
            domain: logContext?.domain ?? 'ui_section',
            severity: 'warning'
        })
    }, [logContext, normalizedError])

    // Ошибка должна оставаться видимой даже при наличии кэшированных данных или фонового refetch.
    // Иначе пользователь получает "успешный" блок при реально упавшем API и не видит причину деградации.
    const shouldShowLoading = Boolean(isLoading) && !hasVisibleError && !hasData

    if (shouldShowLoading) {
        return (
            <div className={classNames(cls.SectionDataState, {}, [className ?? ''])}>
                <div className={cls.loadingState}>
                    <Loader />
                    {loadingText && <Text className={cls.loadingText}>{loadingText}</Text>}
                </div>
            </div>
        )
    }

    if (hasVisibleError && hasData) {
        return (
            <div className={classNames(cls.SectionDataState, {}, [className ?? ''])}>
                <div className={cls.errorStateWithContent}>
                    <ErrorBlock
                        title={title}
                        description={description}
                        details={formatErrorDetails(normalizedError ?? error)}
                        onRetry={onRetry}
                        compact={compact}
                    />
                    <div className={cls.content}>{children}</div>
                </div>
            </div>
        )
    }

    if (hasVisibleError || !hasData) {
        return (
            <div className={classNames(cls.SectionDataState, {}, [className ?? ''])}>
                <ErrorBlock
                    title={title}
                    description={description}
                    details={formatErrorDetails(normalizedError ?? error)}
                    onRetry={onRetry}
                    compact={compact}
                />
            </div>
        )
    }

    return <>{children}</>
}
