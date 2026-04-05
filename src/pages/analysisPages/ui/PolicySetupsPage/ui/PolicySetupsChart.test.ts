import { expect, test, describe } from 'vitest'
import type { PolicySetupHistoryCandleDto, PolicySetupHistoryDayDto } from '@/shared/types/policySetupHistory'
import { resolveInitialVisibleRange } from './PolicySetupsChart.viewport'
import {
    resolveCompositePaneZone,
    resolveLogicalRangeAfterPan,
    resolveLogicalRangeAfterRightEdgeZoom,
    resolvePriceAtCoordinateForRange,
    resolvePriceRangeAfterPan,
    resolvePriceRangeAfterWheelZoom
} from './PolicySetupsChart.interactions'
import {
    buildChartCandleData,
    buildDayWindows,
    filterCandlesByVisibleTradingDays
} from './PolicySetupsChart.candles'

function buildDay(index: number): PolicySetupHistoryDayDto {
    const day = new Date(Date.UTC(2026, 2, 1 + index))
    const nextDay = new Date(Date.UTC(2026, 2, 2 + index))

    return {
        tradingDayUtc: day.toISOString().slice(0, 10),
        dayBlockStartUtc: day.toISOString(),
        dayBlockEndUtc: nextDay.toISOString(),
        hasTrade: true,
        direction: 'long',
        forecastDirection: null,
        forecastLabel: null,
        entryTimeUtc: null,
        entryPrice: null,
        exitTimeUtc: null,
        exitPrice: null,
        exitReason: null,
        stopLossPrice: null,
        takeProfitPrice: null,
        liquidationPrice: null,
        triggeredStopLoss: false,
        triggeredTakeProfit: false,
        triggeredLiquidation: false
    } as PolicySetupHistoryDayDto
}

function toIsoDay(time: number): string {
    return new Date(time * 1000).toISOString().slice(0, 10)
}

function buildCandle(openTimeUtc: string): PolicySetupHistoryCandleDto {
    return {
        openTimeUtc,
        open: 100,
        high: 101,
        low: 99,
        close: 100.5
    }
}

describe('resolveInitialVisibleRange', () => {
    test('opens a narrow window for 1m history to avoid a flat first viewport', () => {
        const days = Array.from({ length: 20 }, (_, index) => buildDay(index))
        const range = resolveInitialVisibleRange(days, 1600, '1m')

        expect(range).not.toBeNull()
        expect(toIsoDay(range!.from as number)).toBe('2026-03-17')
        expect(toIsoDay(range!.to as number)).toBe('2026-03-21')
    })

    test('keeps a wider initial window for 6h history', () => {
        const days = Array.from({ length: 20 }, (_, index) => buildDay(index))
        const range = resolveInitialVisibleRange(days, 1600, '6h')

        expect(range).not.toBeNull()
        expect(toIsoDay(range!.from as number)).toBe('2026-03-01')
        expect(toIsoDay(range!.to as number)).toBe('2026-03-21')
    })

    test('extends the initial right edge to the latest visible candle of the last trading day', () => {
        const days = [
            {
                ...buildDay(0),
                tradingDayUtc: '2026-03-26',
                dayBlockStartUtc: '2026-03-26T13:30:00.000Z',
                dayBlockEndUtc: '2026-03-26T19:58:00.000Z'
            }
        ]
        const latestVisibleCandleTime = Math.floor(Date.parse('2026-03-26T20:25:00.000Z') / 1000)

        const range = resolveInitialVisibleRange(days, 900, '3h', latestVisibleCandleTime)

        expect(range).not.toBeNull()
        expect(range!.to).toBe(latestVisibleCandleTime)
    })
})

