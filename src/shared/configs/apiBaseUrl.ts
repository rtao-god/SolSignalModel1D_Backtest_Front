const DEV_FALLBACK_API_BASE_URL = '/api'
const RENDER_FRONT_HOST_SUFFIX = '-front.onrender.com'
const RENDER_BACKEND_HOST_SUFFIX = '-backend.onrender.com'
const API_PATH_SUFFIX = '/api'

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
 * Для Render static frontend выводит backend origin по соглашению именования сервисов.
 * Пример:
 * `https://<name>-front.onrender.com` -> `https://<name>-backend.onrender.com/api`
 */
export function deriveRenderBackendApiBaseUrl(browserOrigin?: string | null): string | null {
    if (!browserOrigin || typeof browserOrigin !== 'string') {
        return null
    }

    let originUrl: URL
    try {
        originUrl = new URL(browserOrigin)
    } catch {
        return null
    }

    if (!originUrl.hostname.endsWith(RENDER_FRONT_HOST_SUFFIX)) {
        return null
    }

    originUrl.hostname = originUrl.hostname.replace(RENDER_FRONT_HOST_SUFFIX, RENDER_BACKEND_HOST_SUFFIX)
    originUrl.pathname = API_PATH_SUFFIX
    originUrl.search = ''
    originUrl.hash = ''

    return normalizeApiBaseUrl(originUrl.toString())
}

/**
 * Единый owner-резолвер базового адреса API.
 * В production сначала уважает явный абсолютный env URL, затем умеет сам восстановить
 * Render backend host по frontend origin, и только потом падает обратно на same-origin `/api`.
 */
export function resolveApiBaseUrlForRuntime(args: {
    rawEnvValue?: string
    isProd: boolean
    browserOrigin?: string | null
}): string {
    const trimmedEnv = typeof args.rawEnvValue === 'string' ? args.rawEnvValue.trim() : ''
    const derivedRenderApiBaseUrl = deriveRenderBackendApiBaseUrl(args.browserOrigin)

    if (trimmedEnv.length > 0) {
        const normalizedEnvBaseUrl = normalizeApiBaseUrl(trimmedEnv)

        if (!args.isProd) {
            return normalizedEnvBaseUrl
        }

        if (/^https?:\/\//i.test(normalizedEnvBaseUrl)) {
            return normalizedEnvBaseUrl
        }

        if (normalizedEnvBaseUrl.startsWith('/') && derivedRenderApiBaseUrl) {
            return derivedRenderApiBaseUrl
        }

        if (normalizedEnvBaseUrl.startsWith('/')) {
            if (!args.browserOrigin) {
                throw new Error('[api-base-url] browser origin is required for relative production API base URL.')
            }

            return normalizeApiBaseUrl(`${args.browserOrigin}${normalizedEnvBaseUrl}`)
        }

        return normalizedEnvBaseUrl
    }

    if (args.isProd) {
        if (derivedRenderApiBaseUrl) {
            return derivedRenderApiBaseUrl
        }

        if (args.browserOrigin) {
            return normalizeApiBaseUrl(`${args.browserOrigin}${DEV_FALLBACK_API_BASE_URL}`)
        }

        throw new Error('[api-base-url] VITE_API_BASE_URL is required in production when browser origin is unavailable.')
    }

    return DEV_FALLBACK_API_BASE_URL
}

function resolveApiBaseUrl(): string {
    return resolveApiBaseUrlForRuntime({
        rawEnvValue: import.meta.env.VITE_API_BASE_URL,
        isProd: import.meta.env.PROD,
        browserOrigin: typeof window !== 'undefined' ? window.location?.origin ?? null : null
    })
}

export const API_BASE_URL: string = resolveApiBaseUrl()
