import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import RealForecastJournalPage from './RealForecastJournalPage'
import { logError } from '@/shared/lib/logging/logError'

const {
    useRealForecastJournalDayListQuery,
    useRealForecastJournalDayQuery,
    useRealForecastJournalLiveStatusQuery,
    useRealForecastJournalOpsStatusQuery,
    useAggregationMetricsQuery,
    useBacktestConfidenceRiskReportQuery,
    useCurrentPredictionBackfilledTrainingScopeStatsQuery
} = vi.hoisted(() => ({
    useRealForecastJournalDayListQuery: vi.fn(),
    useRealForecastJournalDayQuery: vi.fn(),
    useRealForecastJournalLiveStatusQuery: vi.fn(),
    useRealForecastJournalOpsStatusQuery: vi.fn(),
    useAggregationMetricsQuery: vi.fn(),
    useBacktestConfidenceRiskReportQuery: vi.fn(),
    useCurrentPredictionBackfilledTrainingScopeStatsQuery: vi.fn()
}))
const FIXED_SPLIT_INITIAL_STATE = {
    mode: {
        activeMode: 'directional_fixed_split' as const
    }
}

vi.mock('@/shared/api/tanstackQueries/realForecastJournal', () => ({
    useRealForecastJournalDayListQuery,
    useRealForecastJournalDayQuery,
    useRealForecastJournalLiveStatusQuery,
    useRealForecastJournalOpsStatusQuery
}))

vi.mock('@/shared/api/tanstackQueries/aggregation', () => ({
    useAggregationMetricsQuery
}))

vi.mock('@/shared/api/tanstackQueries/backtestConfidenceRisk', () => ({
    useBacktestConfidenceRiskReportQuery
}))

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

function createReportDocument(overrides: Record<string, unknown> = {}) {
    return {
        schemaVersion: 1,
        id: 'report-1',
        kind: 'current_prediction_history',
        title: 'Report',
        generatedAtUtc: '2026-03-10T14:30:00.000Z',
        sections: [],
        ...overrides
    }
}

function createPolicyRow(overrides: Record<string, unknown> = {}) {
    return {
        policyName: 'const_2x_cross',
        branch: 'BASE',
        bucket: 'daily',
        margin: 'cross',
        isSpotPolicy: false,
        isRiskDay: false,
        hasDirection: true,
        skipped: false,
        direction: 'long',
        leverage: 2,
        entry: 150,
        slPct: 0.02,
        tpPct: 0.04,
        slPrice: 147,
        tpPrice: 156,
        notionalUsd: 200,
        positionQty: 1.33,
        liqPrice: 120,
        liqDistPct: 0.2,
        bucketCapitalUsd: 1000,
        stakeUsd: 100,
        stakePct: 0.1,
        exitPrice: null,
        exitReason: '',
        exitPnlPct: null,
        trades: null,
        totalPnlPct: null,
        maxDdPct: null,
        hadLiquidation: null,
        withdrawnTotal: null,
        ...overrides
    }
}

function createSnapshot(overrides: Record<string, unknown> = {}) {
    return {
        generatedAtUtc: '2026-03-10T14:30:00.000Z',
        predictionDateUtc: '2026-03-10',
        asOfUtc: '2026-03-10T14:30:00.000Z',
        dataCutoffUtc: '2026-03-10T14:29:00.000Z',
        entryUtc: '2026-03-10T14:30:00.000Z',
        exitUtc: '2026-03-11T20:00:00.000Z',
        predLabel: 1,
        predLabelDisplay: 'UP',
        microDisplay: 'up',
        pTotal: { up: 0.72, flat: 0.1, down: 0.18 },
        confDay: 0.72,
        confMicro: 0.64,
        entry: 150,
        minMove: 0.01,
        reason: 'Morning snapshot',
        previewNote: null,
        actualDay: null,
        policyRows: [createPolicyRow()],
        ...overrides
    }
}

function createIndicatorSnapshot(
    phase: string,
    numericValue: number,
    displayValue: string,
    overrides: Record<string, unknown> = {}
) {
    return {
        phase,
        anchorUtc: '2026-03-10T14:30:00.000Z',
        featureBarOpenUtc: '2026-03-10T14:00:00.000Z',
        featureBarCloseUtc: '2026-03-10T14:29:00.000Z',
        indicatorDayUtc: '2026-03-10',
        items: [
            {
                key: 'ema20',
                group: 'Trend',
                label: 'EMA 20',
                numericValue,
                displayValue,
                unit: '$'
            }
        ],
        ...overrides
    }
}

function createDayRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: 'day-1',
        runKind: 'main',
        status: 'finalized',
        trainingScope: 'oos',
        predictionDateUtc: '2026-03-10',
        capturedAtUtc: '2026-03-10T14:30:00.000Z',
        entryUtc: '2026-03-10T14:30:00.000Z',
        exitUtc: '2026-03-11T20:00:00.000Z',
        forecastHash: 'forecast-hash',
        forecastSnapshot: createSnapshot(),
        forecastReport: createReportDocument(),
        sessionOpenIndicators: createIndicatorSnapshot('session-open', 150, '150.0000'),
        finalize: {
            finalizedAtUtc: '2026-03-11T20:30:00.000Z',
            forecastHash: 'forecast-hash',
            snapshot: createSnapshot({
                actualDay: {
                    trueLabel: 1,
                    entry: 150,
                    maxHigh24: 160,
                    minLow24: 145,
                    close24: 158,
                    minMove: 0.01
                },
                policyRows: [
                    createPolicyRow({
                        exitPrice: 158,
                        exitReason: 'Take profit',
                        exitPnlPct: 0.04,
                        trades: 1,
                        totalPnlPct: 0.04,
                        maxDdPct: 0.01,
                        hadLiquidation: false,
                        withdrawnTotal: 0
                    })
                ]
            }),
            report: createReportDocument({
                id: 'report-finalized',
                title: 'Finalized report'
            }),
            endOfDayIndicators: createIndicatorSnapshot('close', 158, '158.0000')
        },
        ...overrides
    }
}

function createDayList() {
    return [
        {
            id: 'day-1',
            runKind: 'main',
            predictionDateUtc: '2026-03-10',
            status: 'finalized',
            trainingScope: 'oos',
            capturedAtUtc: '2026-03-10T14:30:00.000Z',
            entryUtc: '2026-03-10T14:30:00.000Z',
            exitUtc: '2026-03-11T20:00:00.000Z',
            finalizedAtUtc: '2026-03-11T20:30:00.000Z',
            predictedDirection: 'UP',
            predLabelDisplay: 'UP',
            microDisplay: 'up',
            totalUpProbability: 0.72,
            totalFlatProbability: 0.1,
            totalDownProbability: 0.18,
            dayConfidence: 0.72,
            microConfidence: 0.64,
            actualDirection: 'UP',
            directionMatched: true
        }
    ]
}

function createLiveStatus() {
    return {
        runKind: 'main',
        predictionDateUtc: '2026-03-10',
        checkedAtUtc: '2026-03-10T15:00:00.000Z',
        currentPrice: 152,
        currentPriceObservedAtUtc: '2026-03-10T15:00:00.000Z',
        minuteObservationStartUtc: '2026-03-10T14:31:00.000Z',
        minuteObservationThroughUtc: '2026-03-10T14:59:00.000Z',
        rows: []
    }
}

function createOpsStatus() {
    return {
        runKind: 'main',
        health: 'healthy',
        statusReason: 'healthy',
        checkedAtUtc: '2026-03-10T15:00:00.000Z',
        pollIntervalSeconds: 60,
        workerStartedAtUtc: '2026-03-10T14:00:00.000Z',
        lastLoopStartedAtUtc: '2026-03-10T14:59:00.000Z',
        lastLoopCompletedAtUtc: '2026-03-10T15:00:00.000Z',
        workerHeartbeatStale: false,
        consecutiveFailureCount: 0,
        lastFailureAtUtc: null,
        lastFailureStage: null,
        lastFailureMessage: null,
        lastSuccessfulCapture: null,
        lastSuccessfulFinalize: null,
        activeRecordCount: 1,
        archiveRecordCount: 5,
        expectedCaptureDayUtc: '2026-03-11',
        expectedCaptureTargetUtc: '2026-03-11T13:30:00.000Z',
        nextCaptureDayUtc: '2026-03-11',
        nextCaptureTargetUtc: '2026-03-11T13:30:00.000Z',
        captureWindowClosed: false,
        hasRecordForExpectedCaptureDay: false,
        captureOverdue: false,
        activePendingDayUtc: null,
        activePendingExitUtc: null,
        activePendingFinalizeDueUtc: null,
        readyToFinalizeCount: 0,
        oldestReadyToFinalizeDayUtc: null
    }
}

function createAggregationMetrics() {
    const layer = {
        layerName: 'Total',
        confusion: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ],
        n: 10,
        correct: 6,
        accuracy: 0.6,
        microF1: 0.6,
        logLoss: 0.65,
        invalidForLogLoss: 0,
        validForLogLoss: 10
    }

    return {
        totalInputRecords: 10,
        excludedCount: 0,
        segments: [
            {
                segmentName: 'oos',
                segmentLabel: 'OOS benchmark',
                fromDateUtc: null,
                toDateUtc: null,
                recordsCount: 10,
                day: layer,
                dayMicro: layer,
                total: layer
            }
        ]
    }
}

