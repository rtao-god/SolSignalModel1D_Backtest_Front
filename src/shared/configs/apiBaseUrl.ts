const DEV_FALLBACK_API_BASE_URL = '/api'

function normalizeApiBaseUrl(url: string): string {
    return url.replace(/\/+$/, '')
}

function resolveApiBaseUrl(): string {
    const raw = import.meta.env.VITE_API_BASE_URL
    const trimmed = typeof raw === 'string' ? raw.trim() : ''

    if (trimmed.length > 0) {
        return normalizeApiBaseUrl(trimmed)
    }

    if (import.meta.env.PROD) {
        throw new Error('VITE_API_BASE_URL is required in production')
    }

    return DEV_FALLBACK_API_BASE_URL
}

export const API_BASE_URL: string = resolveApiBaseUrl()
