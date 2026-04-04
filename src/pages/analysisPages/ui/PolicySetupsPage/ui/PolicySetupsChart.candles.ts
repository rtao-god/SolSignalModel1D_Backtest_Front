import type { Time } from 'lightweight-charts'
import type {
    PolicySetupHistoryCandleDto,
    PolicySetupHistoryDayDto,
    PolicySetupHistoryResolution
} from '@/shared/types/policySetupHistory'

export interface PolicySetupDayWindow {
    day: PolicySetupHistoryDayDto
    dayBlockStartTs: number
    dayBlockEndTs: number
}

function toUnixSeconds(isoUtc: string): number {
    return Math.floor(new Date(isoUtc).getTime() / 1000)
}

function resolveResolutionSpanSeconds(resolution: PolicySetupHistoryResolution): number {
    return resolution === '1m' ? 60 : resolution === '3h' ? 3 * 60 * 60 : 6 * 60 * 60
}

export function buildDayWindows(days: PolicySetupHistoryDayDto[]): PolicySetupDayWindow[] {
    return days.map(day => ({
        day,
        dayBlockStartTs: toUnixSeconds(day.dayBlockStartUtc),
        dayBlockEndTs: toUnixSeconds(day.dayBlockEndUtc)
    }))
}

/**
 * Владелец видимого множества дней — ledger.days, а не day-block внутри каждого дня.
 * Верхний график должен скрывать только невыбранные календарные дни, а не часы после конца торгового окна.
 */
export function filterCandlesByVisibleTradingDays(
    candles: PolicySetupHistoryCandleDto[],
    visibleDays: PolicySetupHistoryDayDto[]
): PolicySetupHistoryCandleDto[] {
    if (candles.length === 0 || visibleDays.length === 0) {
        return []
    }

    const visibleTradingDays = new Set(visibleDays.map(day => day.tradingDayUtc))
    return candles.filter(candle => visibleTradingDays.has(candle.openTimeUtc.slice(0, 10)))
}

export function buildChartCandleData(
    candles: PolicySetupHistoryCandleDto[],
    dayWindows: PolicySetupDayWindow[],
    resolution: PolicySetupHistoryResolution
) {
    if (candles.length === 0) return []

    const candleSpanSeconds = resolveResolutionSpanSeconds(resolution)
    let windowIndex = 0

    return candles.map(candle => {
        const candleStartTs = toUnixSeconds(candle.openTimeUtc)
        const candleEndTs = candleStartTs + candleSpanSeconds
        let displayTimeTs = candleStartTs

        while (windowIndex < dayWindows.length && candleStartTs >= dayWindows[windowIndex].dayBlockEndTs) {
            windowIndex += 1
        }

        const activeWindow = windowIndex < dayWindows.length ? dayWindows[windowIndex] : null
        const overlapsDayStart =
            activeWindow != null
            && candleStartTs <= activeWindow.dayBlockStartTs
            && candleEndTs > activeWindow.dayBlockStartTs

        // Первая 3h/6h свеча дня должна визуально стоять на входе в day-block.
        // Иначе маркер входа попадает между барами и создаёт ложное ощущение, что входной свечи нет.
        if (overlapsDayStart) {
            displayTimeTs = activeWindow.dayBlockStartTs
        }

        return {
            time: displayTimeTs as Time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
        }
    })
}