function createConfidenceRiskReport() {
    return createReportDocument({
        id: 'confidence-risk',
        kind: 'backtest_confidence_risk',
        title: 'Confidence risk',
        sections: [
            {
                title: 'Config',
                sectionKey: 'confidence_risk_config',
                items: [{ itemKey: 'source', key: 'Source', value: 'day' }]
            },
            {
                title: 'Buckets',
                sectionKey: 'confidence_buckets',
                columns: ['Split', 'Bucket', 'From', 'To', 'Avg', 'Trade days', 'Win rate'],
                columnKeys: [
                    'split',
                    'bucket',
                    'confidence_from_pct',
                    'confidence_to_pct',
                    'confidence_average_pct',
                    'trade_days',
                    'win_rate_pct'
                ],
                rows: [
                    ['oos', 'B60', '60', '80', '70', '10', '65'],
                    ['oos', 'B80', '80', '100', '90', '12', '75']
                ]
            }
        ]
    })
}

function mockSuccessfulQueries() {
    useRealForecastJournalDayListQuery.mockReturnValue(
        createQueryResult({
            data: createDayList(),
            refetch: vi.fn()
        })
    )
    useRealForecastJournalDayQuery.mockReturnValue(
        createQueryResult({
            data: createDayRecord(),
            refetch: vi.fn()
        })
    )
    useRealForecastJournalLiveStatusQuery.mockReturnValue(
        createQueryResult({
            data: createLiveStatus(),
            refetch: vi.fn()
        })
    )
    useRealForecastJournalOpsStatusQuery.mockReturnValue(
        createQueryResult({
            data: createOpsStatus(),
            refetch: vi.fn()
        })
    )
    useAggregationMetricsQuery.mockReturnValue(
        createQueryResult({
            data: createAggregationMetrics(),
            refetch: vi.fn()
        })
    )
    useBacktestConfidenceRiskReportQuery.mockReturnValue(
        createQueryResult({
            data: createConfidenceRiskReport(),
            refetch: vi.fn()
        })
    )
}

