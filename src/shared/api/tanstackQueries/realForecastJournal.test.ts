import {
    parseRealForecastJournalDayListResponse,
    parseRealForecastJournalDayRecordResponse,
    parseRealForecastJournalLiveStatusResponse,
    parseRealForecastJournalOpsStatusResponse
} from './realForecastJournal'

function buildReportPayload(id: string) {
    return {
        schemaVersion: 2,
        id,
        kind: 'current_prediction_live_full',
        title: `Report ${id}`,
        generatedAtUtc: '2026-03-10T13:30:00.000Z',
        keyValueSections: [],
        tableSections: []
    }
}

function buildSnapshotPayload() {
    return {
        generatedAtUtc: { year: 2026, month: 3, day: 10, hour: 13, minute: 30, second: 0 },
        predictionDateUtc: { year: 2026, month: 3, day: 10 },
        asOfUtc: '2026-03-10T13:30:00.000Z',
        dataCutoffUtc: '2026-03-10T13:30:00.000Z',
        entryUtc: { year: 2026, month: 3, day: 10, hour: 13, minute: 30, second: 0 },
        exitUtc: { year: 2026, month: 3, day: 10, hour: 20, minute: 0, second: 0 },
        predLabel: 2,
        predLabelDisplay: 'UP',
        microDisplay: 'not used',
        pTotal: {
            up: 0.72,
            flat: 0.08,
            down: 0.2
        },
        confDay: 0.72,
        confMicro: 0.01,
        entry: 134.25,
        minMove: 0.018,
        reason: 'model:day:move-up',
        previewNote: null,
        actualDay: null,
        policyRows: [
            {
                policyName: 'const_2x_cross',
                branch: 'BASE',
                bucket: 'daily',
                margin: 0,
                isSpotPolicy: false,
                isRiskDay: false,
                hasDirection: true,
                skipped: false,
                direction: 'LONG',
                leverage: 2,
                entry: 134.25,
                slPct: 0.05,
                tpPct: 0.03,
                slPrice: 127.5375,
                tpPrice: 138.2775,
                notionalUsd: 200,
                positionQty: 1.489757,
                liqPrice: 90.5,
                liqDistPct: 0.326,
                bucketCapitalUsd: 1000,
                stakeUsd: 100,
                stakePct: 0.1,
                exitPrice: null,
                exitReason: 'Pending day close',
                exitPnlPct: null,
                trades: null,
                totalPnlPct: null,
                maxDdPct: null,
                hadLiquidation: null,
                withdrawnTotal: null
            }
        ]
    }
}

