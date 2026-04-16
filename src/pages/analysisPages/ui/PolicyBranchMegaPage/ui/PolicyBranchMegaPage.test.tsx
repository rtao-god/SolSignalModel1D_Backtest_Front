import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { scrollToAnchor } from '@/shared/ui/SectionPager/lib/scrollToAnchor'
import PolicyBranchMegaPage from './PolicyBranchMegaPage'

const refetchMock = vi.fn()
const useQueriesMock = vi.fn()
const useCurrentPredictionBackfilledTrainingScopeStatsQueryMock = vi.fn()
const useModeRegistryQueryMock = vi.fn()
const FIXED_SPLIT_INITIAL_STATE = {
    mode: {
        activeMode: 'directional_fixed_split' as const
    }
}

function buildVariantSelection(part: string) {
    return {
        family: 'policy_branch_mega',
        sourceReportKind: 'policy_branch_mega',
        sourceReportId: 'policy-branch-mega-source',
        publishedAtUtc: '2026-03-27T12:00:00.000Z',
        variantKey: `policy-branch-mega-daily-part-${part}`,
        selection: {
            history: 'full_history',
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
                key: 'history',
                defaultValue: 'full_history',
                options: [
                    { value: 'full_history', label: 'Full history' },
                    { value: 'oos', label: 'OOS' },
                    { value: 'recent', label: 'Recent' }
                ]
            },
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
        columns: ['Policy', 'Branch', 'TotalPnl%', 'Wealth%', 'TotalPnl$', 'Comm$', 'Comm%', 'Tr', 'EODExit_n', 'EODExit%', 'EODExit$', 'EODExitPnl%'],
        columnKeys: ['policy_name', 'branch', 'total_pnl_pct', 'wealth_pct', 'total_pnl_usd', 'comm_usd', 'comm_pct', 'trades', 'eod_exit_n', 'eod_exit_share_pct', 'eod_exit_usd', 'eod_exit_pnl_pct'],
        rows: [['const_2x', 'BASE', '1.00', '1.00', '120.00', '8.00', '0.40', '3', '1', '33.3', '-12.00', '-0.06']],
        metadata: {
            kind: 'policy-branch-mega',
            historySlice: 'full_history',
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
            historySlice: 'full_history',
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
        useQueryClient: () => ({}),
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
        usePolicyBranchMegaModeMoneySummaryQuery: () => ({
            data: null,
            isLoading: false,
            isError: false,
            error: null,
            refetch: refetchMock
        }),
        usePolicyBranchMegaValidationQuery: () => ({
            data: null,
            error: null
        })
    }
})

vi.mock('@/shared/api/tanstackQueries/modeRegistry', () => ({
    useModeRegistryQuery: () => useModeRegistryQueryMock()
}))

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

vi.mock('@/shared/api/tanstackQueries/currentPrediction', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/currentPrediction')>()

    return {
        ...actual,
        useCurrentPredictionBackfilledTrainingScopeStatsQuery: () =>
            useCurrentPredictionBackfilledTrainingScopeStatsQueryMock()
    }
})

