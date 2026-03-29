const DEV_FALLBACK_API_BASE_URL = '/api'

/**
 * Нормализует базовый URL API в один каноничный вид без хвостовых слешей.
 */
export function normalizeApiBaseUrl(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) {
        throw new Error('[api-base-url] API base URL must not be empty.')
    }

    return trimmed.replace(/\/+$/, '')
}

/**
 * Единый owner-резолвер базового адреса API.
 * В development всегда используется same-origin `/api` и Vite proxy.
 * В production требуется явный абсолютный <c>VITE_API_BASE_URL</c>.
 */
export function resolveApiBaseUrlForRuntime(args: {
    rawEnvValue?: string
    isProd: boolean
}): string {
    const trimmedEnv = typeof args.rawEnvValue === 'string' ? args.rawEnvValue.trim() : ''

    if (trimmedEnv.length > 0) {
        const normalizedEnvBaseUrl = normalizeApiBaseUrl(trimmedEnv)

        if (/^https?:\/\//i.test(normalizedEnvBaseUrl)) {
            return normalizedEnvBaseUrl
        }

        if (args.isProd) {
            throw new Error('[api-base-url] production API base URL must be absolute. Set VITE_API_BASE_URL to a full https:// URL.')
        }

        return normalizedEnvBaseUrl
    }

    if (args.isProd) {
        throw new Error('[api-base-url] VITE_API_BASE_URL is required in production.')
    }

    return DEV_FALLBACK_API_BASE_URL
}

function resolveApiBaseUrl(): string {
    return resolveApiBaseUrlForRuntime({
        rawEnvValue: import.meta.env.VITE_API_BASE_URL,
        isProd: import.meta.env.PROD
    })
}

export const API_BASE_URL: string = resolveApiBaseUrl()
