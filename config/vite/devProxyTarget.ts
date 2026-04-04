export const DEFAULT_DEV_API_PROXY_TARGET = 'http://127.0.0.1:10000'

/**
 * Dev proxy target должен быть чистым transport-контрактом:
 * фронт не читает backend launch settings и не поднимает backend, а только знает куда проксировать `/api`.
 */
export function resolveDevApiProxyTarget(rawTarget: string | undefined): string {
    const trimmedTarget = rawTarget?.trim() ?? ''
    if (!trimmedTarget) {
        return DEFAULT_DEV_API_PROXY_TARGET
    }

    const normalizedTarget = trimmedTarget
        .replace(/\/+$/, '')
        .replace(/\/api$/i, '')

    const withProtocol = /^https?:\/\//i.test(normalizedTarget)
        ? normalizedTarget
        : `http://${normalizedTarget}`

    let parsedTarget: URL
    try {
        parsedTarget = new URL(withProtocol)
    } catch {
        throw new Error(
            `[dev-api-proxy-target] Invalid VITE_DEV_API_PROXY_TARGET value '${rawTarget}'. ` +
            'Expected a host like http://127.0.0.1:10000 or localhost:10000.'
        )
    }

    return parsedTarget.origin
}
