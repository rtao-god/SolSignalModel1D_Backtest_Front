import { deriveRenderBackendApiBaseUrl, normalizeApiBaseUrl, resolveApiBaseUrlForRuntime } from './apiBaseUrl'

describe('apiBaseUrl runtime resolution', () => {
    test('normalizes explicit absolute API base URL', () => {
        expect(normalizeApiBaseUrl('https://api.example.com/base///')).toBe('https://api.example.com/base')
    })

    test('derives Render backend API host from frontend origin', () => {
        expect(deriveRenderBackendApiBaseUrl('https://solsignalmodel1d-backtest-front.onrender.com')).toBe(
            'https://solsignalmodel1d-backtest-backend.onrender.com/api'
        )
    })

    test('prefers derived Render backend host over relative production env URL', () => {
        const resolved = resolveApiBaseUrlForRuntime({
            rawEnvValue: '/api',
            isProd: true,
            browserOrigin: 'https://solsignalmodel1d-backtest-front.onrender.com'
        })

        expect(resolved).toBe('https://solsignalmodel1d-backtest-backend.onrender.com/api')
    })

    test('falls back to same-origin api when production env is empty outside Render convention', () => {
        const resolved = resolveApiBaseUrlForRuntime({
            rawEnvValue: '',
            isProd: true,
            browserOrigin: 'https://example.com'
        })

        expect(resolved).toBe('https://example.com/api')
    })

    test('keeps dev fallback on relative /api without browser origin', () => {
        const resolved = resolveApiBaseUrlForRuntime({
            rawEnvValue: '',
            isProd: false,
            browserOrigin: null
        })

        expect(resolved).toBe('/api')
    })
})
