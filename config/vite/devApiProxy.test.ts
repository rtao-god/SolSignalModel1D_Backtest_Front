import { describe, expect, it } from 'vitest'
import { buildDevApiProxyErrorPayload } from './devApiProxy'

describe('buildDevApiProxyErrorPayload', () => {
    it('returns detailed owner payload for unreachable backend', () => {
        const proxyTarget = 'http://127.0.0.1:10000'
        const payload = buildDevApiProxyErrorPayload({
            target: proxyTarget,
            req: {
                method: 'GET',
                url: '/api/backtest/policy-branch-mega'
            } as never,
            error: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:10000'), { code: 'ECONNREFUSED' })
        })

        expect(payload.owner).toBe('frontend.dev-proxy')
        expect(payload.code).toBe('dev_api_proxy_target_unreachable')
        expect(payload.expected).toContain(proxyTarget)
        expect(payload.actual).toContain('ECONNREFUSED')
        expect(payload.requiredAction).toContain('VITE_DEV_API_PROXY_TARGET')
        expect(payload.context).toEqual({
            method: 'GET',
            path: '/api/backtest/policy-branch-mega',
            proxyTarget
        })
    })
})
