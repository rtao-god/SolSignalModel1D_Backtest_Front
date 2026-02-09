import type { ErrorInfo } from 'react'

export interface LogErrorContext {
    source?: string
    path?: string
    errorId?: string
    extra?: Record<string, unknown>
}

export function logError(error: Error, errorInfo?: ErrorInfo, context?: LogErrorContext) {
    const payload = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        source: context?.source,
        path: context?.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
        extra: context?.extra
    }

    if (process.env.NODE_ENV === 'development') {
        console.error('[UI Error]', payload)
        return
    }


    console.error('[UI Error][prod]', payload)
}

