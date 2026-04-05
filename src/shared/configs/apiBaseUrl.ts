const DEV_FALLBACK_API_BASE_URL = '/api'

interface ApiBaseUrlConfigErrorArgs {
    code: string
    message: string
    expected: string
    actual: string
    requiredAction: string
}

function buildApiBaseUrlConfigError(args: ApiBaseUrlConfigErrorArgs): Error {
    const error = new Error(
        `${args.message} ` +
        `owner=frontend.api-base-url | ` +
        `code=${args.code} | ` +
        `expected=${args.expected} | ` +
        `actual=${args.actual} | ` +
        `requiredAction=${args.requiredAction}`
    )
    error.name = 'ApiBaseUrlConfigError'
    return error
}

/**
 * Нормализует базовый URL API в один каноничный вид без хвостовых слешей.
 */
export function normalizeApiBaseUrl(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) {
        throw buildApiBaseUrlConfigError({
            code: 'api_base_url_empty',
            message: 'API base URL must not be empty.',
            expected: 'A non-empty API base URL string.',
            actual: 'Received an empty or whitespace-only API base URL.',
            requiredAction: 'Set VITE_API_BASE_URL to a non-empty value, or keep the development fallback /api.'
        })
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
            throw buildApiBaseUrlConfigError({
                code: 'production_api_base_url_not_absolute',
                message: 'Production API base URL must be absolute.',
                expected: 'VITE_API_BASE_URL should be a full HTTPS URL like https://backend.example.com/api.',
                actual: `Received a non-absolute production API base URL: ${normalizedEnvBaseUrl}.`,
                requiredAction: 'Set VITE_API_BASE_URL to the deployed backend API origin before building the frontend.'
            })
        }

        return normalizedEnvBaseUrl
    }

    if (args.isProd) {
        throw buildApiBaseUrlConfigError({
            code: 'production_api_base_url_missing',
            message: 'Production API base URL is missing.',
            expected: 'VITE_API_BASE_URL should be defined as a full HTTPS backend API URL during production build.',
            actual: 'VITE_API_BASE_URL is empty or undefined while isProd=true.',
            requiredAction: 'Define VITE_API_BASE_URL in the production environment and rebuild the frontend.'
        })
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
