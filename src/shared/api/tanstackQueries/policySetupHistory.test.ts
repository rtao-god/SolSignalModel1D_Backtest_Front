import {
    parsePolicySetupHistoryPublishedStatusResponse,
    parsePolicySetupCatalogResponse,
    parsePolicySetupLedgerResponse,
    parsePolicySetupCandlesResponse
} from './policySetupHistory'

describe('policySetupHistory parser', () => {
    test('maps catalog payload with UtcDayKey object-form dates', () => {
        const parsed = parsePolicySetupCatalogResponse({
            boundaryManifest: {
                historyDayRange: {
                    fromDateUtc: { isoDate: '2021-10-11' },
                    toDateUtc: { year: 2026, month: 3, day: 18 }
                },
                candleRanges: [
                    {
                        resolution: '3h',
                        dayRange: {
                            fromDateUtc: { isoDate: '2021-10-11' },
                            toDateUtc: { year: 2026, month: 3, day: 18 }
                        }
                    }
                ]
            },
            items: [
                {
                    setupId: 'ps-const-2x-cross-cross-anti-d-daily-with-sl-all-with-zonal-2dcb605d0684',
                    displayLabel: 'const_2x_cross | Cross | ANTI-D | daily | WITH SL | all | with-zonal',
                    policyName: 'const_2x_cross',
                    marginMode: 'Cross',
                    branch: 'ANTI-D',
                    bucket: 'daily',
                    useStopLoss: true,
                    useAntiDirectionOverlay: true,
                    tpSlMode: 'all',
                    zonalMode: 'with-zonal',
                    noTradeDaysCount: 406,
                    performanceMetrics: {
                        tradesCount: 528,
                        totalPnlPct: -11.8,
                        maxDdPct: 12.83,
                        hadLiquidation: false
                    }
                }
            ]
        })

        expect(parsed.boundaryManifest.historyDayRange.fromDateUtc).toBe('2021-10-11')
        expect(parsed.boundaryManifest.historyDayRange.toDateUtc).toBe('2026-03-18')
        expect(parsed.items).toEqual([
            expect.objectContaining({
                policyName: 'const_2x_cross',
                performanceMetrics: expect.objectContaining({
                    tradesCount: 528,
                    totalPnlPct: -11.8,
                    maxDdPct: 12.83,
                    hadLiquidation: false
                })
            })
        ])
    })

    test('maps published status payload with nullable rebuild timestamps', () => {
        const parsed = parsePolicySetupHistoryPublishedStatusResponse({
            state: 'stale',
            message: 'Опубликованный локальный отчёт policy setup отстаёт от текущих owner-источников.',
            canServePublished: true,
            publishedGeneratedAtUtc: { year: 2026, month: 3, day: 20, hour: 8, minute: 30, second: 0 },
            publishedSetupCount: 1908,
            lastRebuildStartedAtUtc: { value: '2026-03-20T08:31:00Z' },
            lastRebuildCompletedAtUtc: null,
            lastRebuildFailedAtUtc: null,
            lastRebuildFailureMessage: null
        })

        expect(parsed).toEqual({
            state: 'stale',
            message: 'Опубликованный локальный отчёт policy setup отстаёт от текущих owner-источников.',
            canServePublished: true,
            publishedGeneratedAtUtc: '2026-03-20T08:30:00.000Z',
            publishedSetupCount: 1908,
            lastRebuildStartedAtUtc: '2026-03-20T08:31:00.000Z',
            lastRebuildCompletedAtUtc: null,
            lastRebuildFailedAtUtc: null,
            lastRebuildFailureMessage: null
        })
    })

    test('maps ledger payload with .NET object-form utc values across setup, range and days', () => {
        const parsed = parsePolicySetupLedgerResponse({
            setup: {
                setupId: 'ps-const-2x-cross-cross-anti-d-daily-with-sl-all-with-zonal-2dcb605d0684',
                displayLabel: 'const_2x_cross | Cross | ANTI-D | daily | WITH SL | all | with-zonal',
                policyName: 'const_2x_cross',
                marginMode: 'Cross',
                branch: 'ANTI-D',
                bucket: 'daily',
                useStopLoss: true,
                useAntiDirectionOverlay: true,
                tpSlMode: 'all',
                zonalMode: 'with-zonal',
                noTradeDaysCount: 406,
                performanceMetrics: {
                    tradesCount: 528,
                    totalPnlPct: -11.8,
                    maxDdPct: 12.83,
                    hadLiquidation: false
                }
            },
            boundaryManifest: {
                historyDayRange: {
                    fromDateUtc: { year: 2021, month: 10, day: 11 },
                    toDateUtc: { year: 2026, month: 3, day: 18 }
                },
                candleRanges: [
                    {
                        resolution: '1m',
                        dayRange: {
                            fromDateUtc: { year: 2021, month: 10, day: 11 },
                            toDateUtc: { year: 2026, month: 3, day: 18 }
                        }
                    },
                    {
                        resolution: '3h',
                        dayRange: {
                            fromDateUtc: { year: 2021, month: 10, day: 11 },
                            toDateUtc: { year: 2026, month: 3, day: 18 }
                        }
                    }
                ]
            },
            appliedRange: {
                fromDateUtc: { value: '2026-01-01' },
                toDateUtc: { value: '2026-03-13' }
            },
            startCapitalUsd: 20000,
            balanceCeilingUsd: 20000,
            visibleBalanceCeilingUsd: 25123.45,
            capitalTimeline: {
                startCapitalUsd: 20000,
                hasWorkingCapitalGap: true,
                firstWorkingCapitalGapDayUtc: { isoDate: '2026-03-10' },
                latestTotalCapitalUsd: 21550,
                latestWorkingCapitalUsd: 19750,
                totalCapitalBaseSeries: [
                    {
                        timeUtc: { year: 2026, month: 3, day: 10, hour: 13, minute: 30, second: 0 },
                        valueUsd: null
                    }
                ],
                totalCapitalProfitSeries: [
                    {
                        timeUtc: { year: 2026, month: 3, day: 10, hour: 18, minute: 45, second: 0 },
                        valueUsd: 21550
                    }
                ],
                workingCapitalGapSeries: [
                    {
                        timeUtc: { year: 2026, month: 3, day: 10, hour: 18, minute: 45, second: 0 },
                        valueUsd: 19750
                    }
                ]
            },
            days: [
                {
                    tradingDayUtc: { isoDate: '2026-03-10' },
                    dayBlockStartUtc: { year: 2026, month: 3, day: 10, hour: 13, minute: 30, second: 0 },
                    dayBlockEndUtc: { year: 2026, month: 3, day: 10, hour: 20, minute: 0, second: 0 },
                    hasTrade: true,
                    noTradeReason: null,
                    noTradeDecision: null,
                    forecastDirection: 'up',
                    forecastLabel: 'рост',
                    direction: 'long',
                    entryTimeUtc: { year: 2026, month: 3, day: 10, hour: 13, minute: 30, second: 0 },
                    exitTimeUtc: { year: 2026, month: 3, day: 10, hour: 18, minute: 45, second: 0 },
                    entryPrice: 134.25,
                    exitPrice: 132.1,
                    exitReason: 'StopLoss',
                    exitPnlPct: -0.021,
                    leverage: 2,
                    stopLossPrice: 132.2,
                    stopLossPct: 0.015,
                    takeProfitPrice: 138.5,
                    takeProfitPct: 0.032,
                    liquidationPrice: null,
                    liquidationDistancePct: null,
                    triggeredStopLoss: true,
                    triggeredTakeProfit: false,
                    triggeredLiquidation: false,
                    triggeredEndOfDay: false,
                    balanceBeforeUsd: 20000,
                    balanceAfterUsd: 19750,
                    withdrawnBeforeUsd: 1800,
                    withdrawnAfterUsd: 1800,
                    visibleBalanceBeforeUsd: 21800,
                    visibleBalanceAfterUsd: 21550,
                    bucketCapitalBeforeUsd: 20000,
                    stakeUsd: 1290,
                    stakePct: 0.0645,
                    notionalUsd: 2580,
                    positionQty: 19.21787709
                }
            ]
        })

        expect(parsed.boundaryManifest.historyDayRange.fromDateUtc).toBe('2021-10-11')
        expect(parsed.boundaryManifest.candleRanges[0].resolution).toBe('1m')
        expect(parsed.appliedRange.toDateUtc).toBe('2026-03-13')
        expect(parsed.days[0]).toMatchObject({
            tradingDayUtc: '2026-03-10',
            dayBlockStartUtc: '2026-03-10T13:30:00.000Z',
            dayBlockEndUtc: '2026-03-10T20:00:00.000Z',
            forecastDirection: 'up',
            forecastLabel: 'рост',
            entryTimeUtc: '2026-03-10T13:30:00.000Z',
            exitTimeUtc: '2026-03-10T18:45:00.000Z'
        })
        expect(parsed.capitalTimeline).toMatchObject({
            startCapitalUsd: 20000,
            hasWorkingCapitalGap: true,
            firstWorkingCapitalGapDayUtc: '2026-03-10',
            latestTotalCapitalUsd: 21550,
            latestWorkingCapitalUsd: 19750
        })
        expect(parsed.capitalTimeline.totalCapitalProfitSeries[0]).toEqual({
            timeUtc: '2026-03-10T18:45:00.000Z',
            valueUsd: 21550
        })
    })

    test('maps candles payload with .NET object-form utc values across range and candles', () => {
        const parsed = parsePolicySetupCandlesResponse({
            setupId: 'ps-const-2x-cross-cross-anti-d-daily-with-sl-all-with-zonal-2dcb605d0684',
            boundaryManifest: {
                historyDayRange: {
                    fromDateUtc: { year: 2021, month: 10, day: 11 },
                    toDateUtc: { year: 2026, month: 3, day: 18 }
                },
                candleRanges: [
                    {
                        resolution: '3h',
                        dayRange: {
                            fromDateUtc: { year: 2021, month: 10, day: 11 },
                            toDateUtc: { year: 2026, month: 3, day: 18 }
                        }
                    }
                ]
            },
            appliedRange: {
                fromDateUtc: { value: '2026-01-01' },
                toDateUtc: { value: '2026-03-13' },
                resolution: '3h'
            },
            candles: [
                {
                    openTimeUtc: { year: 2026, month: 3, day: 10, hour: 12, minute: 0, second: 0 },
                    open: 134.2,
                    high: 135.5,
                    low: 131.7,
                    close: 133.1
                }
            ]
        })

        expect(parsed.boundaryManifest.historyDayRange.fromDateUtc).toBe('2021-10-11')
        expect(parsed.appliedRange.toDateUtc).toBe('2026-03-13')
        expect(parsed.appliedRange.resolution).toBe('3h')
        expect(parsed.candles[0].openTimeUtc).toBe('2026-03-10T12:00:00.000Z')
    })

    test('throws detailed field context when required value is null', () => {
        expect(() =>
            parsePolicySetupLedgerResponse({
                setup: null,
                boundaryManifest: {
                    historyDayRange: {
                        fromDateUtc: { year: 2021, month: 10, day: 11 },
                        toDateUtc: { year: 2026, month: 3, day: 18 }
                    },
                    candleRanges: [
                        {
                            resolution: '3h',
                            dayRange: {
                                fromDateUtc: { year: 2021, month: 10, day: 11 },
                                toDateUtc: { year: 2026, month: 3, day: 18 }
                            }
                        }
                    ]
                },
                appliedRange: {
                    fromDateUtc: { value: '2026-01-01' },
                    toDateUtc: { value: '2026-03-13' }
                },
                startCapitalUsd: 20000,
                balanceCeilingUsd: 20000,
                visibleBalanceCeilingUsd: 20000,
                capitalTimeline: {
                    startCapitalUsd: 20000,
                    hasWorkingCapitalGap: false,
                    firstWorkingCapitalGapDayUtc: null,
                    latestTotalCapitalUsd: 20000,
                    latestWorkingCapitalUsd: 20000,
                    totalCapitalBaseSeries: [],
                    totalCapitalProfitSeries: [],
                    workingCapitalGapSeries: []
                },
                days: []
            })
        ).toThrowError('[policy-setup-history] ledger.setup expected an object, received null.')
    })

    test('throws detailed field context when setup performance metrics are missing', () => {
        expect(() =>
            parsePolicySetupCatalogResponse({
                boundaryManifest: {
                    historyDayRange: {
                        fromDateUtc: { isoDate: '2021-10-11' },
                        toDateUtc: { year: 2026, month: 3, day: 18 }
                    },
                    candleRanges: [
                        {
                            resolution: '3h',
                            dayRange: {
                                fromDateUtc: { isoDate: '2021-10-11' },
                                toDateUtc: { year: 2026, month: 3, day: 18 }
                            }
                        }
                    ]
                },
                items: [
                    {
                        setupId: 'broken',
                        displayLabel: 'broken',
                        policyName: 'broken',
                        marginMode: 'Cross',
                        branch: 'BASE',
                        bucket: 'daily',
                        useStopLoss: true,
                        useAntiDirectionOverlay: false,
                        tpSlMode: 'all',
                        zonalMode: 'with-zonal',
                        noTradeDaysCount: 0
                    }
                ]
            })
        ).toThrowError('[policy-setup-history] catalog.items[0].performanceMetrics must be an object.')
    })
})
