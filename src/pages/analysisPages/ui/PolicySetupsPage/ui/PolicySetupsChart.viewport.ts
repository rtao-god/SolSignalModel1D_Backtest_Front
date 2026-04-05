import type { Time } from 'lightweight-charts'
import type { PolicySetupHistoryDayDto, PolicySetupHistoryResolution } from '@/shared/types/policySetupHistory'

const TARGET_DAY_WIDTH_PX = 56

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

function toUnixSeconds(isoUtc: string): number {
    return Math.floor(new Date(isoUtc).getTime() / 1000)
}

function toChartTime(isoUtc: string): Time {
    return toUnixSeconds(isoUtc) as Time
}

function resolveInitialVisibleDayCount(
    resolution: PolicySetupHistoryResolution,
    containerWidth: number,
    totalDays: number
): number {
    const safeWidth = Number.isFinite(containerWidth) && containerWidth > 0 ? containerWidth : 1200
    const widthDrivenDays = Math.floor(safeWidth / TARGET_DAY_WIDTH_PX)

    const [minDays, maxDays] =
        resolution === '1m' ? [2, 4]
        : resolution === '3h' ? [8, 18]
        : [12, 24]

    return Math.min(totalDays, clamp(widthDrivenDays, minDays, maxDays))
}

export function resolveInitialVisibleRange(
    days: PolicySetupHistoryDayDto[],
    containerWidth: number,
    resolution: PolicySetupHistoryResolution,
    latestVisibleTime: Time | null = null
): { from: Time; to: Time } | null {
    if (days.length === 0) return null

    const targetDays = resolveInitialVisibleDayCount(resolution, containerWidth, days.length)
    const startIndex = Math.max(0, days.length - targetDays)
    const lastDayEndTime = toChartTime(days[days.length - 1].dayBlockEndUtc)
    const latestVisibleUnixSeconds =
        typeof latestVisibleTime === 'number'
            ? latestVisibleTime
            : extractUnixSeconds(latestVisibleTime)
    const viewportRightEdge =
        latestVisibleUnixSeconds != null && latestVisibleUnixSeconds > (lastDayEndTime as number)
            ? latestVisibleUnixSeconds as Time
            : lastDayEndTime

    return {
        from: toChartTime(days[startIndex].dayBlockStartUtc),
        to: viewportRightEdge
    }
}

function extractUnixSeconds(value: Time | null): number | null {
    if (typeof value === 'number') {
        return value
    }

    return null
}
