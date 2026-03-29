import type { IncomingMessage, ServerResponse } from 'node:http'

interface BuildDevApiProxyErrorPayloadArgs {
    target: string
    req: IncomingMessage
    error: Error & { code?: string }
}

/**
 * Строит owner-ошибку для dev proxy, когда backend host недоступен.
 * Это не backend envelope, а явный transport-layer ответ Vite, чтобы локальный UI
 * не деградировал до пустого `500 Internal Server Error`.
 */
export function buildDevApiProxyErrorPayload(args: BuildDevApiProxyErrorPayloadArgs) {
    const method = args.req.method ?? 'GET'
    const path = args.req.url ?? '/api'
    const errorCode = typeof args.error.code === 'string' ? args.error.code : 'UNKNOWN_PROXY_ERROR'
    const errorMessage = args.error.message?.trim() || 'Unknown proxy transport error.'

    return {
        status: 502,
        code: 'dev_api_proxy_target_unreachable',
        message: 'Local dev API proxy could not reach the backend host.',
        owner: 'frontend.dev-proxy',
        expected: `Vite dev proxy should forward ${method} ${path} to a reachable backend host at ${args.target}.`,
        actual: `${errorCode}: ${errorMessage}`,
        requiredAction: `Restore the backend host at ${args.target}, or set VITE_DEV_API_PROXY_TARGET to an explicit reachable target if the local launch profile is not the intended API owner.`,
        context: {
            method,
            path,
            proxyTarget: args.target
        }
    }
}

export function writeDevApiProxyErrorResponse(args: {
    target: string
    req: IncomingMessage
    res: ServerResponse
    error: Error & { code?: string }
}): void {
    if (args.res.headersSent) {
        return
    }

    const payload = buildDevApiProxyErrorPayload({
        target: args.target,
        req: args.req,
        error: args.error
    })

    args.res.statusCode = payload.status
    args.res.setHeader('Content-Type', 'application/json; charset=utf-8')
    args.res.end(JSON.stringify(payload))
}
