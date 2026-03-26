import type {
    RealForecastJournalDayListItemDto,
    RealForecastJournalDayRecordDto,
    RealForecastJournalPolicyRowDto,
    RealForecastJournalSnapshotDto
} from '@/shared/types/realForecastJournal.types'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import { buildCombinedPolicyRows, buildConfidenceRiskComparison } from './realForecastJournalPageModel'

function buildPolicyRow(overrides?: Partial<RealForecastJournalPolicyRowDto>): RealForecastJournalPolicyRowDto {
    return {
        policyName: 'const_2x_cross',
        branch: 'BASE',
        bucket: 'daily',
        margin: 'cross',
        isRiskDay: false,
        hasDirection: true,
        skipped: false,
        direction: 'LONG',
        leverage: 2,
        entry: 100,
        slPct: 0.05,
        tpPct: 0.03,
        slPrice: 95,
        tpPrice: 103,
        notionalUsd: 200,
        positionQty: 2,
        liqPrice: 70,
        liqDistPct: 0.3,
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
        withdrawnTotal: null,
        ...overrides
    }
}

function buildSnapshot(policyRows: RealForecastJournalPolicyRowDto[]): RealForecastJournalSnapshotDto {
    return {
        generatedAtUtc: '2026-03-10T13:30:00.000Z',
        predictionDateUtc: '2026-03-10',
        asOfUtc: '2026-03-10T13:30:00.000Z',
        dataCutoffUtc: '2026-03-10T13:30:00.000Z',
        entryUtc: '2026-03-10T13:30:00.000Z',
        exitUtc: '2026-03-10T20:00:00.000Z',
        predLabel: 2,
        predLabelDisplay: 'UP',
        microDisplay: 'not used',
        pTotal: { up: 0.72, flat: 0.08, down: 0.2 },
        confDay: 0.72,
        confMicro: 0.01,
        entry: 100,
        minMove: 0.018,
        reason: 'model:day:move-up',
        previewNote: null,
        actualDay: null,
        policyRows
    }
}

function buildReport(sections: ReportDocumentDto['sections'] = []): ReportDocumentDto {
    return {
        schemaVersion: 2,
        id: 'report',
        kind: 'current_prediction_live_full',
        title: 'Report',
        generatedAtUtc: '2026-03-10T13:30:00.000Z',
        sections
    }
}

describe('realForecastJournalPageModel', () => {
    test('buildCombinedPolicyRows keeps immutable session-open rows and adds finalize-only rows explicitly', () => {
        const record: RealForecastJournalDayRecordDto = {
            id: 'real-forecast-2026-03-10',
            trainingScope: 'full',
            predictionDateUtc: '2026-03-10',
            capturedAtUtc: '2026-03-10T13:30:00.000Z',
            entryUtc: '2026-03-10T13:30:00.000Z',
            exitUtc: '2026-03-10T20:00:00.000Z',
            forecastHash: 'ABC',
            forecastSnapshot: buildSnapshot([buildPolicyRow()]),
            forecastReport: buildReport(),
            sessionOpenIndicators: {
                phase: 'session_open',
                anchorUtc: '2026-03-10T13:30:00.000Z',
                featureBarOpenUtc: '2026-03-10T06:00:00.000Z',
                featureBarCloseUtc: '2026-03-10T12:00:00.000Z',
                indicatorDayUtc: '2026-03-09',
                items: []
            },
            finalize: {
                finalizedAtUtc: '2026-03-10T20:15:00.000Z',
                forecastHash: 'ABC',
                snapshot: buildSnapshot([
                    buildPolicyRow({
                        exitPrice: 101,
                        exitReason: 'EndOfDay',
                        exitPnlPct: 0.01
                    }),
                    buildPolicyRow({
                        policyName: 'intraday_policy',
                        bucket: 'intraday',
                        exitPrice: 102,
                        exitReason: 'TakeProfit',
                        exitPnlPct: 0.02
                    })
                ]),
                report: buildReport(),
                endOfDayIndicators: {
                    phase: 'close',
                    anchorUtc: '2026-03-10T20:00:00.000Z',
                    featureBarOpenUtc: '2026-03-10T12:00:00.000Z',
                    featureBarCloseUtc: '2026-03-10T18:00:00.000Z',
                    indicatorDayUtc: '2026-03-10',
                    items: []
                }
            }
        }

        const rows = buildCombinedPolicyRows(record)

        expect(rows).toHaveLength(2)
        expect(rows.find(row => row.policyName === 'const_2x_cross')).toMatchObject({
            publishedInSessionOpenSnapshot: true,
            finalizedAfterClose: true,
            actualExitReason: 'EndOfDay'
        })
        expect(rows.find(row => row.policyName === 'intraday_policy')).toMatchObject({
            publishedInSessionOpenSnapshot: false,
            finalizedAfterClose: true,
            actualExitReason: 'TakeProfit'
        })
    })

    test('buildConfidenceRiskComparison maps live days into historical confidence buckets', () => {
        const comparison = buildConfidenceRiskComparison(
            [
                {
                    id: 'a',
                    predictionDateUtc: '2026-03-10',
                    status: 'finalized',
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
                    actualDirection: 'UP',
                    directionMatched: true
                },
                {
                    id: 'b',
                    predictionDateUtc: '2026-03-11',
                    status: 'finalized',
                    trainingScope: 'full',
                    capturedAtUtc: '2026-03-11T13:30:00.000Z',
                    entryUtc: '2026-03-11T13:30:00.000Z',
                    exitUtc: '2026-03-11T20:00:00.000Z',
                    finalizedAtUtc: '2026-03-11T20:15:00.000Z',
                    predLabelDisplay: 'UP',
                    microDisplay: 'not used',
                    totalUpProbability: 0.83,
                    totalFlatProbability: 0.07,
                    totalDownProbability: 0.1,
                    dayConfidence: 0.83,
                    microConfidence: 0.01,
                    actualDirection: 'DOWN',
                    directionMatched: false
                }
            ] satisfies RealForecastJournalDayListItemDto[],
            buildReport([
                {
                    sectionKey: 'confidence_risk_config',
                    title: 'Confidence risk config',
                    items: [
                        {
                            itemKey: 'source',
                            key: 'Source',
                            value: 'Total'
                        }
                    ]
                },
                {
                    sectionKey: 'confidence_buckets',
                    title: 'Confidence buckets',
                    columns: [],
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
                        ['OOS', 'B04', '70.00', '75.00', '72.00', '10', '55.00'],
                        ['OOS', 'B06', '80.00', '85.00', '82.00', '8', '40.00']
                    ]
                }
            ]),
            'oos'
        )

        expect(comparison.bucketRows).toHaveLength(2)
        expect(comparison.bucketRows[0]).toMatchObject({
            bucket: 'B04',
            liveDays: 1,
            benchmarkWinRate: 0.55
        })
        expect(comparison.bucketRows[1]).toMatchObject({
            bucket: 'B06',
            liveDays: 1,
            benchmarkWinRate: 0.4
        })
        expect(comparison.live.sampleSize).toBe(2)
    })
})
