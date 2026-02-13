import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { AppErrorCode, AppErrorDescriptor } from '@/shared/consts/errorMessages'
import { getErrorDescriptor } from '@/shared/consts/errorMessages'

export interface ResolvedAppError extends AppErrorDescriptor {
    rawMessage?: string
}

function tryStringify(value: unknown): string | null {
    try {
        const serialized = JSON.stringify(value)
        return serialized ?? null
    } catch {
        return null
    }
}

function buildHttpErrorRawMessage(status: number, data: unknown): string | undefined {
    if (data === null || typeof data === 'undefined') {
        return `HTTP ${status}`
    }

    if (typeof data === 'string') {
        return `HTTP ${status} | ${data}`
    }

    if (typeof data !== 'object') {
        return `HTTP ${status} | ${String(data)}`
    }

    const payload = data as {
        error?: unknown
        message?: unknown
        context?: unknown
    }

    const message = typeof payload.message === 'string' ? payload.message : undefined
    const error = typeof payload.error === 'string' ? payload.error : undefined
    const context = typeof payload.context !== 'undefined' ? tryStringify(payload.context) : null

    const parts: string[] = [`HTTP ${status}`]
    if (error) {
        parts.push(`error=${error}`)
    }
    if (message) {
        parts.push(`message=${message}`)
    }
    if (context) {
        parts.push(`context=${context}`)
    }

    if (parts.length > 1) {
        return parts.join(' | ')
    }

    const serialized = tryStringify(data)
    return serialized ? `HTTP ${status} | payload=${serialized}` : `HTTP ${status}`
}

export function resolveAppError(error: unknown): ResolvedAppError {
    let code: AppErrorCode | null = null
    let rawMessage: string | undefined
    const maybeFetchError = error as FetchBaseQueryError

    if (maybeFetchError && typeof maybeFetchError === 'object' && 'status' in maybeFetchError) {
        const status = maybeFetchError.status

        if (typeof status === 'number') {
            code = status

            const data = (maybeFetchError as { data?: unknown }).data
            rawMessage = buildHttpErrorRawMessage(status, data)
        } else if (typeof status === 'string') {
            switch (status) {
                case 'FETCH_ERROR':
                    code = 'NETWORK'
                    break
                case 'PARSING_ERROR':
                    code = 'PARSING'
                    break
                case 'TIMEOUT_ERROR':
                    code = 'TIMEOUT'
                    break
                default:
                    code = 'UNKNOWN'
                    break
            }

            rawMessage =
                (maybeFetchError as any).error ??
                (typeof (maybeFetchError as any).data === 'string' ? (maybeFetchError as any).data : undefined)
        }
    }
    if (!code) {
        const maybeSerialized = error as SerializedError
        if (maybeSerialized && typeof maybeSerialized === 'object' && 'message' in maybeSerialized) {
            rawMessage = maybeSerialized.message ?? rawMessage
        }
    }
    if (!code && error instanceof Error) {
        rawMessage = error.message
    }

    const base: AppErrorDescriptor = getErrorDescriptor(code)
    return {
        ...base,
        rawMessage
    }
}