describe('policy setup candle day ownership', () => {
    test('keeps late candles inside the selected trading day instead of trimming by day-block end', () => {
        const visibleDays = [
            {
                ...buildDay(0),
                tradingDayUtc: '2026-03-26',
                dayBlockStartUtc: '2026-03-26T13:30:00.000Z',
                dayBlockEndUtc: '2026-03-26T19:58:00.000Z'
            }
        ]

        const candles = filterCandlesByVisibleTradingDays(
            [
                buildCandle('2026-03-26T19:57:00.000Z'),
                buildCandle('2026-03-26T19:58:00.000Z'),
                buildCandle('2026-03-26T20:25:00.000Z'),
                buildCandle('2026-03-27T00:00:00.000Z')
            ],
            visibleDays
        )

        expect(candles.map(candle => candle.openTimeUtc)).toEqual([
            '2026-03-26T19:57:00.000Z',
            '2026-03-26T19:58:00.000Z',
            '2026-03-26T20:25:00.000Z'
        ])
    })

    test('still hides whole calendar days that were excluded from ledger', () => {
        const visibleDays = [
            {
                ...buildDay(0),
                tradingDayUtc: '2026-03-26'
            }
        ]

        const candles = filterCandlesByVisibleTradingDays(
            [
                buildCandle('2026-03-25T18:00:00.000Z'),
                buildCandle('2026-03-26T18:00:00.000Z'),
                buildCandle('2026-03-27T18:00:00.000Z')
            ],
            visibleDays
        )

        expect(candles.map(candle => candle.openTimeUtc)).toEqual([
            '2026-03-26T18:00:00.000Z'
        ])
    })

    test('anchors the first overlapping 6h candle to the day-block start without trimming later candles', () => {
        const visibleDays = [
            {
                ...buildDay(0),
                tradingDayUtc: '2026-03-26',
                dayBlockStartUtc: '2026-03-26T13:30:00.000Z',
                dayBlockEndUtc: '2026-03-26T19:58:00.000Z'
            }
        ]

        const chartData = buildChartCandleData(
            [
                buildCandle('2026-03-26T12:00:00.000Z'),
                buildCandle('2026-03-26T18:00:00.000Z'),
                buildCandle('2026-03-26T20:00:00.000Z')
            ],
            buildDayWindows(visibleDays),
            '6h'
        )

        expect(chartData.map(point => point.time)).toEqual([
            Math.floor(Date.parse('2026-03-26T13:30:00.000Z') / 1000),
            Math.floor(Date.parse('2026-03-26T18:00:00.000Z') / 1000),
            Math.floor(Date.parse('2026-03-26T20:00:00.000Z') / 1000)
        ])
    })
})

describe('resolveCompositePaneZone', () => {
    test('separates plot area, time axis and right price axis', () => {
        expect(resolveCompositePaneZone(120, 100, 0, 56, 440, 300, 28)).toBe('plot-area')
        expect(resolveCompositePaneZone(120, 316, 0, 56, 440, 300, 28)).toBe('time-axis')
        expect(resolveCompositePaneZone(470, 100, 0, 56, 440, 300, 28)).toBe('right-price-axis')
    })

    test('detects left price axis when overlay scale is visible', () => {
        expect(resolveCompositePaneZone(20, 120, 48, 56, 396, 300, 28)).toBe('left-price-axis')
    })
})

describe('resolveLogicalRangeAfterRightEdgeZoom', () => {
    test('zooms in while keeping the right edge fixed', () => {
        const nextRange = resolveLogicalRangeAfterRightEdgeZoom({ from: 10, to: 30 }, -120)

        expect(nextRange.from).toBeGreaterThan(10)
        expect(nextRange.to).toBe(30)
        expect(nextRange.to - nextRange.from).toBeLessThan(20)
    })

    test('zooms out while keeping the right edge fixed', () => {
        const nextRange = resolveLogicalRangeAfterRightEdgeZoom({ from: 10, to: 30 }, 120)

        expect(nextRange.from).toBeLessThan(10)
        expect(nextRange.to).toBe(30)
        expect(nextRange.to - nextRange.from).toBeGreaterThan(20)
    })
})

describe('resolvePriceRangeAfterWheelZoom', () => {
    test('zooms price range around hovered price', () => {
        const nextRange = resolvePriceRangeAfterWheelZoom(
            { minValue: 90, maxValue: 110 },
            100,
            -120
        )

        expect(nextRange.minValue).toBeGreaterThan(90)
        expect(nextRange.maxValue).toBeLessThan(110)
        expect(nextRange.maxValue - nextRange.minValue).toBeLessThan(20)
    })
})

describe('resolveLogicalRangeAfterPan', () => {
    test('shifts the visible logical range by pointer drag delta', () => {
        const nextRange = resolveLogicalRangeAfterPan({ from: 10, to: 30 }, 18, 15)

        expect(nextRange.from).toBe(13)
        expect(nextRange.to).toBe(33)
    })
})

describe('resolvePriceAtCoordinateForRange', () => {
    test('maps plot coordinates to a stable price inside the stored range', () => {
        expect(resolvePriceAtCoordinateForRange({ minValue: 90, maxValue: 110 }, 0, 200)).toBe(110)
        expect(resolvePriceAtCoordinateForRange({ minValue: 90, maxValue: 110 }, 200, 200)).toBe(90)
        expect(resolvePriceAtCoordinateForRange({ minValue: 90, maxValue: 110 }, 100, 200)).toBe(100)
    })
})

describe('resolvePriceRangeAfterPan', () => {
    test('shifts price range by drag delta without changing its span', () => {
        const nextRange = resolvePriceRangeAfterPan({ minValue: 90, maxValue: 110 }, 100, 97)

        expect(nextRange.minValue).toBe(93)
        expect(nextRange.maxValue).toBe(113)
        expect(nextRange.maxValue - nextRange.minValue).toBe(20)
    })
})
