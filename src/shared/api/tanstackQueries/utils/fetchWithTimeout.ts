export const DEFAULT_FETCH_TIMEOUT_MS = 30_000

interface FetchWithTimeoutOptions extends RequestInit {
    timeoutMs?: number
}

function isAbortError(error: unknown): boolean {
    return (
        (error instanceof Error && error.name === 'AbortError') ||
        (typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            (error as { name?: unknown }).name === 'AbortError')
    )
}

/**
 * Оборачивает fetch явным timeout, чтобы зависший API не оставлял страницу в бесконечном pending-state.
 * Если caller передал signal, внешний abort сохраняет приоритет и не маскируется как timeout.
 */
export async function fetchWithTimeout(input: RequestInfo | URL, options?: FetchWithTimeoutOptions): Promise<Response> {
    const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal, ...init } = options ?? {}

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error(`[fetch-timeout] timeoutMs must be a positive finite number. value=${String(timeoutMs)}.`)
    }

    const controller = new AbortController()
    const handleAbort = () => controller.abort()

    if (signal?.aborted) {
        controller.abort()
    } else if (signal) {
        signal.addEventListener('abort', handleAbort, { once: true })
    }

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal
        })
    } catch (error) {
        if (isAbortError(error) && !signal?.aborted) {
            throw new Error(`Request timed out after ${timeoutMs}ms: ${String(input)}`)
        }

        throw error
    } finally {
        clearTimeout(timeoutId)
        if (signal) {
            signal.removeEventListener('abort', handleAbort)
        }
    }
}
