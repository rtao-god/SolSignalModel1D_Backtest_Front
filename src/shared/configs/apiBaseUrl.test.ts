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
        const getError = () =>
            resolveApiBaseUrlForRuntime({
                rawEnvValue: '/api',
                isProd: true
            })

        expect(getError).toThrow('Production API base URL must be absolute.')
        expect(getError).toThrow('owner=frontend.api-base-url')
        expect(getError).toThrow('code=production_api_base_url_not_absolute')
        expect(getError).toThrow('requiredAction=Set VITE_API_BASE_URL to the deployed backend API origin before building the frontend.')
    })

    test('requires explicit API base URL in production', () => {
        const getError = () =>
            resolveApiBaseUrlForRuntime({
                rawEnvValue: '',
                isProd: true
            })

        expect(getError).toThrow('Production API base URL is missing.')
        expect(getError).toThrow('owner=frontend.api-base-url')
        expect(getError).toThrow('code=production_api_base_url_missing')
        expect(getError).toThrow('actual=VITE_API_BASE_URL is empty or undefined while isProd=true.')
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
