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
        columns: [
            'Policy',
            'Branch',
            'TotalPnl%',
            'TotalPnlUsd',
            'Comm$',
            'Comm%',
            'TradesCount',
            'EODExit_n',
            'EODExit%',
            'EODExit$',
            'EODExitPnl%'
        ],
        columnKeys: [
            'policy_name',
            'branch',
            'total_pnl_pct',
            'total_pnl_usd',
            'comm_usd',
            'comm_pct',
            'trades_count',
            'eod_exit_n',
            'eod_exit_share_pct',
            'eod_exit_usd',
            'eod_exit_pnl_pct'
        ],
        rows: [['const_2x', 'BASE', '1.00', '120.00', '8.00', '0.40', '3', '1', '33.3', '-12.00', '-0.06']],
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
            'TradesWithFundingCount',
            'FundingEventCount',
            'FundingNetUsd',
            'FundingPaidUsd',
            'FundingReceivedUsd',
            'FundingLiq_n',
            'FundingDeath_n',
            'FundingMixedDeath_n'
        ],
        columnKeys: [
            'policy_name',
            'branch',
            'trades_with_funding_count',
            'funding_event_count',
            'funding_net_usd',
            'funding_paid_usd',
            'funding_received_usd',
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
const MONEY_METRIC_DESCRIPTORS = [
    { metricKey: 'TradesCount', displayLabel: 'TradesCount', valueKind: 'count', unit: 'count' },
    { metricKey: 'TotalPnlPct', displayLabel: 'TotalPnl%', valueKind: 'percent', unit: 'percent' },
    { metricKey: 'TotalPnlUsd', displayLabel: 'TotalPnlUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'MaxDdPct', displayLabel: 'MaxDD%', valueKind: 'percent', unit: 'percent' },
    { metricKey: 'StartCapitalUsd', displayLabel: 'StartCapitalUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'EquityNowUsd', displayLabel: 'EquityNowUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'WithdrawnTotalUsd', displayLabel: 'WithdrawnTotalUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'FundingNetUsd', displayLabel: 'FundingNetUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'FundingPaidUsd', displayLabel: 'FundingPaidUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'FundingReceivedUsd', displayLabel: 'FundingReceivedUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'FundingEventCount', displayLabel: 'FundingEventCount', valueKind: 'count', unit: 'count' },
    { metricKey: 'TradesWithFundingCount', displayLabel: 'TradesWithFundingCount', valueKind: 'count', unit: 'count' },
    { metricKey: 'EffectiveMaxDdPct', displayLabel: 'EffectiveMaxDD%', valueKind: 'percent', unit: 'percent' },
    { metricKey: 'Sharpe', displayLabel: 'Sharpe', valueKind: 'decimal', unit: 'decimal' },
    { metricKey: 'WinRate', displayLabel: 'WinRate%', valueKind: 'percent', unit: 'percent' },
    { metricKey: 'HadLiquidation', displayLabel: 'HadLiquidation', valueKind: 'boolean', unit: 'boolean' },
    { metricKey: 'RealLiquidationCount', displayLabel: 'RealLiquidationCount', valueKind: 'count', unit: 'count' },
    { metricKey: 'FundingLiquidationCount', displayLabel: 'FundingLiquidationCount', valueKind: 'count', unit: 'count' },
    { metricKey: 'FundingBucketDeathCount', displayLabel: 'FundingBucketDeathCount', valueKind: 'count', unit: 'count' },
    { metricKey: 'MixedBucketDeathCount', displayLabel: 'MixedBucketDeathCount', valueKind: 'count', unit: 'count' },
    { metricKey: 'AccountRuinCount', displayLabel: 'AccountRuinCount', valueKind: 'count', unit: 'count' },
    { metricKey: 'BalanceDead', displayLabel: 'BalanceDead', valueKind: 'boolean', unit: 'boolean' }
]
let modeMoneySummaryDataMock: { moneyMetricDescriptors: unknown[]; rows: unknown[] } | null = null

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
            data: modeMoneySummaryDataMock,
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
        modeMoneySummaryDataMock = null
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
                columns: ['Policy', 'Branch', 'SL Mode', 'TotalPnl%', 'TradesCount'],
                columnKeys: ['policy_name', 'branch', 'sl_mode', 'total_pnl_pct', 'trades_count'],
                rows: [['const_2x', 'BASE', 'WITH SL', '1.00', '3']],
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

    test('показывает компактную лучшую policy и ликвидации только для активного режима и выбранного среза', async () => {
        modeMoneySummaryDataMock = {
            moneyMetricDescriptors: MONEY_METRIC_DESCRIPTORS,
            rows: [
                {
                    modeKey: 'directional_fixed_split',
                    sliceKey: 'full',
                    policyName: 'spot_conf_cap',
                    policyBranch: 'BASE',
                    executionDescriptor: 'daily · with sl',
                    moneySourceKind: 'policy_universe_best_policy',
                    sourceStatus: 'available',
                    statusMessage: 'published best policy',
                    comparabilityNote: 'same fixed-split slice',
                    tradingStartDateUtc: '2021-10-12',
                    tradingEndDateUtc: '2026-04-10',
                    completedDayCount: 100,
                    tradeCount: 24,
                    maxDrawdownPct: 12.34,
                    sourceLocationHint: '/reports/policy-branch-mega/full',
                    predictionQualityMetrics: [
                        {
                            metricKey: 'technical_accuracy_pct',
                            unit: 'percent',
                            value: 58.5
                        }
                    ],
                    diagnostic: null,
                    moneyMetrics: {
                        totalPnlPct: 18.45,
                        totalPnlUsd: 1845.12,
                        maxDdNoLiqPct: 12.34,
                        mean: 0.1,
                        std: 0.2,
                        downStd: 0.15,
                        startCapitalUsd: 10000,
                        onExchPct: 18.4512,
                        equityNowUsd: 11845.12,
                        withdrawnTotalUsd: 0,
                        fundingNetUsd: -32.2,
                        fundingPaidUsd: 42.1,
                        fundingReceivedUsd: 9.9,
                        fundingEventCount: 3,
                        tradesWithFundingCount: 2,
                        maxDdPct: 12.34,
                        sharpe: 1.234,
                        sortino: 1.5,
                        cagr: 0.22,
                        calmar: 1.2,
                        winRate: 0.58,
                        tradesCount: 24,
                        hadLiquidation: false,
                        realLiquidationCount: 0,
                        fundingLiquidationCount: 0,
                        fundingBucketDeathCount: 0,
                        mixedBucketDeathCount: 0,
                        accountRuinCount: 0,
                        balanceDead: false
                    }
                },
                {
                    modeKey: 'tbm_native',
                    sliceKey: 'full',
                    policyName: 'tbm_policy',
                    policyBranch: 'BASE',
                    executionDescriptor: 'delayed',
                    moneySourceKind: 'canonical_strategy',
                    sourceStatus: 'available',
                    statusMessage: 'published best policy',
                    comparabilityNote: 'other mode',
                    tradingStartDateUtc: '2021-10-12',
                    tradingEndDateUtc: '2026-04-10',
                    completedDayCount: 100,
                    tradeCount: 20,
                    maxDrawdownPct: 22.5,
                    sourceLocationHint: '/reports/tbm/full',
                    predictionQualityMetrics: [
                        {
                            metricKey: 'tbm_hit_rate_pct',
                            unit: 'percent',
                            value: 51
                        }
                    ],
                    diagnostic: null,
                    moneyMetrics: {
                        totalPnlPct: 5,
                        totalPnlUsd: 500,
                        maxDdNoLiqPct: 22.5,
                        mean: 0.05,
                        std: 0.2,
                        downStd: 0.18,
                        startCapitalUsd: 10000,
                        onExchPct: 5,
                        equityNowUsd: 10500,
                        withdrawnTotalUsd: 0,
                        fundingNetUsd: 0,
                        fundingPaidUsd: 0,
                        fundingReceivedUsd: 0,
                        fundingEventCount: 0,
                        tradesWithFundingCount: 0,
                        maxDdPct: 22.5,
                        sharpe: 0.6,
                        sortino: 0.7,
                        cagr: 0.08,
                        calmar: 0.22,
                        winRate: 0.51,
                        tradesCount: 20,
                        hadLiquidation: true,
                        realLiquidationCount: 1,
                        fundingLiquidationCount: 0,
                        fundingBucketDeathCount: 0,
                        mixedBucketDeathCount: 0,
                        accountRuinCount: 0,
                        balanceDead: false
                    }
                }
            ]
        }
        useQueriesMock.mockReturnValue([])

        render(<PolicyBranchMegaPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/policy-branch-mega?history=full_history&bucket=daily&bucketview=aggregate&metric=real&tpsl=all&slmode=with-sl&zonal=with-zonal&part=1'
        })

        expect((await screen.findAllByText('spot_conf_cap')).length).toBeGreaterThan(0)
        expect(screen.getAllByText('daily · with sl').length).toBeGreaterThan(0)
        expect(screen.getAllByText('$11,845.12').length).toBeGreaterThan(0)
        expect(screen.queryByText('tbm_policy')).not.toBeInTheDocument()
    })
})
