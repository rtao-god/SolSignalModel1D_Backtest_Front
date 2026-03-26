import type { ErrorInfo } from 'react'
import { resolveErrorDomain, type ErrorDomain } from './errorDomains'

export interface LogErrorContext {
    source?: string
    path?: string
    errorId?: string
    domain?: ErrorDomain
    severity?: 'error' | 'warning'
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
        extra: context?.extra
    }
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
