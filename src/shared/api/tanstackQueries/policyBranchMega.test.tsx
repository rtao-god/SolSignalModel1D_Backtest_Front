import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren, ReactElement } from 'react'
import {
    buildPolicyBranchMegaQueryKey,
    fetchPolicyBranchMegaReport,
    fetchPolicyBranchMegaValidation,
    POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS,
    prefetchPolicyBranchMegaReportParts,
    prefetchPolicyBranchMegaReportPayload,
    resolvePolicyBranchMegaReportQueryArgs,
    usePolicyBranchMegaReportQuery
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
                    kind: 'policy-branch-mega',
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

describe('policyBranchMega report queries', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    test('prefetches the first report payload without status endpoint requests', async () => {
        const queryClient = createQueryClient()
        const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs({ part: 1 })
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url.includes('/api/backtest/policy-branch-mega/status')) {
                throw new Error('status endpoint must not be used in report payload flow')
            }

            if (url.includes('/api/backtest/policy-branch-mega?')) {
                return jsonResponse(createPolicyBranchMegaReport())
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        await prefetchPolicyBranchMegaReportPayload(queryClient, { part: 1 })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(queryClient.getQueryData(buildPolicyBranchMegaQueryKey(resolvedArgs))).toMatchObject({
            id: 'policy-branch-mega-test'
        })
    })

    test('prefetches all canonical part slices for current mega selection', async () => {
        const queryClient = createQueryClient()
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url.includes('/api/backtest/policy-branch-mega/status')) {
                throw new Error('status endpoint must not be used in part prefetch flow')
            }

            if (url.includes('/api/backtest/policy-branch-mega?')) {
                return jsonResponse(createPolicyBranchMegaReport())
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        await prefetchPolicyBranchMegaReportParts(queryClient, { part: 1 })

        expect(fetchMock).toHaveBeenCalledTimes(4)
        const requestedUrls = fetchMock.mock.calls.map(call => String(call[0]))

        expect(requestedUrls.every(url => url.includes('/api/backtest/policy-branch-mega?'))).toBe(true)
        expect(requestedUrls.some(url => url.includes('part=1'))).toBe(true)
        expect(requestedUrls.some(url => url.includes('part=2'))).toBe(true)
        expect(requestedUrls.some(url => url.includes('part=3'))).toBe(true)
        expect(requestedUrls.some(url => url.includes('part=4'))).toBe(true)
    })

    test('surfaces the real report endpoint error without status fallback noise', async () => {
        const queryClient = createQueryClient()
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url.includes('/api/backtest/policy-branch-mega/status')) {
                throw new Error('status endpoint must not be used in report error flow')
            }

            if (url.includes('/api/backtest/policy-branch-mega')) {
                return textResponse('server exploded', 500)
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const { result } = renderHook(() => usePolicyBranchMegaReportQuery({ part: 1 }), {
            wrapper: createWrapper(queryClient)
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(result.current.error?.message).toContain('Failed to load policy branch mega report: 500 server exploded')
    })

    test('loads validation payload for the current selection', async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url.includes('/api/backtest/policy-branch-mega/validation?')) {
                return jsonResponse({
                    state: 'mismatch',
                    message: 'The current policy_branch_mega selection does not match backtest_diagnostics.',
                    selectionKey:
                        'bucket=daily|bucketview=aggregate|metric=real|tpsl=all|slmode=all|zonal=with-zonal|part=all',
                    policyBranchMegaId: 'policy-branch-mega-test',
                    diagnosticsId: 'diag-test',
                    requestedAtUtc: '2026-03-12T08:41:00.000Z',
                    checkedAtUtc: '2026-03-12T08:41:02.000Z'
                })
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const validation = await fetchPolicyBranchMegaValidation({
            bucket: 'daily',
            bucketView: 'aggregate',
            metric: 'real',
            tpSlMode: 'all',
            slMode: 'all',
            zonalMode: 'with-zonal'
        })

        expect(validation.state).toBe('mismatch')
        expect(validation.policyBranchMegaId).toBe('policy-branch-mega-test')
        expect(validation.selectionKey).toContain('bucket=daily')
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
