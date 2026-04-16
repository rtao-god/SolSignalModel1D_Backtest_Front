import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import ConfidenceRiskPage from './ConfidenceRiskPage'
import { logError } from '@/shared/lib/logging/logError'

const { useBacktestConfidenceRiskReportQuery } = vi.hoisted(() => ({
    useBacktestConfidenceRiskReportQuery: vi.fn()
}))
const { usePublishedReportVariantCatalogQuery } = vi.hoisted(() => ({
    usePublishedReportVariantCatalogQuery: vi.fn()
}))
const { useCurrentPredictionBackfilledTrainingScopeStatsQuery } = vi.hoisted(() => ({
    useCurrentPredictionBackfilledTrainingScopeStatsQuery: vi.fn()
}))
const FIXED_SPLIT_INITIAL_STATE = {
    mode: {
        activeMode: 'directional_fixed_split' as const
    }
}

vi.mock('@/shared/api/tanstackQueries/backtestConfidenceRisk', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/backtestConfidenceRisk')>()

    return {
        ...actual,
        useBacktestConfidenceRiskReportQuery
    }
})

vi.mock('@/shared/api/tanstackQueries/reportVariants', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/reportVariants')>()

    return {
        ...actual,
        usePublishedReportVariantCatalogQuery
    }
})

vi.mock('@/shared/api/tanstackQueries/currentPrediction', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/api/tanstackQueries/currentPrediction')>()

    return {
        ...actual,
        useCurrentPredictionBackfilledTrainingScopeStatsQuery
    }
})

vi.mock('@/shared/lib/logging/logError', async importOriginal => {
    const actual = await importOriginal<typeof import('@/shared/lib/logging/logError')>()

    return {
        ...actual,
        logError: vi.fn()
    }
})

function createQueryResult<T>(overrides: Record<string, unknown> = {}) {
    return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        ...overrides
    } as T
}

function clearLoggedSectionKeys() {
    const globalWithSectionKeys = globalThis as typeof globalThis & {
        __sectionDataStateLoggedKeys?: Set<string>
    }

    globalWithSectionKeys.__sectionDataStateLoggedKeys?.clear()
}

function createConfidenceRiskReportData() {
    return {
        id: 'backtest-confidence-risk-test',
        kind: 'backtest_confidence_risk',
        title: 'Backtest Confidence Risk (buckets)',
        generatedAtUtc: '2026-03-11T12:00:00.000Z',
        sections: [
            {
                title: 'Confidence risk config',
                items: [
                    { key: 'Source', value: 'Total' },
                    { key: 'ConfidenceMin', value: '0.500' },
                    { key: 'ConfidenceMax', value: '0.700' },
                    { key: 'ConfidenceBucketRange', value: '0.500..1.000 (width=0.050, count=10)' },
                    { key: 'CapFractionMultiplier', value: '0.80..1.20' },
                    { key: 'RecentDays', value: '120' }
                ]
            },
            {
                title: 'Confidence buckets',
                columns: [
                    'Split',
                    'Bucket',
                    'ConfidenceFrom%',
                    'ConfidenceTo%',
                    'Days',
                    'TradeDays',
                    'TradeRate%',
                    'ConfidenceAvg%',
                    'MFE_Avg%',
                    'MFE_P50%',
                    'MFE_P90%',
                    'MAE_Avg%',
                    'MAE_P50%',
                    'MAE_P90%',
                    'TakeProfitReach%',
                    'StopLossReach%',
                    'WinRate%'
                ],
                rows: [
                    [
                        'FULL',
                        'B00',
                        '50.00',
                        '55.00',
                        '117',
                        '117',
                        '100.00',
                        '52.59',
                        '4.79',
                        '2.88',
                        '10.54',
                        '4.48',
                        '2.82',
                        '10.24',
                        '48.72',
                        '31.62',
                        '51.28'
                    ]
                ]
            }
        ]
    }
}

function createVariantCatalog() {
    return {
        family: 'backtest_confidence_risk',
        sourceReportKind: 'backtest_confidence_risk',
        sourceReportId: 'catalog-1',
        publishedAtUtc: '2026-03-11T12:00:00.000Z',
        axes: [
            {
                key: 'scope',
                defaultValue: 'full',
                options: [
                    { value: 'full', label: 'Full' },
                    { value: 'oos', label: 'OOS' },
                    { value: 'train', label: 'Train' },
                    { value: 'recent', label: 'Recent' }
                ]
            },
            {
                key: 'confBucket',
                defaultValue: 'all',
                options: [
                    { value: 'all', label: 'All buckets' },
                    { value: 'B00', label: 'B00' }
                ]
            }
        ],
        variants: [
            {
                key: 'full-all',
                selection: {
                    scope: 'full',
                    confBucket: 'all'
                },
                artifacts: {
                    report: 'full-all.json'
                }
            },
            {
                key: 'oos-all',
                selection: {
                    scope: 'oos',
                    confBucket: 'all'
                },
                artifacts: {
                    report: 'oos-all.json'
                }
            }
        ]
    }
}

describe('ConfidenceRiskPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
        clearLoggedSectionKeys()
        vi.clearAllMocks()
        usePublishedReportVariantCatalogQuery.mockReturnValue(
            createQueryResult({
                data: createVariantCatalog()
            })
        )
        useCurrentPredictionBackfilledTrainingScopeStatsQuery.mockReturnValue(
            createQueryResult({
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
        )
        useBacktestConfidenceRiskReportQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
    })

    test('keeps hero and terms visible when scope query is invalid', async () => {
        render(<ConfidenceRiskPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/confidence-risk?scope=broken'
        })

        expect(screen.getByText('Confidence and TP/SL')).toBeInTheDocument()
        expect(screen.getByText('Definitions for all indicators used in the confidence table.')).toBeInTheDocument()
        expect(screen.getByText('Confidence risk scope query is invalid')).toBeInTheDocument()
        expect(screen.queryByText('Failed to load confidence risk report')).not.toBeInTheDocument()

        await waitFor(() => {
            expect(vi.mocked(logError)).toHaveBeenCalledWith(
                expect.any(Error),
                undefined,
                expect.objectContaining({ source: 'confidence-risk-controls' })
            )
        })
    })

    test('does not treat missing bucket options as an error while report query is still loading', () => {
        useBacktestConfidenceRiskReportQuery.mockReturnValue(
            createQueryResult({
                isLoading: true,
                refetch: vi.fn()
            })
        )

        render(<ConfidenceRiskPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/confidence-risk'
        })

        expect(screen.getByText('Confidence and TP/SL')).toBeInTheDocument()
        expect(screen.queryByText('Confidence risk bucket options are missing')).not.toBeInTheDocument()
        expect(screen.queryByText('Failed to load confidence risk report')).not.toBeInTheDocument()
    })

    test('renders current backend confidence-risk names without runtime term errors', async () => {
        useBacktestConfidenceRiskReportQuery.mockReturnValue(
            createQueryResult({
                data: createConfidenceRiskReportData(),
                refetch: vi.fn()
            })
        )

        render(<ConfidenceRiskPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/confidence-risk'
        })

        await waitFor(() => {
            expect(screen.getAllByText('ConfidenceFrom%').length).toBeGreaterThan(0)
        })

        expect(screen.getByText('ConfidenceMin')).toBeInTheDocument()
        expect(screen.getByText('RecentDays')).toBeInTheDocument()
        expect(screen.queryByText('Failed to load confidence risk report')).not.toBeInTheDocument()
    })
})