describe('PolicyBranchMegaPage', () => {
    beforeEach(() => {
        primarySectionsMock = [buildPart1Section()]
        variantSelectionMock = buildVariantSelection('1')
        useCurrentPredictionBackfilledTrainingScopeStatsQueryMock.mockReturnValue({
            data: {
                fullDays: 1327,
                trainDays: 1246,
                oosDays: 81,
                recentDays: 81,
                recentMatchesOos: true,
                oosHistoryDaySharePercent: 30,
                recentHistoryDaySharePercent: 15
            }
        })
        useModeRegistryQueryMock.mockReturnValue({
            data: {
                schemaVersion: 'mode-registry-v1-2026-04-15',
                modes: [
                    {
                        id: 'directional_fixed_split',
                        displayName: 'Directional Fixed Split',
                        isDefault: false,
                        defaultSliceKey: 'full',
                        slices: [
                            {
                                modeId: 'directional_fixed_split',
                                key: 'full',
                                displayLabel: 'Full',
                                isDiagnostic: false,
                                comparability: 'comparable',
                                description: 'Full fixed-split history.'
                            }
                        ]
                    }
                ]
            },
            isLoading: false,
            isError: false,
            error: null,
            refetch: refetchMock
        })
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

    test('без hash не закрепляет первую часть как активный anchor и не дёргает скролл к началу', async () => {
        useQueriesMock.mockReturnValue([])

        render(<PolicyBranchMegaPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/policy-branch-mega?history=full_history&bucket=daily&bucketview=aggregate&metric=real&tpsl=all&slmode=with-sl&zonal=with-zonal'
        })

        expect(await screen.findByRole('heading', { name: 'Policy Branch Mega' })).toBeInTheDocument()
        expect(scrollToAnchor).not.toHaveBeenCalled()
    })

    test('с явным hash сохраняет deep-link и прокручивает к запрошенной части', async () => {
        useQueriesMock.mockReturnValue([])

        render(<PolicyBranchMegaPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route:
                '/analysis/policy-branch-mega?history=full_history&bucket=daily&bucketview=aggregate&metric=real&tpsl=all&slmode=with-sl&zonal=with-zonal#policy-branch-section-1'
        })

        expect(await screen.findByRole('heading', { name: 'Policy Branch Mega' })).toBeInTheDocument()
        expect(scrollToAnchor).toHaveBeenCalledWith(
            'policy-branch-section-1',
            expect.objectContaining({
                behavior: 'auto',
                withTransitionPulse: false
            })
        )
    })

    test('после активной части прогревает payload всех остальных частей из selection snapshot без промежуточных loading-slot', async () => {
        render(<PolicyBranchMegaPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/policy-branch-mega?history=full_history&bucket=daily&bucketview=aggregate&metric=real&tpsl=all&slmode=with-sl&zonal=with-zonal'
        })

        expect(await screen.findByRole('heading', { name: 'Policy Branch Mega' })).toBeInTheDocument()
        expect(screen.getByText('Срез истории')).toBeInTheDocument()
        expect(screen.getByText('Хвост OOS')).toBeInTheDocument()
        expect(screen.queryByText('Loading data')).not.toBeInTheDocument()

        const backgroundPayloadQueries = useQueriesMock.mock.calls[0]?.[0]?.queries
        expect(backgroundPayloadQueries).toHaveLength(3)
        expect(backgroundPayloadQueries?.map((query: { queryKey: unknown }) => query.queryKey)).toEqual([
            [
                'backtest',
                'policy-branch-mega',
                'payload',
                'full_history',
                'daily',
                'aggregate',
                'real',
                2,
                'all',
                'with-sl',
                'with-zonal'
            ],
            [
                'backtest',
                'policy-branch-mega',
                'payload',
                'full_history',
                'daily',
                'aggregate',
                'real',
                3,
                'all',
                'with-sl',
                'with-zonal'
            ],
            [
                'backtest',
                'policy-branch-mega',
                'payload',
                'full_history',
                'daily',
                'aggregate',
                'real',
                4,
                'all',
                'with-sl',
                'with-zonal'
            ]
        ])
    })

    test('спокойно рендерит funding-колонки в part 2 без unexpected columns error', async () => {
        primarySectionsMock = [buildPart2FundingSection()]
        variantSelectionMock = buildVariantSelection('2')
        useQueriesMock.mockReturnValue([])

        render(<PolicyBranchMegaPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/policy-branch-mega?history=full_history&bucket=daily&bucketview=aggregate&metric=real&tpsl=all&slmode=with-sl&zonal=with-zonal&part=2'
        })

        expect(await screen.findByRole('heading', { name: 'Policy Branch Mega' })).toBeInTheDocument()
        expect(screen.queryByText(/Failed to prepare policy branch mega sections/i)).not.toBeInTheDocument()
    })

    test('спокойно принимает backend-порядок part 1, где TotalPnl% идёт сразу после конфигурации', async () => {
        useQueriesMock.mockReturnValue([])

        render(<PolicyBranchMegaPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/policy-branch-mega?history=full_history&bucket=daily&bucketview=aggregate&metric=real&tpsl=all&slmode=with-sl&zonal=with-zonal&part=1'
        })

        expect(await screen.findByRole('heading', { name: 'Policy Branch Mega' })).toBeInTheDocument()
        expect(screen.queryByText(/Failed to prepare policy branch mega sections/i)).not.toBeInTheDocument()
    })

    test('спокойно принимает mixed part 1, где SL Mode остаётся внутри конфигурационного блока', async () => {
        primarySectionsMock = [
            {
                ...buildPart1Section(),
                title: 'Policy Branch Mega [Daily] WITH SL + NO SL [PART 1/4]',
                columns: ['Policy', 'Branch', 'SL Mode', 'TotalPnl%', 'Wealth%', 'Tr'],
                columnKeys: ['policy_name', 'branch', 'sl_mode', 'total_pnl_pct', 'wealth_pct', 'trades'],
                rows: [['const_2x', 'BASE', 'WITH SL', '1.00', '1.00', '3']],
                metadata: {
                    ...buildPart1Section().metadata,
                    mode: 'all'
                }
            }
        ]
        variantSelectionMock = {
            ...buildVariantSelection('1'),
            selection: {
                ...buildVariantSelection('1').selection,
                slmode: 'all'
            }
        }
        useQueriesMock.mockReturnValue([])

        render(<PolicyBranchMegaPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/policy-branch-mega?history=full_history&bucket=daily&bucketview=aggregate&metric=real&tpsl=all&slmode=all&zonal=with-zonal&part=1'
        })

        expect(await screen.findByRole('heading', { name: 'Policy Branch Mega' })).toBeInTheDocument()
        expect(screen.queryByText(/Failed to prepare policy branch mega sections/i)).not.toBeInTheDocument()
    })
})
