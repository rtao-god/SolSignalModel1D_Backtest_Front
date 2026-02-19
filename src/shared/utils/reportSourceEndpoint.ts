import { API_BASE_URL } from '@/shared/configs/config'

function trimTrailingSlashes(value: string): string {
    return value.replace(/\/+$/, '')
}

export function resolveReportSourceEndpointOrThrow(): string {
    const base = API_BASE_URL.trim()
    if (!base) {
        throw new Error('[report-source] API_BASE_URL is empty.')
    }

    if (base.startsWith('/')) {
        const devProxy = import.meta.env.VITE_DEV_API_PROXY_TARGET
        if (typeof devProxy === 'string' && devProxy.trim().length > 0) {
            return trimTrailingSlashes(devProxy.trim())
        }

        if (typeof window === 'undefined' || !window.location?.origin) {
            throw new Error('[report-source] window.location.origin is unavailable for relative API base URL.')
        }

        return trimTrailingSlashes(`${window.location.origin}${base}`)
    }

    return trimTrailingSlashes(base)
}
