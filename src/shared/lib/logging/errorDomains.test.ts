import { describe, expect, test } from 'vitest'
import { resolveErrorDomain, shouldSurfaceRuntimeError } from './errorDomains'

describe('errorDomains', () => {
    test('classifies Vite websocket and localhost:5173 failures as dev_infra', () => {
        const error = new Error(
            "[vite] failed to connect to websocket. WebSocket connection to 'ws://localhost:5173/' failed"
        )

        expect(
            resolveErrorDomain(error, {
                source: 'window.onerror'
            })
        ).toBe('dev_infra')
        expect(shouldSurfaceRuntimeError('dev_infra')).toBe(false)
    })

    test('classifies route prefetch failures as route_runtime', () => {
        const error = new Error(
            'Failed to fetch dynamically imported module: http://localhost:5173/src/pages/Main/index.ts'
        )

        expect(
            resolveErrorDomain(error, {
                source: 'route-chunk-prefetch'
            })
        ).toBe('route_runtime')
    })

    test('classifies route data prefetch network failures as api_transport', () => {
        const error = new Error('TypeError: Failed to fetch')

        expect(
            resolveErrorDomain(error, {
                source: 'route-data-prefetch'
            })
        ).toBe('api_transport')
    })

    test('classifies section data failures as ui_section', () => {
        const error = new Error('[policy-branch-mega] report payload is missing.')

        expect(
            resolveErrorDomain(error, {
                source: 'section-data-state'
            })
        ).toBe('ui_section')
    })

    test('classifies backend contract messages separately from transport noise', () => {
        const error = new Error('[api.backtest.diagnostics] latest backtest_diagnostics has invalid metadata.')

        expect(resolveErrorDomain(error)).toBe('backend_contract')
    })
})
