import { normalizeApiBaseUrl, resolveApiBaseUrlForRuntime } from './apiBaseUrl'

describe('apiBaseUrl runtime resolution', () => {
    test('normalizes explicit absolute API base URL', () => {
        expect(normalizeApiBaseUrl('https://api.example.com/base///')).toBe('https://api.example.com/base')
    })

    test('uses explicit absolute API base URL in production', () => {
        const resolved = resolveApiBaseUrlForRuntime({
            rawEnvValue: 'https://api.example.com/base/',
            isProd: true
        })

        expect(resolved).toBe('https://api.example.com/base')
    })

    test('rejects relative API base URL in production', () => {
        expect(() =>
            resolveApiBaseUrlForRuntime({
                rawEnvValue: '/api',
                isProd: true
            })
        ).toThrow('[api-base-url] production API base URL must be absolute.')
    })

    test('requires explicit API base URL in production', () => {
        expect(() =>
            resolveApiBaseUrlForRuntime({
                rawEnvValue: '',
                isProd: true
            })
        ).toThrow('[api-base-url] VITE_API_BASE_URL is required in production.')
    })

    test('keeps dev fallback on relative /api without browser origin', () => {
        const resolved = resolveApiBaseUrlForRuntime({
            rawEnvValue: '',
            isProd: false
        })

        expect(resolved).toBe('/api')
    })

    test('accepts relative env value in development', () => {
        const resolved = resolveApiBaseUrlForRuntime({
            rawEnvValue: '/api',
            isProd: false
        })

        expect(resolved).toBe('/api')
    })
})
