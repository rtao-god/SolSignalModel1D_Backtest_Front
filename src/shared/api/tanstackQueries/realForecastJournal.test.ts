import {
    parseRealForecastJournalDayListResponseOrThrow,
    parseRealForecastJournalDayRecordResponseOrThrow
} from './realForecastJournal'

function buildReportPayload(id: string) {
    return {
        schemaVersion: 2,
        id,
        kind: 'current_prediction_live_full',
        title: `Report ${id}`,
        generatedAtUtc: '2026-03-10T12:00:00.000Z',
        keyValueSections: [],
        tableSections: []
    }
}

function buildSnapshotPayload() {
    return {
        generatedAtUtc: { year: 2026, month: 3, day: 10, hour: 12, minute: 0, second: 0 },
        predictionDateUtc: { year: 2026, month: 3, day: 10 },
        asOfUtc: '2026-03-10T12:00:00.000Z',
        dataCutoffUtc: '2026-03-10T12:00:00.000Z',
        entryUtc: { year: 2026, month: 3, day: 10, hour: 12, minute: 0, second: 0 },
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
        const parsed = parseRealForecastJournalDayListResponseOrThrow([
            {
                id: 'real-forecast-2026-03-10',
                predictionDateUtc: { isoDate: '2026-03-10' },
                status: 1,
                trainingScope: 1,
                capturedAtUtc: { year: 2026, month: 3, day: 10, hour: 12, minute: 0, second: 0 },
                entryUtc: { year: 2026, month: 3, day: 10, hour: 12, minute: 0, second: 0 },
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
                status: 'finalized',
                trainingScope: 'full',
                capturedAtUtc: '2026-03-10T12:00:00.000Z',
                entryUtc: '2026-03-10T12:00:00.000Z',
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
        const parsed = parseRealForecastJournalDayRecordResponseOrThrow({
            id: 'real-forecast-2026-03-10',
            trainingScope: 'full',
            predictionDateUtc: '2026-03-10',
            capturedAtUtc: '2026-03-10T12:00:00.000Z',
            entryUtc: '2026-03-10T12:00:00.000Z',
            exitUtc: '2026-03-10T20:00:00.000Z',
            forecastHash: 'ABC123',
            forecastSnapshot: buildSnapshotPayload(),
            forecastReport: buildReportPayload('forecast'),
            morningIndicators: {
                phase: 'morning',
                anchorUtc: '2026-03-10T12:00:00.000Z',
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

        expect(parsed.forecastSnapshot.policyRows).toHaveLength(1)
        expect(parsed.forecastSnapshot.policyRows[0]).toMatchObject({
            bucket: 'daily',
            margin: 'cross',
            policyName: 'const_2x_cross'
        })
        expect(parsed.finalize?.snapshot.actualDay?.close24).toBe(123.1)
        expect(parsed.forecastReport.id).toBe('forecast')
        expect(parsed.finalize?.report.id).toBe('finalize')
    })

    test('throws on unsupported policy bucket instead of silently accepting it', () => {
        expect(() =>
            parseRealForecastJournalDayRecordResponseOrThrow({
                id: 'real-forecast-2026-03-10',
                trainingScope: 'full',
                predictionDateUtc: '2026-03-10',
                capturedAtUtc: '2026-03-10T12:00:00.000Z',
                entryUtc: '2026-03-10T12:00:00.000Z',
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
                morningIndicators: {
                    phase: 'morning',
                    anchorUtc: '2026-03-10T12:00:00.000Z',
                    featureBarOpenUtc: '2026-03-10T06:00:00.000Z',
                    featureBarCloseUtc: '2026-03-10T12:00:00.000Z',
                    indicatorDayUtc: '2026-03-09',
                    items: []
                },
                finalize: null
            })
        ).toThrow('[real-forecast-journal] unsupported policy bucket: weekly.')
    })
})
