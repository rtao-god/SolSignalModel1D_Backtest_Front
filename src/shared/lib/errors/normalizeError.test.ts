import { describe, expect, test } from 'vitest'
import { normalizeErrorLike } from './normalizeError'

describe('normalizeErrorLike', () => {
    test('preserves context for non-Error values', () => {
        const result = normalizeErrorLike(
            { reason: 'timeout' },
            'Unknown API request error.',
            {
                source: 'use-api',
                domain: 'ui_section',
                owner: 'useApi',
                expected: 'API hook should receive a successful JSON payload or a detailed API error.',
                actual: 'Response body was not an Error instance.',
                requiredAction: 'Inspect endpoint response.',
                extra: { endpoint: '/api/current-prediction' }
            }
        )

        expect(result.message).toContain('Unknown API request error.')
        expect(result.message).toContain('actual={"reason":"timeout"}')
        expect(result.message).toContain('owner=useApi')
        expect(result.message).toContain('expected=API hook should receive a successful JSON payload or a detailed API error.')
        expect(result.message).toContain('reportedActual=Response body was not an Error instance.')
        expect(result.message).toContain('requiredAction=Inspect endpoint response.')
        expect(result.message).toContain('source=use-api')
        expect(result.message).toContain('domain=ui_section')
        expect(result.message).toContain('extra={"endpoint":"/api/current-prediction"}')
    })

    test('returns the original Error instance unchanged when no extra context is provided', () => {
        const original = new Error('original')

        const result = normalizeErrorLike(original, 'fallback')

        expect(result).toBe(original)
    })

    test('enriches an existing Error when explicit context is provided', () => {
        const original = new Error('Request timed out')

        const result = normalizeErrorLike(original, 'fallback', {
            owner: 'frontend.fetch-with-timeout',
            expected: 'HTTP response headers arrive before the timeout deadline.',
            actual: 'No response was returned before the timeout deadline.',
            requiredAction: 'Inspect backend latency and the published-read path.'
        })

        expect(result).not.toBe(original)
        expect(result.message).toContain('Request timed out')
        expect(result.message).toContain('owner=frontend.fetch-with-timeout')
        expect(result.message).toContain('expected=HTTP response headers arrive before the timeout deadline.')
        expect(result.message).toContain('reportedActual=No response was returned before the timeout deadline.')
        expect(result.message).toContain('requiredAction=Inspect backend latency and the published-read path.')
    })
})