describe('RealForecastJournalPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
        clearLoggedSectionKeys()
        vi.clearAllMocks()
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

        useRealForecastJournalDayListQuery.mockReturnValue(
            createQueryResult({
                isError: true,
                error: new Error('Failed to load real forecast journal index: 500'),
                refetch: vi.fn()
            })
        )
        useRealForecastJournalDayQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
        useRealForecastJournalLiveStatusQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
        useRealForecastJournalOpsStatusQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
        useAggregationMetricsQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
        useBacktestConfidenceRiskReportQuery.mockReturnValue(
            createQueryResult({
                refetch: vi.fn()
            })
        )
    })

    test('keeps page shell visible when journal day list request fails', async () => {
        render(<RealForecastJournalPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/real-forecast-journal'
        })

        expect(screen.getByText('Real forecast journal and realized day outcome')).toBeInTheDocument()
        expect(screen.getByText('Upcoming journal updates')).toBeInTheDocument()
        expect(screen.getByText('Captured trading days')).toBeInTheDocument()
        expect(screen.getByText('Failed to load the real forecast journal')).toBeInTheDocument()
        expect(screen.getByText('Live sample vs historical benchmark')).toBeInTheDocument()

        await waitFor(() => {
            expect(vi.mocked(logError)).toHaveBeenCalledWith(
                expect.any(Error),
                undefined,
                expect.objectContaining({ source: 'real-forecast-journal-day-list' })
            )
        })
    })

    test('renders terms blocks for policy and aggregation comparison by default', () => {
        mockSuccessfulQueries()

        render(<RealForecastJournalPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/real-forecast-journal'
        })

        expect(screen.getAllByText('Section terms')).toHaveLength(2)
        expect(screen.queryByText('Indicator value diff')).not.toBeInTheDocument()
    })

    test('loads main forecasts by default and switches journal queries to preliminary forecasts', async () => {
        mockSuccessfulQueries()

        render(<RealForecastJournalPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/real-forecast-journal'
        })

        expect(useRealForecastJournalDayListQuery).toHaveBeenCalledWith(
            { runKind: 'main' },
            { enabled: true }
        )
        expect(useRealForecastJournalDayQuery).toHaveBeenCalledWith(
            { dateUtc: '2026-03-10', runKind: 'main' },
            { enabled: true }
        )
        expect(useRealForecastJournalOpsStatusQuery).toHaveBeenCalledWith(
            { runKind: 'main' }
        )

        fireEvent.click(screen.getByRole('button', { name: 'Preliminary forecasts' }))

        await waitFor(() => {
            expect(useRealForecastJournalDayListQuery).toHaveBeenLastCalledWith(
                { runKind: 'preliminary' },
                { enabled: true }
            )
            expect(useRealForecastJournalOpsStatusQuery).toHaveBeenLastCalledWith(
                { runKind: 'preliminary' }
            )
        })
    }, 20_000)

    test('shows indicator terms block only after the detailed block is opened', () => {
        mockSuccessfulQueries()

        render(<RealForecastJournalPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/real-forecast-journal'
        })

        expect(screen.getAllByText('Section terms')).toHaveLength(2)

        fireEvent.click(screen.getByRole('button', { name: 'Show detailed indicator block' }))

        expect(screen.getByText('Indicator value diff')).toBeInTheDocument()
        expect(screen.getAllByText('Section terms')).toHaveLength(3)
    }, 20_000)

    test('renders confidence-risk terms blocks when comparison source is switched', () => {
        mockSuccessfulQueries()

        render(<RealForecastJournalPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/real-forecast-journal?source=confidence-risk'
        })

        expect(screen.getAllByText('Section terms')).toHaveLength(3)
    })

    test('shows every published policy row by default, including spot policies', async () => {
        mockSuccessfulQueries()
        useRealForecastJournalDayQuery.mockReturnValue(
            createQueryResult({
                data: createDayRecord({
                    forecastSnapshot: createSnapshot({
                        policyRows: [
                            createPolicyRow(),
                            createPolicyRow({
                                policyName: 'spot_fixed1pct',
                                branch: 'BASE',
                                bucket: 'intraday',
                                margin: null,
                                isSpotPolicy: true,
                                leverage: 1,
                                notionalUsd: 100,
                                liqPrice: null,
                                liqDistPct: null
                            }),
                            createPolicyRow({
                                policyName: 'const_4x_cross',
                                branch: 'AGG',
                                bucket: 'delayed',
                                leverage: 4
                            })
                        ]
                    }),
                    finalize: {
                        ...createDayRecord().finalize,
                        snapshot: createSnapshot({
                            actualDay: {
                                trueLabel: 1,
                                entry: 150,
                                maxHigh24: 160,
                                minLow24: 145,
                                close24: 158,
                                minMove: 0.01
                            },
                            policyRows: [
                                createPolicyRow({
                                    exitPrice: 158,
                                    exitReason: 'Take profit',
                                    exitPnlPct: 0.04,
                                    trades: 1,
                                    totalPnlPct: 0.04,
                                    maxDdPct: 0.01,
                                    hadLiquidation: false,
                                    withdrawnTotal: 0
                                }),
                                createPolicyRow({
                                    policyName: 'spot_fixed1pct',
                                    branch: 'BASE',
                                    bucket: 'intraday',
                                    margin: null,
                                    isSpotPolicy: true,
                                    leverage: 1,
                                    notionalUsd: 100,
                                    liqPrice: null,
                                    liqDistPct: null,
                                    exitPrice: 151,
                                    exitReason: 'EndOfDay',
                                    exitPnlPct: 0.01,
                                    trades: 1,
                                    totalPnlPct: 0.01,
                                    maxDdPct: 0.005,
                                    hadLiquidation: false,
                                    withdrawnTotal: 0
                                }),
                                createPolicyRow({
                                    policyName: 'const_4x_cross',
                                    branch: 'AGG',
                                    bucket: 'delayed',
                                    leverage: 4,
                                    exitPrice: 149,
                                    exitReason: 'Stop loss',
                                    exitPnlPct: -0.02,
                                    trades: 1,
                                    totalPnlPct: -0.02,
                                    maxDdPct: 0.03,
                                    hadLiquidation: false,
                                    withdrawnTotal: 0
                                })
                            ]
                        }),
                        report: createReportDocument({
                            id: 'report-finalized',
                            title: 'Finalized report'
                        }),
                        endOfDayIndicators: createIndicatorSnapshot('close', 158, '158.0000')
                    }
                }),
                refetch: vi.fn()
            })
        )

        render(<RealForecastJournalPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/real-forecast-journal'
        })

        await screen.findByText('spot_fixed1pct')
        expect(screen.getByText('const_4x_cross')).toBeInTheDocument()
    })

    test('removes fake SL controls, hides duplicated control hints, and drops the margin column from the policy table', () => {
        mockSuccessfulQueries()

        render(<RealForecastJournalPage />, {
            initialState: FIXED_SPLIT_INITIAL_STATE,
            route: '/analysis/real-forecast-journal'
        })

        expect(screen.queryByRole('button', { name: 'With SL' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'No SL' })).not.toBeInTheDocument()
        expect(screen.queryByText('Margin mode')).not.toBeInTheDocument()
        expect(screen.queryByText(/days the model had not seen during training/i)).not.toBeInTheDocument()
    }, 20_000)
})