describe('realForecastJournal parser', () => {
    test('maps day list payload with .NET object-form utc values and numeric enums', () => {
        const parsed = parseRealForecastJournalDayListResponse([
            {
                id: 'real-forecast-2026-03-10',
                predictionDateUtc: { isoDate: '2026-03-10' },
                status: 1,
                trainingScope: 1,
                capturedAtUtc: { year: 2026, month: 3, day: 10, hour: 13, minute: 30, second: 0 },
                entryUtc: { year: 2026, month: 3, day: 10, hour: 13, minute: 30, second: 0 },
                exitUtc: { year: 2026, month: 3, day: 10, hour: 20, minute: 0, second: 0 },
                finalizedAtUtc: { year: 2026, month: 3, day: 10, hour: 20, minute: 15, second: 0 },
                predLabelDisplay: 'UP',
                microDisplay: 'not used',
                totalUpProbability: 0.72,
                totalFlatProbability: 0.08,
                totalDownProbability: 0.2,
                dayConfidence: 0.72,
                microConfidence: 0.01,
                actualDirection: 'DOWN',
                directionMatched: false
            }
        ])

        expect(parsed).toEqual([
            {
                id: 'real-forecast-2026-03-10',
                predictionDateUtc: '2026-03-10',
                status: 'captured',
                trainingScope: 'full',
                capturedAtUtc: '2026-03-10T13:30:00.000Z',
                entryUtc: '2026-03-10T13:30:00.000Z',
                exitUtc: '2026-03-10T20:00:00.000Z',
                finalizedAtUtc: '2026-03-10T20:15:00.000Z',
                predLabelDisplay: 'UP',
                microDisplay: 'not used',
                totalUpProbability: 0.72,
                totalFlatProbability: 0.08,
                totalDownProbability: 0.2,
                dayConfidence: 0.72,
                microConfidence: 0.01,
                actualDirection: 'DOWN',
                directionMatched: false
            }
        ])
    })

    test('maps full day record and resolves margin mode from enum', () => {
        const parsed = parseRealForecastJournalDayRecordResponse({
            id: 'real-forecast-2026-03-10',
            status: 2,
            trainingScope: 'full',
            predictionDateUtc: '2026-03-10',
            capturedAtUtc: '2026-03-10T13:30:00.000Z',
            entryUtc: '2026-03-10T13:30:00.000Z',
            exitUtc: '2026-03-10T20:00:00.000Z',
            forecastHash: 'ABC123',
            forecastSnapshot: buildSnapshotPayload(),
            forecastReport: buildReportPayload('forecast'),
            sessionOpenIndicators: {
                phase: 'session_open',
                anchorUtc: '2026-03-10T13:30:00.000Z',
                featureBarOpenUtc: '2026-03-10T06:00:00.000Z',
                featureBarCloseUtc: '2026-03-10T12:00:00.000Z',
                indicatorDayUtc: '2026-03-09',
                items: [
                    {
                        key: 'sol_rsi14',
                        group: 'momentum',
                        label: 'SOL RSI 14',
                        numericValue: 51.2,
                        displayValue: '51.2',
                        unit: null
                    }
                ]
            },
            finalize: {
                finalizedAtUtc: '2026-03-10T20:15:00.000Z',
                forecastHash: 'ABC123',
                snapshot: {
                    ...buildSnapshotPayload(),
                    actualDay: {
                        trueLabel: 0,
                        entry: 134.25,
                        maxHigh24: 135.5,
                        minLow24: 121.7,
                        close24: 123.1,
                        minMove: 0.018
                    }
                },
                report: buildReportPayload('finalize'),
                endOfDayIndicators: {
                    phase: 'close',
                    anchorUtc: '2026-03-10T20:00:00.000Z',
                    featureBarOpenUtc: '2026-03-10T12:00:00.000Z',
                    featureBarCloseUtc: '2026-03-10T18:00:00.000Z',
                    indicatorDayUtc: '2026-03-10',
                    items: []
                }
            }
        })

        expect(parsed.status).toBe('finalized')
        expect(parsed.forecastSnapshot.policyRows).toHaveLength(1)
        expect(parsed.forecastSnapshot.policyRows[0]).toMatchObject({
            bucket: 'daily',
            margin: 'cross',
            isSpotPolicy: false,
            policyName: 'const_2x_cross'
        })
        expect(parsed.finalize?.snapshot.actualDay?.close24).toBe(123.1)
        expect(parsed.forecastReport.id).toBe('forecast')
        expect(parsed.finalize?.report.id).toBe('finalize')
    })

    test('normalizes blank exit reason in the morning snapshot to null', () => {
        const parsed = parseRealForecastJournalDayRecordResponse({
            id: 'real-forecast-2026-03-10',
            status: 1,
            trainingScope: 'full',
            predictionDateUtc: '2026-03-10',
            capturedAtUtc: '2026-03-10T13:30:00.000Z',
            entryUtc: '2026-03-10T13:30:00.000Z',
            exitUtc: '2026-03-10T20:00:00.000Z',
            forecastHash: 'ABC123',
            forecastSnapshot: {
                ...buildSnapshotPayload(),
                policyRows: [
                    {
                        ...buildSnapshotPayload().policyRows[0],
                        exitReason: '   '
                    }
                ]
            },
            forecastReport: buildReportPayload('forecast'),
            sessionOpenIndicators: {
                phase: 'session_open',
                anchorUtc: '2026-03-10T13:30:00.000Z',
                featureBarOpenUtc: '2026-03-10T06:00:00.000Z',
                featureBarCloseUtc: '2026-03-10T12:00:00.000Z',
                indicatorDayUtc: '2026-03-09',
                items: []
            },
            finalize: null
        })

        expect(parsed.forecastSnapshot.policyRows[0].exitReason).toBeNull()
    })

    test('throws on unsupported policy bucket instead of silently accepting it', () => {
        expect(() =>
            parseRealForecastJournalDayRecordResponse({
                id: 'real-forecast-2026-03-10',
                status: 'captured',
                trainingScope: 'full',
                predictionDateUtc: '2026-03-10',
                capturedAtUtc: '2026-03-10T13:30:00.000Z',
                entryUtc: '2026-03-10T13:30:00.000Z',
                exitUtc: '2026-03-10T20:00:00.000Z',
                forecastHash: 'ABC123',
                forecastSnapshot: {
                    ...buildSnapshotPayload(),
                    policyRows: [
                        {
                            ...buildSnapshotPayload().policyRows[0],
                            bucket: 'weekly'
                        }
                    ]
                },
                forecastReport: buildReportPayload('forecast'),
                sessionOpenIndicators: {
                    phase: 'session_open',
                    anchorUtc: '2026-03-10T13:30:00.000Z',
                    featureBarOpenUtc: '2026-03-10T06:00:00.000Z',
                    featureBarCloseUtc: '2026-03-10T12:00:00.000Z',
                    indicatorDayUtc: '2026-03-09',
                    items: []
                },
                finalize: null
            })
        ).toThrow('[real-forecast-journal] unsupported policy bucket: weekly.')
    })

    test('throws when detailed day record payload omits lifecycle status', () => {
        expect(() =>
            parseRealForecastJournalDayRecordResponse({
                id: 'real-forecast-2026-03-10',
                trainingScope: 'full',
                predictionDateUtc: '2026-03-10',
                capturedAtUtc: '2026-03-10T13:30:00.000Z',
                entryUtc: '2026-03-10T13:30:00.000Z',
                exitUtc: '2026-03-10T20:00:00.000Z',
                forecastHash: 'ABC123',
                forecastSnapshot: buildSnapshotPayload(),
                forecastReport: buildReportPayload('forecast'),
                sessionOpenIndicators: {
                    phase: 'session_open',
                    anchorUtc: '2026-03-10T13:30:00.000Z',
                    featureBarOpenUtc: '2026-03-10T06:00:00.000Z',
                    featureBarCloseUtc: '2026-03-10T12:00:00.000Z',
                    indicatorDayUtc: '2026-03-09',
                    items: []
                },
                finalize: null
            })
        ).toThrow('[real-forecast-journal] status is missing.')
    })

    test('maps ops status payload with next capture and active finalize targets', () => {
        const parsed = parseRealForecastJournalOpsStatusResponse({
            health: 1,
            statusReason: 'Worker heartbeat is fresh and no overdue journal actions were detected.',
            checkedAtUtc: { year: 2026, month: 3, day: 10, hour: 13, minute: 35, second: 0 },
            pollIntervalSeconds: 10,
            workerStartedAtUtc: '2026-03-10T13:20:00.000Z',
            lastLoopStartedAtUtc: '2026-03-10T13:34:55.000Z',
            lastLoopCompletedAtUtc: '2026-03-10T13:34:58.000Z',
            workerHeartbeatStale: false,
            consecutiveFailureCount: 0,
            lastFailureAtUtc: null,
            lastFailureStage: null,
            lastFailureMessage: null,
            lastSuccessfulCapture: {
                predictionDateUtc: '2026-03-10',
                occurredAtUtc: '2026-03-10T13:30:05.000Z'
            },
            lastSuccessfulFinalize: {
                predictionDateUtc: '2026-03-09',
                occurredAtUtc: '2026-03-09T20:15:00.000Z'
            },
            activeRecordCount: 1,
            archiveRecordCount: 1,
            expectedCaptureDayUtc: '2026-03-10',
            expectedCaptureEntryUtc: '2026-03-10T13:30:00.000Z',
            expectedCaptureDayStatus: null,
            nextCaptureDayUtc: '2026-03-11',
            nextCaptureEntryUtc: '2026-03-11T13:30:00.000Z',
            captureWindowClosed: true,
            hasRecordForExpectedCaptureDay: true,
            captureOverdue: false,
            activePendingDayUtc: '2026-03-10',
            activePendingExitUtc: '2026-03-10T20:00:00.000Z',
            activePendingFinalizeDueUtc: '2026-03-10T20:15:00.000Z',
            readyToFinalizeCount: 0,
            oldestReadyToFinalizeDayUtc: null
        })

        expect(parsed).toEqual({
            health: 'healthy',
            statusReason: 'Worker heartbeat is fresh and no overdue journal actions were detected.',
            checkedAtUtc: '2026-03-10T13:35:00.000Z',
            pollIntervalSeconds: 10,
            workerStartedAtUtc: '2026-03-10T13:20:00.000Z',
            lastLoopStartedAtUtc: '2026-03-10T13:34:55.000Z',
            lastLoopCompletedAtUtc: '2026-03-10T13:34:58.000Z',
            workerHeartbeatStale: false,
            consecutiveFailureCount: 0,
            lastFailureAtUtc: null,
            lastFailureStage: null,
            lastFailureMessage: null,
            lastSuccessfulCapture: {
                predictionDateUtc: '2026-03-10',
                occurredAtUtc: '2026-03-10T13:30:05.000Z'
            },
            lastSuccessfulFinalize: {
                predictionDateUtc: '2026-03-09',
                occurredAtUtc: '2026-03-09T20:15:00.000Z'
            },
            activeRecordCount: 1,
            archiveRecordCount: 1,
            expectedCaptureDayUtc: '2026-03-10',
            expectedCaptureEntryUtc: '2026-03-10T13:30:00.000Z',
            expectedCaptureDayStatus: null,
            nextCaptureDayUtc: '2026-03-11',
            nextCaptureEntryUtc: '2026-03-11T13:30:00.000Z',
            captureWindowClosed: true,
            hasRecordForExpectedCaptureDay: true,
            captureOverdue: false,
            activePendingDayUtc: '2026-03-10',
            activePendingExitUtc: '2026-03-10T20:00:00.000Z',
            activePendingFinalizeDueUtc: '2026-03-10T20:15:00.000Z',
            readyToFinalizeCount: 0,
            oldestReadyToFinalizeDayUtc: null
        })
    })

    test('maps live status payload with numeric enum row statuses', () => {
        const parsed = parseRealForecastJournalLiveStatusResponse({
            predictionDateUtc: '2026-03-10',
            checkedAtUtc: '2026-03-10T15:00:00.000Z',
            currentPrice: 104.5,
            currentPriceObservedAtUtc: '2026-03-10T15:00:00.000Z',
            minuteObservationStartUtc: '2026-03-10T13:30:00.000Z',
            minuteObservationThroughUtc: '2026-03-10T15:00:00.000Z',
            rows: [
                {
                    rowKey: 'const_2x_cross::BASE::daily',
                    policyName: 'const_2x_cross',
                    branch: 'BASE',
                    bucket: 'daily',
                    status: 2,
                    eventTimeUtc: '2026-03-10T14:31:00.000Z',
                    eventPrice: 106.0,
                    latestClosedMinuteOpenUtc: '2026-03-10T14:59:00.000Z',
                    observedHighPrice: 106.4,
                    observedLowPrice: 99.2
                }
            ]
        })

        expect(parsed).toEqual({
            predictionDateUtc: '2026-03-10',
            checkedAtUtc: '2026-03-10T15:00:00.000Z',
            currentPrice: 104.5,
            currentPriceObservedAtUtc: '2026-03-10T15:00:00.000Z',
            minuteObservationStartUtc: '2026-03-10T13:30:00.000Z',
            minuteObservationThroughUtc: '2026-03-10T15:00:00.000Z',
            rows: [
                {
                    rowKey: 'const_2x_cross::BASE::daily',
                    policyName: 'const_2x_cross',
                    branch: 'BASE',
                    bucket: 'daily',
                    status: 'take-profit-hit',
                    eventTimeUtc: '2026-03-10T14:31:00.000Z',
                    eventPrice: 106.0,
                    latestClosedMinuteOpenUtc: '2026-03-10T14:59:00.000Z',
                    observedHighPrice: 106.4,
                    observedLowPrice: 99.2
                }
            ]
        })
    })
})
