import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { AppErrorCode, AppErrorDescriptor } from '@/shared/consts/errorMessages'
import { getErrorDescriptor } from '@/shared/consts/errorMessages'

export interface ResolvedAppError extends AppErrorDescriptor {
    // Сырой текст ошибки (для логов, dev-режима и продвинутых экранов).
    rawMessage?: string
}

/**
 * Нормализует ошибку RTK Query / fetch / обычный Error в единый объект ResolvedAppError.
 * Используется в UI-компонентах, чтобы не размазывать разбор ошибок по страницам.
 */
export function resolveAppError(error: unknown): ResolvedAppError {
    let code: AppErrorCode | null = null
    let rawMessage: string | undefined

    // Попытка трактовать ошибку как FetchBaseQueryError (RTK Query).
    const maybeFetchError = error as FetchBaseQueryError

    if (maybeFetchError && typeof maybeFetchError === 'object' && 'status' in maybeFetchError) {
        const status = maybeFetchError.status

        if (typeof status === 'number') {
            // Обычный HTTP-код: 400, 404, 500 и т.п.
            code = status

            const data: any = (maybeFetchError as any).data
            rawMessage = data?.message ?? data?.error ?? (data ? JSON.stringify(data) : undefined)
        } else if (typeof status === 'string') {
            // Строковые статусы RTK Query: 'FETCH_ERROR', 'PARSING_ERROR', 'TIMEOUT_ERROR', 'CUSTOM_ERROR'.
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

    // SerializedError (RTK) — fallback, если статус не определён.
    if (!code) {
        const maybeSerialized = error as SerializedError
        if (maybeSerialized && typeof maybeSerialized === 'object' && 'message' in maybeSerialized) {
            rawMessage = maybeSerialized.message ?? rawMessage
        }
    }

    // Обычный JS Error.
    if (!code && error instanceof Error) {
        rawMessage = error.message
    }

    const base: AppErrorDescriptor = getErrorDescriptor(code)
    return {
        ...base,
        rawMessage
    }
}
