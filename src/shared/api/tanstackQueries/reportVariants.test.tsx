import { QueryClient } from '@tanstack/react-query'
import {
    buildPublishedReportVariantSelectionQueryKey,
    fetchPublishedReportVariantSelectionSnapshot,
    prefetchPublishedReportVariantSelectionSnapshot,
    PUBLISHED_REPORT_VARIANT_FAMILIES
} from './reportVariants'

function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    })
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json'
        }
    })
}

describe('reportVariants selection snapshot', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('loads selection snapshot through the dedicated owner endpoint', async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)
            expect(url).toContain('/api/report-variants/policy_branch_mega/selection?')
            expect(url).toContain('bucket=daily')
            expect(url).toContain('part=1')

            return jsonResponse({
                family: 'policy_branch_mega',
                sourceReportKind: 'policy_branch_mega',
                sourceReportId: 'policy-branch-mega-source',
                publishedAtUtc: '2026-03-27T12:00:00.000Z',
                variantKey: 'policy-branch-mega-daily-1',
                selection: {
                    bucket: 'daily',
                    bucketview: 'aggregate',
                    metric: 'real',
                    part: '1',
                    tpsl: 'all',
                    slmode: 'with-sl',
                    zonal: 'with-zonal'
                },
                axes: [
                    {
                        key: 'part',
                        defaultValue: '1',
                        options: [
                            { value: '1', label: '1' },
                            { value: '2', label: '2' },
                            { value: '3', label: '3' },
                            { value: '4', label: '4' }
                        ]
                    }
                ]
            })
        })

        vi.stubGlobal('fetch', fetchMock)

        const snapshot = await fetchPublishedReportVariantSelectionSnapshot(
            PUBLISHED_REPORT_VARIANT_FAMILIES.policyBranchMega,
            {
                bucket: 'daily',
                bucketview: 'aggregate',
                metric: 'real',
                part: '1',
                tpsl: 'all',
                slmode: 'with-sl',
                zonal: 'with-zonal'
            }
        )

        expect(snapshot.selection.part).toBe('1')
        expect(snapshot.axes[0]?.options.map(option => option.value)).toEqual(['1', '2', '3', '4'])
    })

    test('prefetches selection snapshot into the shared query cache', async () => {
        const queryClient = createQueryClient()
        const selectionArgs = {
            bucket: 'daily',
            bucketview: 'aggregate',
            metric: 'real',
            part: '1',
            tpsl: 'all',
            slmode: 'with-sl',
            zonal: 'with-zonal'
        }
        const fetchMock = vi.fn(async () =>
            jsonResponse({
                family: 'policy_branch_mega',
                sourceReportKind: 'policy_branch_mega',
                sourceReportId: 'policy-branch-mega-source',
                publishedAtUtc: '2026-03-27T12:00:00.000Z',
                variantKey: 'policy-branch-mega-daily-1',
                selection: selectionArgs,
                axes: [
                    {
                        key: 'part',
                        defaultValue: '1',
                        options: [
                            { value: '1', label: '1' },
                            { value: '2', label: '2' }
                        ]
                    }
                ]
            })
        )

        vi.stubGlobal('fetch', fetchMock)

        await prefetchPublishedReportVariantSelectionSnapshot(
            queryClient,
            PUBLISHED_REPORT_VARIANT_FAMILIES.policyBranchMega,
            selectionArgs
        )

        expect(
            queryClient.getQueryData(
                buildPublishedReportVariantSelectionQueryKey(
                    PUBLISHED_REPORT_VARIANT_FAMILIES.policyBranchMega,
                    selectionArgs
                )
            )
        ).toMatchObject({
            variantKey: 'policy-branch-mega-daily-1',
            selection: {
                part: '1'
            }
        })
    })
})
