import type { ErrorInfo } from 'react'
import { resolveErrorDomain, type ErrorDomain } from './errorDomains'

export interface LogErrorContext {
    source?: string
    path?: string
    errorId?: string
    domain?: ErrorDomain
    severity?: 'error' | 'warning'
    owner?: string
    expected?: string
    actual?: string
    requiredAction?: string
    extra?: Record<string, unknown>
}

export interface LogErrorPayload {
    name: string
    message: string
    stack: string | undefined
    componentStack: string | undefined
    source: string | undefined
    path: string | undefined
    domain: ErrorDomain
    severity: 'error' | 'warning'
    owner: string | undefined
    expected: string | undefined
    actual: string | undefined
    requiredAction: string | undefined
    extra: Record<string, unknown> | undefined
}

/**
 * Строит единый payload для всех runtime и boundary ошибок.
 * Этот слой отделяет домен ошибки от места, где именно она была поймана.
 */
export function buildLogErrorPayload(error: Error, errorInfo?: ErrorInfo, context?: LogErrorContext): LogErrorPayload {
    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack ?? undefined,
        source: context?.source,
        path: context?.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
        domain: resolveErrorDomain(error, context),
        severity: context?.severity ?? 'error',
        owner: context?.owner,
        expected: context?.expected,
        actual: context?.actual,
        requiredAction: context?.requiredAction,
        extra: context?.extra
    }
}

export function buildDetailedErrorDetails(error: Error, context?: LogErrorContext): string {
    const parts: string[] = [`${error.name}: ${error.message}`]

    if (context?.owner) parts.push(`owner=${context.owner}`)
    if (context?.expected) parts.push(`expected=${context.expected}`)
    if (context?.actual) parts.push(`actual=${context.actual}`)
    if (context?.requiredAction) parts.push(`requiredAction=${context.requiredAction}`)
    if (context?.source) parts.push(`source=${context.source}`)
    if (context?.path) parts.push(`path=${context.path}`)
    if (context?.domain) parts.push(`domain=${context.domain}`)
    if (context?.errorId) parts.push(`errorId=${context.errorId}`)

    if (context?.extra) {
        try {
            parts.push(`extra=${JSON.stringify(context.extra)}`)
        } catch {
            parts.push('extra=[unserializable]')
        }
    }

    if (error.stack) {
        parts.push(`stack=${error.stack}`)
    }

    return parts.join('\n')
}

export function logError(error: Error, errorInfo?: ErrorInfo, context?: LogErrorContext) {
    const payload = buildLogErrorPayload(error, errorInfo, context)
    const prefix = payload.severity === 'warning' ? `[UI Warning][${payload.domain}]` : `[UI Error][${payload.domain}]`

    if (payload.severity === 'warning') {
        if (process.env.NODE_ENV === 'development') {
            console.warn(prefix, payload)
            return
        }

        console.warn(`${prefix}[prod]`, payload)
        return
    }

    if (process.env.NODE_ENV === 'development') {
        console.error(prefix, payload)
        return
    }

    console.error(`${prefix}[prod]`, payload)
}
