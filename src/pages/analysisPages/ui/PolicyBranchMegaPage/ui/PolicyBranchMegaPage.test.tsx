import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import PolicyBranchMegaPage from './PolicyBranchMegaPage'

const refetchMock = vi.fn()
const useQueriesMock = vi.fn()

function buildVariantSelection(part: string) {
    return {
        family: 'policy_branch_mega',
        sourceReportKind: 'policy_branch_mega',
        sourceReportId: 'policy-branch-mega-source',
        publishedAtUtc: '2026-03-27T12:00:00.000Z',
        variantKey: `policy-branch-mega-daily-part-${part}`,
        selection: {
            bucket: 'daily',
            bucketview: 'aggregate',
            metric: 'real',
            part,
            tpsl: 'all',
            slmode: 'with-sl',
            zonal: 'with-zonal'
        },
        axes: [
            {
                key: 'part',
                defaultValue: part,
                options: [
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' }
                ]
            }
        ]
    }
}

function buildPart1Section() {
    return {
        sectionKey: 'policy_branch_mega_daily_with_sl_part_1',
        title: 'Policy Branch Mega [Daily] WITH SL [PART 1/4]',
        columns: ['Policy', 'Branch', 'TotalPnl%', 'Tr'],
        columnKeys: ['policy_name', 'branch', 'total_pnl_pct', 'trades'],
        rows: [['const_2x', 'BASE', '1.00', '3']],
        metadata: {
            kind: 'policy-branch-mega',
            mode: 'with-sl',
            tpSlMode: 'all',
            zonalMode: 'with-zonal',
            metricVariant: 'real',
            bucket: 'daily',
            part: 1
        }
    }
}

function buildPart2FundingSection() {
    return {
        sectionKey: 'policy_branch_mega_daily_with_sl_part_2',
        title: 'Policy Branch Mega (FULL HISTORY, WITH SL + NO SL) [REAL] [PART 2/4] [daily]',
        columns: [
            'Policy',
            'Branch',
            'FundingTr',
            'FundingEv',
            'FundingNet$',
            'FundingPaid$',
            'FundingRecv$',
            'FundingLiq_n',
            'FundingDeath_n',
            'FundingMixedDeath_n'
        ],
        columnKeys: [
            'policy_name',
            'branch',
            'fundingtr',
            'fundingev',
            'fundingnet',
            'fundingpaid',
            'fundingrecv',
            'fundingliq_n',
            'fundingdeath_n',
            'fundingmixeddeath_n'
        ],
        rows: [['const_2x', 'BASE', '3', '7', '-120.50', '180.20', '59.70', '1', '0', '1']],
        metadata: {
            kind: 'policy-branch-mega',
            mode: 'with-sl',
            tpSlMode: 'all',
            zonalMode: 'with-zonal',
            metricVariant: 'real',
            bucket: 'daily',
            part: 2
        }
    }
}

let primarySectionsMock = [buildPart1Section()]
let variantSelectionMock = buildVariantSelection('1')

vi.mock('@tanstack/react-query', async importOriginal => {
    const actual = await importOriginal<typeof import('@tanstack/react-query')>()
    return {
        ...actual,
        useQueries: (...args: Parameters<typeof useQueriesMock>) => useQueriesMock(...args)
    }
})

vi.mock('@/shared/ui/SectionPager/lib/scrollToAnchor', () => ({
    scrollToAnchor: vi.fn()
}))

vi.mock('@/shared/ui/SectionPager/ui/SectionPager', () => ({
    default: ({ sections }: { sections: Array<{ id: string; label: string }> }) => (
        <div data-testid='section-pager'>
            {sections.map(section => (
                <span key={section.id}>{section.label}</span>
            ))}
        </div>
    )
}))

vi.mock('@/shared/utils/reportSourceEndpoint', () => ({
    resolveReportSourceEndpoint: () => '/api'
}))

vi.mock('../model/policyBranchMegaPolicySetupLink', () => ({
    resolveMegaRenderedRowKey: () => 'mega-row-key',
    resolvePolicySetupCellStateForMegaRow: () => ({ detailPath: null }),
    resolvePolicySetupLinkAlertSummaryForMegaRows: () => null
}))

vi.mock('@/shared/api/tanstackQueries/policyBranchMega', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/policyBranchMega')>()

    return {
        ...actual,
        usePolicyBranchMegaReportNavQuery: () => ({
            data: {
                schemaVersion: 2,
                id: 'policy-branch-mega-report',
                kind: 'policy_branch_mega',
                title: 'Policy Branch Mega',
                generatedAtUtc: '2026-03-27T12:00:00.000Z',
                sections: primarySectionsMock
            },
            isLoading: false,
            isError: false,
            error: null,
            refetch: refetchMock
        }),
        usePolicyBranchMegaEvaluationQuery: () => ({
            data: {
                profileId: 'eval-1',
                rows: {}
            }
        }),
        usePolicyBranchMegaValidationQuery: () => ({
            data: null,
            error: null
        })
    }
})

vi.mock('@/shared/api/tanstackQueries/reportVariants', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/reportVariants')>()

    return {
        ...actual,
        usePublishedReportVariantSelectionQuery: () => ({
            data: variantSelectionMock,
            error: null
        })
    }
})

describe('PolicyBranchMegaPage', () => {
    beforeEach(() => {
        primarySectionsMock = [buildPart1Section()]
        variantSelectionMock = buildVariantSelection('1')
        useQueriesMock.mockImplementation(({ queries }: { queries: Array<{ queryKey: unknown }> }) =>
            queries.map(query => {
                const queryKeyText = JSON.stringify(query.queryKey)

                if (queryKeyText.includes('evaluation')) {
                    return {
                        data: undefined,
                        isLoading: true,
                        isFetching: true,
                        error: null
                    }
                }

                return {
                    data: undefined,
                    isLoading: true,
                    isFetching: true,
                    error: null
                }
            })
        )
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    test('берёт части из selection snapshot и запрашивает part 2, даже если активный report содержит только part 1', async () => {
        render(<PolicyBranchMegaPage />, {
            route: '/analysis/policy-branch-mega?bucket=daily&bucketview=aggregate&metric=real&tpsl=all&slmode=with-sl&zonal=with-zonal'
        })

        expect(await screen.findByText('Часть 2/4')).toBeInTheDocument()

        const reportPartQueries = useQueriesMock.mock.calls[0]?.[0]?.queries
        expect(reportPartQueries).toHaveLength(1)
        expect(reportPartQueries?.[0]?.queryKey).toEqual([
            'backtest',
            'policy-branch-mega',
            'daily',
            'aggregate',
            'real',
            2,
            'all',
            'with-sl',
            'with-zonal'
        ])
    })

    test('спокойно рендерит funding-колонки в part 2 без unexpected columns error', async () => {
        primarySectionsMock = [buildPart2FundingSection()]
        variantSelectionMock = buildVariantSelection('2')
        useQueriesMock.mockReturnValue([])

        render(<PolicyBranchMegaPage />, {
            route: '/analysis/policy-branch-mega?bucket=daily&bucketview=aggregate&metric=real&tpsl=all&slmode=with-sl&zonal=with-zonal&part=2'
        })

        expect(await screen.findByText('Policy Branch Mega')).toBeInTheDocument()
        expect(
            screen.queryByText(/unexpected columns found while reordering section/i)
        ).not.toBeInTheDocument()
        expect(screen.queryByText(/Failed to prepare policy branch mega sections/i)).not.toBeInTheDocument()
    })
})
