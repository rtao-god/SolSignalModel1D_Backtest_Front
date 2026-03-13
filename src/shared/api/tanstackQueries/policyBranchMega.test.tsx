import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren, ReactElement } from 'react'
import {
    buildPolicyBranchMegaQueryKey,
    fetchPolicyBranchMegaReport,
    prefetchPolicyBranchMegaReportWithFreshness,
    POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS,
    resolvePolicyBranchMegaReportQueryArgs,
    usePolicyBranchMegaReportWithFreshnessQuery
} from './policyBranchMega'

function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    })
}

function createWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: PropsWithChildren): ReactElement {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json'
        }
    })
}

function textResponse(body: string, status: number): Response {
    return new Response(body, {
        status,
        headers: {
            'Content-Type': 'text/plain'
        }
    })
}

function createPolicyBranchMegaStatus(state: 'fresh' | 'stale' | 'missing' | 'unknown') {
    return {
        state,
        message:
            state === 'stale' ?
                'policy_branch_mega is older than backtest_diagnostics.'
            :   `policy_branch_mega status: ${state}`,
        lagSeconds: state === 'stale' ? 6060 : null,
        policyBranchMegaId: 'policy-branch-mega-test',
        policyBranchMegaGeneratedAtUtc: '2026-03-12T07:00:00.000Z',
        diagnosticsId: 'diag-test',
        diagnosticsGeneratedAtUtc: '2026-03-12T08:41:00.000Z',
        availableBuckets: ['daily', 'total'],
        availableParts: [1, 2, 3, 4],
        availableTotalBucketViews: ['aggregate', 'separate'],
        availableMetrics: ['real', 'no-biggest-liq-loss'],
        availableTpSlModes: ['all', 'dynamic', 'static'],
        availableSlModes: ['with-sl', 'no-sl'],
        availableZonalModes: ['with-zonal', 'without-zonal']
    }
}

function createPolicyBranchMegaReport() {
    return {
        schemaVersion: 2,
        id: 'policy-branch-mega-test',
        kind: 'policy_branch_mega',
        title: 'Policy Branch Mega',
        titleKey: 'policy_branch_mega.title',
        generatedAtUtc: '2026-03-12T08:41:00.000Z',
        keyValueSections: [],
        tableSections: [
            {
                sectionKey: 'policy_branch_mega_daily_with_sl_part_1',
                title: 'Policy Branch Mega [Daily] WITH SL [PART 1/4]',
                columns: ['Policy', 'Branch', 'TotalPnl%'],
                columnKeys: ['policy_name', 'branch', 'total_pnl_pct'],
                rows: [['const_2x', 'BASE', '1.00']],
                metadata: {
                    kind: 'policy_branch_mega',
                    mode: 'with-sl',
                    isStopLossEnabled: true,
                    tpSlMode: 'all',
                    zonalMode: 'with-zonal',
                    metricVariant: 'real',
                    bucket: 'daily',
                    part: 1
                }
            }
        ]
    }
}

describe('policyBranchMega freshness query', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    test('fetches the report even when freshness status is stale', async () => {
        const queryClient = createQueryClient()
        const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs({ part: 1 })
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url.includes('/api/backtest/policy-branch-mega/status')) {
                return jsonResponse(createPolicyBranchMegaStatus('stale'))
            }

            if (url.includes('/api/backtest/policy-branch-mega')) {
                return jsonResponse(createPolicyBranchMegaReport())
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        await prefetchPolicyBranchMegaReportWithFreshness(queryClient, { part: 1 })

        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(queryClient.getQueryData(buildPolicyBranchMegaQueryKey(resolvedArgs))).toMatchObject({
            id: 'policy-branch-mega-test'
        })
    })

    test('surfaces the real report endpoint error when status endpoint is unavailable', async () => {
        const queryClient = createQueryClient()
        // Status endpoint only enriches freshness metadata and must not replace
        // the real transport/report error from the blocking report request.
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url.includes('/api/backtest/policy-branch-mega/status')) {
                throw new Error('status endpoint is unavailable')
            }

            if (url.includes('/api/backtest/policy-branch-mega')) {
                return textResponse('server exploded', 500)
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const { result } = renderHook(() => usePolicyBranchMegaReportWithFreshnessQuery({ part: 1 }), {
            wrapper: createWrapper(queryClient)
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(result.current.error?.message).toContain('Failed to load policy branch mega report: 500 server exploded')
        expect(result.current.error?.message).not.toContain(
            'policy_branch_mega is stale relative to backtest_diagnostics'
        )
        expect(result.current.error?.message).not.toContain('Latest policy_branch_mega report is missing')
    })

    test('fails with timeout when report request hangs indefinitely', async () => {
        vi.useFakeTimers()

        const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input)

            if (url.includes('/api/backtest/policy-branch-mega')) {
                return new Promise<Response>((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
                        once: true
                    })
                })
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const reportPromise = fetchPolicyBranchMegaReport({ part: 1 })
        const rejection = expect(reportPromise).rejects.toThrow(
            `Request timed out after ${POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS}ms`
        )
        await vi.advanceTimersByTimeAsync(POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS + 1)

        await rejection
    })
})
