import { describe, expect, it } from 'vitest'
import { DEFAULT_DEV_API_PROXY_TARGET, resolveDevApiProxyTarget } from './devProxyTarget'

describe('resolveDevApiProxyTarget', () => {
    it('uses the standard local backend target when env is empty', () => {
        expect(resolveDevApiProxyTarget(undefined)).toBe(DEFAULT_DEV_API_PROXY_TARGET)
        expect(resolveDevApiProxyTarget('   ')).toBe(DEFAULT_DEV_API_PROXY_TARGET)
    })

    it('normalizes a bare host and removes the /api suffix', () => {
        expect(resolveDevApiProxyTarget('localhost:5289/api')).toBe('http://localhost:5289')
        expect(resolveDevApiProxyTarget('https://remote.example.com/api/')).toBe('https://remote.example.com')
    })

    it('fails fast on an invalid explicit target', () => {
        expect(() => resolveDevApiProxyTarget('http://::bad')).toThrow('[dev-api-proxy-target]')
    })
})
