import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { AppErrorCode, AppErrorDescriptor } from '@/shared/consts/errorMessages'
import { getErrorDescriptor } from '@/shared/consts/errorMessages'

export interface ResolvedAppError extends AppErrorDescriptor {
    rawMessage?: string
}

export function resolveAppError(error: unknown): ResolvedAppError {
    let code: AppErrorCode | null = null
    let rawMessage: string | undefined
    const maybeFetchError = error as FetchBaseQueryError

    if (maybeFetchError && typeof maybeFetchError === 'object' && 'status' in maybeFetchError) {
        const status = maybeFetchError.status

        if (typeof status === 'number') {
            code = status

            const data: any = (maybeFetchError as any).data
            rawMessage = data?.message ?? data?.error ?? (data ? JSON.stringify(data) : undefined)
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

