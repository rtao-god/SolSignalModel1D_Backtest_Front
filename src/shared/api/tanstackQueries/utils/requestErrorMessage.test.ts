import { describe, expect, test } from 'vitest'
import { buildDetailedRequestErrorMessage } from './requestErrorMessage'

describe('buildDetailedRequestErrorMessage', () => {
    test('includes structured backend payload fields', () => {
        const bodyText = JSON.stringify({
            status: 500,
            code: 'policy_branch_mega_load_failed',
            message: 'Published mega report is unavailable.',
            owner: 'api.backtest.policy-branch-mega',
            expected: 'Published report variant should exist.',
            actual: 'Catalog is empty.',
            requiredAction: 'Publish the mega report catalog.',
            context: { bucket: 'daily', part: 1 },
            traceId: 'trace-123'
        })
        const response = new Response(
            bodyText,
            {
                status: 500,
                statusText: 'Internal Server Error'
            }
        )

        const result = buildDetailedRequestErrorMessage(
            'Failed to load policy branch mega report',
            response,
            bodyText
        )

        expect(result).toContain('Failed to load policy branch mega report: 500 Internal Server Error.')
        expect(result).toContain('owner=api.backtest.policy-branch-mega')
        expect(result).toContain('code=policy_branch_mega_load_failed')
        expect(result).toContain('expected=Published report variant should exist.')
        expect(result).toContain('actual=Catalog is empty.')
        expect(result).toContain('requiredAction=Publish the mega report catalog.')
        expect(result).toContain('context={"bucket":"daily","part":1}')
        expect(result).toContain('traceId=trace-123')
    })

    test('falls back to raw body when response is not structured json', () => {
        const response = new Response('boom', {
            status: 502,
            statusText: 'Bad Gateway'
        })

        const result = buildDetailedRequestErrorMessage('Failed to load API payload', response, 'boom')

        expect(result).toBe('Failed to load API payload: 502 Bad Gateway. body=boom.')
    })
})
