import { expect, test, describe } from 'vitest'
import type { PolicySetupHistoryDayDto } from '@/shared/types/policySetupHistory'
import { resolveInitialVisibleRange } from './PolicySetupsChart'

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
})
