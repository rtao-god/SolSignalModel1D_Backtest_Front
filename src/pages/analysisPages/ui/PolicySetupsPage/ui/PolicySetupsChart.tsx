import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
    ColorType,
    CrosshairMode,
    LineStyle,
    LineType,
    type LogicalRange,
    createChart,
    type IChartApi,
    type ISeriesApi,
    type LineData,
    type Time,
    type WhitespaceData
} from 'lightweight-charts'
import type {
    PolicySetupCapitalTimelinePointDto,
    PolicySetupHistoryCandleDto,
    PolicySetupHistoryDayDto,
    PolicySetupHistoryResolution
} from '@/shared/types/policySetupHistory'
import classNames from '@/shared/lib/helpers/classNames'
import { logError } from '@/shared/lib/logging/logError'
import { describeUnexpectedValue } from '@/shared/lib/errors/describeUnexpectedValue'
import {
    PolicySetupDayOverlayPrimitive,
    buildPolicySetupVisibleCandlePriceRange,
    type PolicySetupDayOverlayPrimitiveData,
    type PolicySetupPrimitiveDay,
    type PolicySetupVisibleTimeRange
} from './PolicySetupDayOverlayPrimitive'
import type { PolicySetupsChartProps } from './types'
import cls from './PolicySetupsChart.module.scss'

type ChartLinePoint = LineData<Time> | WhitespaceData<Time>

interface PolicySetupDayWindow {
    day: PolicySetupHistoryDayDto
    dayBlockStartTs: number
    dayBlockEndTs: number
}
const TARGET_DAY_WIDTH_PX = 56
const PRICE_CHART_HEIGHT_PX = 560
const BALANCE_CHART_HEIGHT_PX = 232
const TRANSPARENT = 'rgba(0, 0, 0, 0)'
const GLOBAL_CROSSHAIR_LABEL_SIDE_PADDING_PX = 12
const GLOBAL_CROSSHAIR_TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
})
const SHARED_TIME_SCALE_OPTIONS = {
    borderVisible: false,
    rightOffset: 4,
    minBarSpacing: 3.2,
    timeVisible: true,
    secondsVisible: false
} as const
const SHARED_MOUSE_INTERACTION_OPTIONS = {
    handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true
    },
    handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: {
            time: true,
            price: true
        },
        axisDoubleClickReset: true
    }
} as const

// Экран читает историю day-first: весь диапазон загружается сразу, а первый viewport открывается
// на последних днях с фиксированной шириной дня. Вся старая история остаётся доступной через скролл.
function toUnixSeconds(isoUtc: string): number {
    return Math.floor(new Date(isoUtc).getTime() / 1000)
}

function toChartTime(isoUtc: string): Time {
    return toUnixSeconds(isoUtc) as Time
}

function extractUnixSecondsFromTime(value: Time | null | undefined): number | null {
    if (typeof value === 'number') return value
    if (value == null) return null

    const businessDay = value as { year?: number; month?: number; day?: number }
    if (
        typeof businessDay.year === 'number'
        && typeof businessDay.month === 'number'
        && typeof businessDay.day === 'number'
    ) {
        return Math.floor(Date.UTC(businessDay.year, businessDay.month - 1, businessDay.day) / 1000)
    }

    return null
}

function normalizeVisibleTimeRange(param: { from: Time; to: Time } | null): PolicySetupVisibleTimeRange | null {
    if (!param) return null

    const from = extractUnixSecondsFromTime(param.from)
    const to = extractUnixSecondsFromTime(param.to)
    if (from == null || to == null) return null

    return { from, to }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

function formatCompositeCrosshairTime(unixSeconds: number): string {
    return `${GLOBAL_CROSSHAIR_TIME_FORMATTER.format(new Date(unixSeconds * 1000))} UTC`
}

function buildDayWindows(days: PolicySetupHistoryDayDto[]): PolicySetupDayWindow[] {
    return days.map(day => ({
        day,
        dayBlockStartTs: toUnixSeconds(day.dayBlockStartUtc),
        dayBlockEndTs: toUnixSeconds(day.dayBlockEndUtc)
    }))
}

function resolveResolutionSpanSeconds(resolution: PolicySetupHistoryResolution): number {
    return resolution === '1m' ? 60 : resolution === '3h' ? 3 * 60 * 60 : 6 * 60 * 60
}

function filterCandlesByDayWindows(
    candles: PolicySetupHistoryCandleDto[],
    dayWindows: PolicySetupDayWindow[],
    resolution: PolicySetupHistoryResolution
): PolicySetupHistoryCandleDto[] {
    if (dayWindows.length === 0 || candles.length === 0) return []

    const result: PolicySetupHistoryCandleDto[] = []
    let windowIndex = 0
    const candleSpanSeconds = resolveResolutionSpanSeconds(resolution)

    for (const candle of candles) {
        const candleStartTs = toUnixSeconds(candle.openTimeUtc)
        const candleEndTs = candleStartTs + candleSpanSeconds

        while (windowIndex < dayWindows.length && candleStartTs >= dayWindows[windowIndex].dayBlockEndTs) {
            windowIndex += 1
        }

        if (windowIndex >= dayWindows.length) {
            break
        }

        // Для 3h/6h свеча входа может открываться до day-block, но всё ещё перекрывать момент входа.
        // Поэтому фильтр держит все свечи, которые пересекают окно дня, а не только те, что стартуют внутри него.
        if (candleEndTs > dayWindows[windowIndex].dayBlockStartTs) {
            result.push(candle)
        }
    }

    return result
}

function buildSharedTimeDomainSeconds(
    candleData: Array<{ time: Time }>,
    dayWindows: PolicySetupDayWindow[],
    capitalSeries: PolicySetupCapitalTimelinePointDto[][]
): number[] {
    const timestamps = new Set<number>()

    for (const candle of candleData) {
        const candleTime = extractUnixSecondsFromTime(candle.time)
        if (candleTime != null) {
            timestamps.add(candleTime)
        }
    }

    for (const block of dayWindows) {
        timestamps.add(block.dayBlockStartTs)
        timestamps.add(block.dayBlockEndTs)

        if (block.day.entryTimeUtc) {
            timestamps.add(toUnixSeconds(block.day.entryTimeUtc))
        }
        if (block.day.exitTimeUtc) {
            timestamps.add(toUnixSeconds(block.day.exitTimeUtc))
        }
    }

    for (const series of capitalSeries) {
        for (const point of series) {
            timestamps.add(toUnixSeconds(point.timeUtc))
        }
    }

    return [...timestamps].sort((left, right) => left - right)
}

function buildChartCandleData(
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

function buildPrimitiveDays(
    days: PolicySetupHistoryDayDto[],
    showStopLoss: boolean,
    showTakeProfit: boolean,
    showLiquidations: boolean,
    useStopLoss: boolean
): PolicySetupPrimitiveDay[] {
    return days.map(day => {
        const levels: PolicySetupPrimitiveDay['levels'] = []
        if (showStopLoss && day.stopLossPrice != null) {
            levels.push({
                key: `${day.tradingDayUtc}-sl`,
                leftTime: toChartTime(day.dayBlockStartUtc),
                rightTime: toChartTime(day.dayBlockEndUtc),
                price: day.stopLossPrice,
                accent: 'sl',
                triggered: day.triggeredStopLoss
            })
        }
        if (showTakeProfit && day.takeProfitPrice != null) {
            levels.push({
                key: `${day.tradingDayUtc}-tp`,
                leftTime: toChartTime(day.dayBlockStartUtc),
                rightTime: toChartTime(day.dayBlockEndUtc),
                price: day.takeProfitPrice,
                accent: 'tp',
                triggered: day.triggeredTakeProfit
            })
        }
        if (showLiquidations && !useStopLoss && day.liquidationPrice != null) {
            levels.push({
                key: `${day.tradingDayUtc}-liq`,
                leftTime: toChartTime(day.dayBlockStartUtc),
                rightTime: toChartTime(day.dayBlockEndUtc),
                price: day.liquidationPrice,
                accent: 'liq',
                triggered: day.triggeredLiquidation
            })
        }

        const markers: PolicySetupPrimitiveDay['markers'] = []
        if (day.entryTimeUtc && day.entryPrice != null) {
            markers.push({
                time: toChartTime(day.entryTimeUtc),
                price: day.entryPrice,
                label: day.direction === 'short' ? 'S' : 'L',
                tone: day.direction === 'short' ? 'short' : 'long'
            })
        }
        if (day.exitTimeUtc && day.exitPrice != null) {
            markers.push({
                time: toChartTime(day.exitTimeUtc),
                price: day.exitPrice,
                label:
                    day.exitReason === 'TakeProfit'
                        ? 'TP'
                        : day.exitReason === 'StopLoss'
                          ? 'SL'
                          : day.exitReason === 'Liquidation'
                            ? 'LQ'
                            : 'EOD',
                tone: 'exit'
            })
        }

        return {
            key: day.tradingDayUtc,
            startTime: toChartTime(day.dayBlockStartUtc),
            endTime: toChartTime(day.dayBlockEndUtc),
            startUnixSeconds: toUnixSeconds(day.dayBlockStartUtc),
            endUnixSeconds: toUnixSeconds(day.dayBlockEndUtc),
            hasTrade: day.hasTrade,
            forecastDirection: day.forecastDirection,
            forecastLabel: day.forecastLabel,
            levels,
            markers
        }
    })
}

function buildCapitalSeriesData(
    points: PolicySetupCapitalTimelinePointDto[]
): ChartLinePoint[] {
    return points.map(point =>
        point.valueUsd == null
            ? { time: toChartTime(point.timeUtc) }
            : { time: toChartTime(point.timeUtc), value: point.valueUsd }
    )
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
    resolution: PolicySetupHistoryResolution
): { from: Time; to: Time } | null {
    if (days.length === 0) return null

    const targetDays = resolveInitialVisibleDayCount(resolution, containerWidth, days.length)
    const startIndex = Math.max(0, days.length - targetDays)

    return {
        from: toChartTime(days[startIndex].dayBlockStartUtc),
        to: toChartTime(days[days.length - 1].dayBlockEndUtc)
    }
}

function resolveVisibleCandleOptions(showCandles: boolean) {
    if (showCandles) {
        return {
            upColor: '#1fc799',
            downColor: '#ff6b57',
            wickUpColor: '#1fc799',
            wickDownColor: '#ff6b57',
            borderUpColor: '#1fc799',
            borderDownColor: '#ff6b57',
            borderVisible: false,
            wickVisible: true
        }
    }

    return {
        upColor: TRANSPARENT,
        downColor: TRANSPARENT,
        wickUpColor: TRANSPARENT,
        wickDownColor: TRANSPARENT,
        borderUpColor: TRANSPARENT,
        borderDownColor: TRANSPARENT,
        borderColor: TRANSPARENT,
        borderVisible: false,
        wickVisible: false
    }
}

function resolveTimeScaleOptions(showGlobalAxis: boolean) {
    return showGlobalAxis
        ? {
            ...SHARED_TIME_SCALE_OPTIONS,
            visible: true
        }
        : {
            ...SHARED_TIME_SCALE_OPTIONS,
            visible: false,
            timeVisible: false
        }
}

function describeChartTime(time: Time | null | undefined): string {
    const unixSeconds = extractUnixSecondsFromTime(time)
    if (unixSeconds == null) {
        return describeUnexpectedValue(time)
    }

    return new Date(unixSeconds * 1000).toISOString()
}

function buildPolicySetupChartRuntimeError(
    operation: string,
    details: Record<string, unknown>,
    cause: unknown
): Error {
    const detailPairs = Object.entries(details).map(([key, value]) => `${key}=${describeUnexpectedValue(value)}`)
    const causeMessage = cause instanceof Error ? `${cause.name}: ${cause.message}` : describeUnexpectedValue(cause)

    return new Error(
        `[policy-setup-chart] ${operation} failed. `
        + `Expected shared time domain and chart-ready series. `
        + `Received ${detailPairs.join(', ')}. `
        + `Cause: ${causeMessage}.`
    )
}

function logPolicySetupChartRuntimeWarning(
    operation: string,
    details: Record<string, unknown>,
    cause: unknown
) {
    const error = buildPolicySetupChartRuntimeError(operation, details, cause)
    logError(error, undefined, {
        source: 'policy-setup-chart',
        domain: 'app_runtime',
        severity: 'warning',
        extra: details
    })
}

export default function PolicySetupsChart({
    ledger,
    candlesResponse,
    balanceView,
    showCandles,
    showDayBoundaries,
    showStopLoss,
    showTakeProfit,
    showLiquidations,
    hideNoTradeDays,
    lineVisibilityMode,
    viewportResetKey,
    onVisibleRangeChange
}: PolicySetupsChartProps) {
    const compositeShellRef = useRef<HTMLDivElement | null>(null)
    const priceContainerRef = useRef<HTMLDivElement | null>(null)
    const balanceContainerRef = useRef<HTMLDivElement | null>(null)
    const globalCrosshairLineRef = useRef<HTMLDivElement | null>(null)
    const globalCrosshairTimeLabelRef = useRef<HTMLDivElement | null>(null)
    const priceChartRef = useRef<IChartApi | null>(null)
    const balanceChartRef = useRef<IChartApi | null>(null)
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
    const overlayPrimitiveRef = useRef<PolicySetupDayOverlayPrimitive | null>(null)
    const overlayTotalCapitalBaseSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const overlayTotalCapitalProfitSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const overlayWorkingGapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const balanceTotalCapitalBaseSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const balanceTotalCapitalProfitSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const balanceWorkingGapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const syncingRef = useRef(false)
    const viewportKeyRef = useRef<string | null>(null)
    const visibleTimeRangeRef = useRef<PolicySetupVisibleTimeRange | null>(null)
    const hoveredTimestampRef = useRef<number | null>(null)
    const syncOverlayRef = useRef<() => void>(() => undefined)
    const isCompositePointerDragRef = useRef(false)

    const visibleDays = useMemo(
        () => (hideNoTradeDays ? ledger.days.filter(day => day.hasTrade) : ledger.days),
        [hideNoTradeDays, ledger.days]
    )
    const dayWindows = useMemo(() => buildDayWindows(visibleDays), [visibleDays])
    const visibleCandles = useMemo(
        () =>
            (hideNoTradeDays
                ? filterCandlesByDayWindows(candlesResponse.candles, dayWindows, candlesResponse.appliedRange.resolution)
                : candlesResponse.candles),
        [candlesResponse.appliedRange.resolution, candlesResponse.candles, dayWindows, hideNoTradeDays]
    )
    const candleData = useMemo(
        () => buildChartCandleData(visibleCandles, dayWindows, candlesResponse.appliedRange.resolution),
        [candlesResponse.appliedRange.resolution, dayWindows, visibleCandles]
    )
    const sharedTimeDomainSeconds = useMemo(
        () =>
            buildSharedTimeDomainSeconds(candleData, dayWindows, [
                ledger.capitalTimeline.totalCapitalBaseSeries,
                ledger.capitalTimeline.totalCapitalProfitSeries,
                ledger.capitalTimeline.workingCapitalGapSeries
            ]),
        [
            candleData,
            dayWindows,
            ledger.capitalTimeline.totalCapitalBaseSeries,
            ledger.capitalTimeline.totalCapitalProfitSeries,
            ledger.capitalTimeline.workingCapitalGapSeries
        ]
    )
    const visibleCandlePriceRange = useMemo(
        () => buildPolicySetupVisibleCandlePriceRange(visibleCandles),
        [visibleCandles]
    )
    const primitiveDays = useMemo(
        () =>
            buildPrimitiveDays(
                visibleDays,
                showStopLoss,
                showTakeProfit,
                showLiquidations,
                ledger.setup.useStopLoss
            ),
        [ledger.setup.useStopLoss, showLiquidations, showStopLoss, showTakeProfit, visibleDays]
    )
    const totalCapitalBaseData = useMemo(
        () => buildCapitalSeriesData(ledger.capitalTimeline.totalCapitalBaseSeries),
        [ledger.capitalTimeline.totalCapitalBaseSeries]
    )
    const totalCapitalProfitData = useMemo(
        () => buildCapitalSeriesData(ledger.capitalTimeline.totalCapitalProfitSeries),
        [ledger.capitalTimeline.totalCapitalProfitSeries]
    )
    const workingCapitalGapData = useMemo(
        () => buildCapitalSeriesData(ledger.capitalTimeline.workingCapitalGapSeries),
        [ledger.capitalTimeline.workingCapitalGapSeries]
    )
    const hasVisibleData = visibleDays.length > 0 && visibleCandles.length > 0
    const showDetachedBalancePane = balanceView !== 'overlay'
    const priceCrosshairFallback = useMemo(
        () => candleData[candleData.length - 1]?.close ?? visibleCandles[0]?.close ?? null,
        [candleData, visibleCandles]
    )
    const balanceCrosshairFallback = useMemo(
        () => (ledger.startCapitalUsd > 0 ? ledger.startCapitalUsd : null),
        [ledger.startCapitalUsd]
    )

    const syncOverlay = useCallback(() => {
        const primitive = overlayPrimitiveRef.current
        if (!primitive) return

        const next: PolicySetupDayOverlayPrimitiveData = {
            days: primitiveDays,
            hoveredTimestamp: hoveredTimestampRef.current,
            showDayBoundaries,
            lineVisibilityMode,
            visibleTimeRange: visibleTimeRangeRef.current,
            visibleCandlePriceRange
        }

        primitive.setData(next)
    }, [lineVisibilityMode, primitiveDays, showDayBoundaries, visibleCandlePriceRange])

    useEffect(() => {
        syncOverlayRef.current = syncOverlay
    }, [syncOverlay])

    const updateVisibleTimeRange = useCallback((range: { from: Time; to: Time } | null) => {
        const normalizedRange = normalizeVisibleTimeRange(range)
        visibleTimeRangeRef.current = normalizedRange
        onVisibleRangeChange?.(normalizedRange)
        syncOverlayRef.current()
    }, [onVisibleRangeChange])

    const resolveBalanceCrosshairSeries = useCallback((): ISeriesApi<'Line'> | null => {
        return (
            balanceTotalCapitalBaseSeriesRef.current
            ?? balanceTotalCapitalProfitSeriesRef.current
            ?? balanceWorkingGapSeriesRef.current
        )
    }, [])

    const resolvePriceCrosshairSeries = useCallback((): ISeriesApi<'Line' | 'Candlestick'> | null => {
        return candleSeriesRef.current
    }, [])

    const hideGlobalCrosshairOverlay = useCallback(() => {
        if (globalCrosshairLineRef.current) {
            globalCrosshairLineRef.current.style.opacity = '0'
        }
        if (globalCrosshairTimeLabelRef.current) {
            globalCrosshairTimeLabelRef.current.style.opacity = '0'
        }
    }, [])

    const showGlobalCrosshairOverlay = useCallback((shellX: number, unixSeconds: number) => {
        const shell = compositeShellRef.current
        const line = globalCrosshairLineRef.current
        const label = globalCrosshairTimeLabelRef.current
        if (!shell || !line || !label) {
            return
        }

        line.style.left = `${shellX}px`
        line.style.opacity = '1'

        label.textContent = formatCompositeCrosshairTime(unixSeconds)
        label.style.opacity = '1'
        const halfWidth = label.offsetWidth / 2
        const clampedLabelX = clamp(
            shellX,
            GLOBAL_CROSSHAIR_LABEL_SIDE_PADDING_PX + halfWidth,
            shell.clientWidth - GLOBAL_CROSSHAIR_LABEL_SIDE_PADDING_PX - halfWidth
        )
        label.style.left = `${clampedLabelX}px`
    }, [])

    const clearChartCrosshair = useCallback((
        chart: IChartApi | null,
        operation: string,
        details: Record<string, unknown>
    ) => {
        if (!chart) {
            return
        }

        try {
            chart.clearCrosshairPosition()
        } catch (error) {
            logPolicySetupChartRuntimeWarning(operation, details, error)
        }
    }, [])

    const clearCompositeCrosshair = useCallback((reason: string) => {
        hoveredTimestampRef.current = null
        syncOverlayRef.current()
        hideGlobalCrosshairOverlay()
        clearChartCrosshair(priceChartRef.current, 'clearCompositeCrosshair', {
            pane: 'price',
            reason
        })
        clearChartCrosshair(balanceChartRef.current, 'clearCompositeCrosshair', {
            pane: 'balance',
            reason
        })
    }, [clearChartCrosshair, hideGlobalCrosshairOverlay])

    const setCompositePointerDragActive = useCallback((active: boolean, reason: string) => {
        if (isCompositePointerDragRef.current === active) {
            return
        }

        isCompositePointerDragRef.current = active
        if (active) {
            // Во время drag жест принадлежит самому chart engine: общий crosshair не должен
            // продолжать синхронизировать панели и мешать scroll/scale поведению библиотеки.
            clearCompositeCrosshair(reason)
        }
    }, [clearCompositeCrosshair])

    const resolvePointerSourcePane = useCallback((clientY: number): 'price' | 'balance' | null => {
        const priceContainer = priceContainerRef.current
        if (!priceContainer) {
            return null
        }

        const priceRect = priceContainer.getBoundingClientRect()
        if (clientY >= priceRect.top && clientY <= priceRect.bottom) {
            return 'price'
        }

        if (!showDetachedBalancePane) {
            return null
        }

        const balanceContainer = balanceContainerRef.current
        if (!balanceContainer) {
            return null
        }

        const balanceRect = balanceContainer.getBoundingClientRect()
        if (clientY >= balanceRect.top && clientY <= balanceRect.bottom) {
            return 'balance'
        }

        return null
    }, [showDetachedBalancePane])

    const applySharedLogicalRange = useCallback((
        range: LogicalRange | null,
        context: Record<string, unknown>
    ) => {
        const priceChart = priceChartRef.current
        const balanceChart = balanceChartRef.current
        if (!priceChart || !balanceChart) {
            return
        }

        if (!range) {
            updateVisibleTimeRange(priceChart.timeScale().getVisibleRange())
            return
        }

        try {
            syncingRef.current = true
            priceChart.timeScale().setVisibleLogicalRange(range)
            balanceChart.timeScale().setVisibleLogicalRange(range)
        } catch (error) {
            logPolicySetupChartRuntimeWarning('applySharedLogicalRange', {
                ...context,
                logicalFrom: range.from,
                logicalTo: range.to
            }, error)
        } finally {
            syncingRef.current = false
        }

        updateVisibleTimeRange(priceChart.timeScale().getVisibleRange())
    }, [updateVisibleTimeRange])

    const handleCompositeLogicalRangeChange = useCallback((
        sourcePane: 'price' | 'balance',
        range: LogicalRange | null
    ) => {
        if (syncingRef.current) {
            return
        }

        applySharedLogicalRange(range, {
            sourcePane,
            interaction: 'logical-range'
        })
    }, [applySharedLogicalRange])

    const applyCompositePointerInteraction = useCallback((clientX: number, clientY: number) => {
        if (isCompositePointerDragRef.current) {
            return
        }

        const sourcePane = resolvePointerSourcePane(clientY)
        if (!sourcePane) {
            clearCompositeCrosshair('pointer-outside-pane')
            return
        }

        const shell = compositeShellRef.current
        const sourceChart = sourcePane === 'price' ? priceChartRef.current : balanceChartRef.current
        const sourceContainer = sourcePane === 'price' ? priceContainerRef.current : balanceContainerRef.current
        const targetChart =
            !showDetachedBalancePane
                ? null
                : sourcePane === 'price'
                  ? balanceChartRef.current
                  : priceChartRef.current
        const targetContainer =
            !showDetachedBalancePane
                ? null
                : sourcePane === 'price'
                  ? balanceContainerRef.current
                  : priceContainerRef.current
        const targetSeries =
            !showDetachedBalancePane
                ? null
                : sourcePane === 'price'
                  ? resolveBalanceCrosshairSeries()
                  : resolvePriceCrosshairSeries()
        const fallbackTargetPrice =
            sourcePane === 'price' ? balanceCrosshairFallback : priceCrosshairFallback

        if (!shell || !sourceChart || !sourceContainer) {
            return
        }

        const sourceRect = sourceContainer.getBoundingClientRect()
        if (sourceRect.width <= 0 || sourceRect.height <= 0) {
            clearCompositeCrosshair('invalid-source-pane-rect')
            return
        }

        const sourceX = clamp(clientX - sourceRect.left, 0, sourceRect.width)
        const sourceY = clamp(clientY - sourceRect.top, 0, sourceRect.height)
        const time = sourceChart.timeScale().coordinateToTime(sourceX)
        const hoveredUnixSeconds = extractUnixSecondsFromTime(time)

        hoveredTimestampRef.current = hoveredUnixSeconds
        syncOverlayRef.current()

        if (time == null || hoveredUnixSeconds == null) {
            hideGlobalCrosshairOverlay()
            if (targetChart) {
                clearChartCrosshair(targetChart, 'clearTargetCrosshairOnMissingTime', {
                    sourcePane,
                    targetPane: sourcePane === 'price' ? 'balance' : 'price',
                    sourceX
                })
            }
            return
        }

        const shellRect = shell.getBoundingClientRect()
        showGlobalCrosshairOverlay(clamp(clientX - shellRect.left, 0, shellRect.width), hoveredUnixSeconds)

        if (!targetChart || !targetContainer || !targetSeries) {
            return
        }

        const targetHeight = targetContainer.clientHeight
        if (targetHeight <= 0) {
            return
        }

        // Общий X задаёт один pointer-layer, а Y каждая панель восстанавливает по своей шкале.
        const targetY = clamp((sourceY / sourceRect.height) * targetHeight, 0, targetHeight)
        const mappedTargetPrice = targetSeries.coordinateToPrice(targetY)
        const targetPrice = mappedTargetPrice ?? fallbackTargetPrice
        if (targetPrice == null || !Number.isFinite(targetPrice)) {
            clearChartCrosshair(targetChart, 'clearTargetCrosshairOnInvalidPrice', {
                sourcePane,
                targetPane: sourcePane === 'price' ? 'balance' : 'price',
                hoveredTime: describeChartTime(time),
                mappedTargetPrice,
                fallbackTargetPrice
            })
            return
        }

        try {
            targetChart.setCrosshairPosition(Number(targetPrice), time, targetSeries)
        } catch (error) {
            logPolicySetupChartRuntimeWarning('setTargetCrosshairPosition', {
                sourcePane,
                targetPane: sourcePane === 'price' ? 'balance' : 'price',
                hoveredTime: describeChartTime(time),
                targetPrice,
                sourceX,
                sourceY
            }, error)
        }
    }, [
        balanceCrosshairFallback,
        clearChartCrosshair,
        clearCompositeCrosshair,
        hideGlobalCrosshairOverlay,
        priceCrosshairFallback,
        resolveBalanceCrosshairSeries,
        resolvePointerSourcePane,
        resolvePriceCrosshairSeries,
        showDetachedBalancePane,
        showGlobalCrosshairOverlay
    ])

    const applyInitialViewport = useCallback(() => {
        const priceChart = priceChartRef.current
        const balanceChart = balanceChartRef.current
        const container = priceContainerRef.current
        if (!priceChart || !balanceChart || !container || visibleDays.length === 0) return

        const viewportKey = [
            ledger.setup.setupId,
            viewportResetKey,
            hideNoTradeDays ? 'hide-no-trade' : 'all-days'
        ].join('|')

        if (viewportKeyRef.current === viewportKey) {
            updateVisibleTimeRange(priceChart.timeScale().getVisibleRange())
            return
        }

        const visibleRange = resolveInitialVisibleRange(
            visibleDays,
            container.clientWidth,
            candlesResponse.appliedRange.resolution
        )
        if (!visibleRange) return

        try {
            syncingRef.current = true
            priceChart.timeScale().setVisibleRange(visibleRange)
            balanceChart.timeScale().setVisibleRange(visibleRange)
        } catch (error) {
            throw buildPolicySetupChartRuntimeError('applyInitialViewport', {
                setupId: ledger.setup.setupId,
                fromTime: describeChartTime(visibleRange.from),
                toTime: describeChartTime(visibleRange.to),
                visibleDaysCount: visibleDays.length
            }, error)
        } finally {
            syncingRef.current = false
        }
        viewportKeyRef.current = viewportKey
        updateVisibleTimeRange(priceChart.timeScale().getVisibleRange())
    }, [
        hideNoTradeDays,
        ledger.setup.setupId,
        updateVisibleTimeRange,
        viewportResetKey,
        visibleDays,
        candlesResponse.appliedRange.resolution
    ])

    useEffect(() => {
        if (!hasVisibleData || !compositeShellRef.current || !priceContainerRef.current || !balanceContainerRef.current) return

        const compositeShell = compositeShellRef.current

        const priceOwnsGlobalTimeAxis = !showDetachedBalancePane

        const priceChart = createChart(priceContainerRef.current, {
            width: priceContainerRef.current.clientWidth,
            height: PRICE_CHART_HEIGHT_PX,
            layout: { background: { type: ColorType.Solid, color: '#07131f' }, textColor: '#dbe7f2' },
            grid: {
                vertLines: { color: 'rgba(125, 160, 189, 0.08)' },
                horzLines: { color: 'rgba(125, 160, 189, 0.08)' }
            },
            rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.24, bottom: 0.12 } },
            leftPriceScale: { visible: false, borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.12 } },
            timeScale: resolveTimeScaleOptions(priceOwnsGlobalTimeAxis),
            ...SHARED_MOUSE_INTERACTION_OPTIONS,
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    visible: false,
                    labelVisible: false,
                    width: 1,
                    style: LineStyle.Solid,
                    color: 'rgba(186, 199, 214, 0.82)',
                    labelBackgroundColor: '#0f2031'
                },
                horzLine: {
                    visible: true,
                    labelVisible: true,
                    width: 1,
                    style: LineStyle.Solid,
                    color: 'rgba(186, 199, 214, 0.82)',
                    labelBackgroundColor: '#0f2031'
                }
            }
        })

        const candleSeries = priceChart.addCandlestickSeries(resolveVisibleCandleOptions(true))
        const overlayPrimitive = new PolicySetupDayOverlayPrimitive()
        candleSeries.attachPrimitive(overlayPrimitive)

        const overlayTotalCapitalBaseSeries = priceChart.addLineSeries({
            priceScaleId: 'left',
            color: '#aeb8c4',
            lineWidth: 2,
            lineType: LineType.Simple,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false
        })
        const overlayTotalCapitalProfitSeries = priceChart.addLineSeries({
            priceScaleId: 'left',
            color: '#22c55e',
            lineWidth: 2,
            lineType: LineType.Simple,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false
        })
        const overlayWorkingGapSeries = priceChart.addLineSeries({
            priceScaleId: 'left',
            color: 'rgba(226, 235, 244, 0.86)',
            lineWidth: 1,
            lineType: LineType.Simple,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false
        })

        const balanceChart = createChart(balanceContainerRef.current, {
            width: balanceContainerRef.current.clientWidth,
            height: BALANCE_CHART_HEIGHT_PX,
            layout: { background: { type: ColorType.Solid, color: '#0b1723' }, textColor: '#dbe7f2' },
            grid: {
                vertLines: { color: 'rgba(125, 160, 189, 0.05)' },
                horzLines: { color: 'rgba(125, 160, 189, 0.08)' }
            },
            rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.12 } },
            timeScale: resolveTimeScaleOptions(showDetachedBalancePane),
            ...SHARED_MOUSE_INTERACTION_OPTIONS,
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    visible: false,
                    labelVisible: false,
                    width: 1,
                    style: LineStyle.Solid,
                    color: 'rgba(186, 199, 214, 0.82)',
                    labelBackgroundColor: '#0f2031'
                },
                horzLine: {
                    visible: true,
                    labelVisible: true,
                    width: 1,
                    style: LineStyle.Solid,
                    color: 'rgba(186, 199, 214, 0.82)',
                    labelBackgroundColor: '#0f2031'
                }
            }
        })
        const balanceTotalCapitalBaseSeries = balanceChart.addLineSeries({
            color: '#aeb8c4',
            lineWidth: 2,
            lineType: LineType.Simple,
            crosshairMarkerVisible: false,
            priceLineVisible: false
        })
        const balanceTotalCapitalProfitSeries = balanceChart.addLineSeries({
            color: '#22c55e',
            lineWidth: 2,
            lineType: LineType.Simple,
            crosshairMarkerVisible: false,
            priceLineVisible: false
        })
        const balanceWorkingGapSeries = balanceChart.addLineSeries({
            color: 'rgba(226, 235, 244, 0.86)',
            lineWidth: 1,
            lineType: LineType.Simple,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false
        })

        priceChartRef.current = priceChart
        balanceChartRef.current = balanceChart
        candleSeriesRef.current = candleSeries
        overlayPrimitiveRef.current = overlayPrimitive
        overlayTotalCapitalBaseSeriesRef.current = overlayTotalCapitalBaseSeries
        overlayTotalCapitalProfitSeriesRef.current = overlayTotalCapitalProfitSeries
        overlayWorkingGapSeriesRef.current = overlayWorkingGapSeries
        balanceTotalCapitalBaseSeriesRef.current = balanceTotalCapitalBaseSeries
        balanceTotalCapitalProfitSeriesRef.current = balanceTotalCapitalProfitSeries
        balanceWorkingGapSeriesRef.current = balanceWorkingGapSeries

        const handlePriceLogicalRange = (range: LogicalRange | null) => {
            handleCompositeLogicalRangeChange('price', range)
        }
        const handleBalanceLogicalRange = (range: LogicalRange | null) => {
            handleCompositeLogicalRangeChange('balance', range)
        }
        const handleCompositePointerMove = (event: PointerEvent) => {
            const isPrimaryButtonPressed = (event.buttons & 1) === 1
            if (isPrimaryButtonPressed) {
                setCompositePointerDragActive(true, 'pointer-drag-move')
                return
            }

            if (isCompositePointerDragRef.current) {
                setCompositePointerDragActive(false, 'pointer-drag-end')
            }

            applyCompositePointerInteraction(event.clientX, event.clientY)
        }
        const handleCompositePointerDown = (event: PointerEvent) => {
            if (event.button === 0) {
                setCompositePointerDragActive(true, 'pointer-drag-start')
            }
        }
        const handleGlobalPointerUp = () => {
            setCompositePointerDragActive(false, 'pointer-drag-release')
        }
        const handleCompositePointerLeave = () => {
            if (isCompositePointerDragRef.current) {
                return
            }
            clearCompositeCrosshair('pointer-leave-shell')
        }

        priceChart.timeScale().subscribeVisibleLogicalRangeChange(handlePriceLogicalRange)
        balanceChart.timeScale().subscribeVisibleLogicalRangeChange(handleBalanceLogicalRange)
        compositeShell.addEventListener('pointerdown', handleCompositePointerDown)
        compositeShell.addEventListener('pointermove', handleCompositePointerMove)
        compositeShell.addEventListener('pointerleave', handleCompositePointerLeave)
        window.addEventListener('pointerup', handleGlobalPointerUp)
        window.addEventListener('pointercancel', handleGlobalPointerUp)

        const resizeObserver = new ResizeObserver(() => {
            if (priceContainerRef.current) {
                priceChart.applyOptions({ width: priceContainerRef.current.clientWidth })
            }
            if (balanceContainerRef.current) {
                balanceChart.applyOptions({ width: balanceContainerRef.current.clientWidth })
            }
            applyInitialViewport()
            syncOverlayRef.current()
        })

        resizeObserver.observe(priceContainerRef.current)
        resizeObserver.observe(balanceContainerRef.current)

        return () => {
            resizeObserver.disconnect()
            window.removeEventListener('pointercancel', handleGlobalPointerUp)
            window.removeEventListener('pointerup', handleGlobalPointerUp)
            compositeShell.removeEventListener('pointerdown', handleCompositePointerDown)
            compositeShell.removeEventListener('pointermove', handleCompositePointerMove)
            compositeShell.removeEventListener('pointerleave', handleCompositePointerLeave)
            priceChart.timeScale().unsubscribeVisibleLogicalRangeChange(handlePriceLogicalRange)
            balanceChart.timeScale().unsubscribeVisibleLogicalRangeChange(handleBalanceLogicalRange)
            candleSeries.detachPrimitive(overlayPrimitive)
            priceChart.remove()
            balanceChart.remove()
            priceChartRef.current = null
            balanceChartRef.current = null
            candleSeriesRef.current = null
            overlayPrimitiveRef.current = null
            overlayTotalCapitalBaseSeriesRef.current = null
            overlayTotalCapitalProfitSeriesRef.current = null
            overlayWorkingGapSeriesRef.current = null
            balanceTotalCapitalBaseSeriesRef.current = null
            balanceTotalCapitalProfitSeriesRef.current = null
            balanceWorkingGapSeriesRef.current = null
            viewportKeyRef.current = null
            visibleTimeRangeRef.current = null
            hoveredTimestampRef.current = null
            hideGlobalCrosshairOverlay()
        }
    }, [
        applyCompositePointerInteraction,
        applyInitialViewport,
        clearCompositeCrosshair,
        hasVisibleData,
        handleCompositeLogicalRangeChange,
        hideGlobalCrosshairOverlay,
        setCompositePointerDragActive,
        showDetachedBalancePane
    ])

    useEffect(() => {
        const priceChart = priceChartRef.current
        const balanceChart = balanceChartRef.current
        if (!priceChart || !balanceChart) return

        // При двух панелях ось X должна жить на общем нижнем краю композиции, как в торговом терминале.
        // В overlay-режиме нижняя панель скрыта, поэтому владелец общей оси возвращается верхнему графику.
        priceChart.applyOptions({ timeScale: resolveTimeScaleOptions(!showDetachedBalancePane) })
        balanceChart.applyOptions({ timeScale: resolveTimeScaleOptions(showDetachedBalancePane) })
    }, [showDetachedBalancePane])

    useEffect(() => {
        if (!hasVisibleData) {
            overlayPrimitiveRef.current?.setData({
                days: [],
                hoveredTimestamp: null,
                showDayBoundaries,
                lineVisibilityMode,
                visibleTimeRange: null,
                visibleCandlePriceRange: null
            })
            return
        }

        if (
            !candleSeriesRef.current
            || !priceChartRef.current
        ) return
        if (
            !overlayTotalCapitalBaseSeriesRef.current
            || !overlayTotalCapitalProfitSeriesRef.current
            || !overlayWorkingGapSeriesRef.current
        ) return
        if (
            !balanceTotalCapitalBaseSeriesRef.current
            || !balanceTotalCapitalProfitSeriesRef.current
            || !balanceWorkingGapSeriesRef.current
            || !balanceChartRef.current
        ) return

        try {
            candleSeriesRef.current.setData(candleData)
            candleSeriesRef.current.applyOptions(resolveVisibleCandleOptions(showCandles))

            overlayTotalCapitalBaseSeriesRef.current.setData(totalCapitalBaseData)
            overlayTotalCapitalBaseSeriesRef.current.applyOptions({ visible: balanceView === 'overlay' })
            overlayTotalCapitalProfitSeriesRef.current.setData(totalCapitalProfitData)
            overlayTotalCapitalProfitSeriesRef.current.applyOptions({ visible: balanceView === 'overlay' })
            overlayWorkingGapSeriesRef.current.setData(workingCapitalGapData)
            overlayWorkingGapSeriesRef.current.applyOptions({ visible: balanceView === 'overlay' })
            priceChartRef.current.priceScale('left').applyOptions({ visible: balanceView === 'overlay' })

            balanceTotalCapitalBaseSeriesRef.current.setData(totalCapitalBaseData)
            balanceTotalCapitalProfitSeriesRef.current.setData(totalCapitalProfitData)
            balanceWorkingGapSeriesRef.current.setData(workingCapitalGapData)
        } catch (error) {
            throw buildPolicySetupChartRuntimeError('bindPolicySetupChartData', {
                setupId: ledger.setup.setupId,
                candlesCount: candleData.length,
                sharedTimePointCount: sharedTimeDomainSeconds.length,
                totalCapitalBasePointCount: totalCapitalBaseData.length,
                totalCapitalProfitPointCount: totalCapitalProfitData.length,
                workingCapitalGapPointCount: workingCapitalGapData.length
            }, error)
        }

        if (priceContainerRef.current) {
            priceChartRef.current.applyOptions({ width: priceContainerRef.current.clientWidth })
        }
        if (balanceContainerRef.current) {
            balanceChartRef.current.applyOptions({ width: balanceContainerRef.current.clientWidth })
        }

        syncOverlayRef.current()
        applyInitialViewport()
    }, [
        applyInitialViewport,
        balanceView,
        candleData,
        hasVisibleData,
        ledger.setup.setupId,
        lineVisibilityMode,
        sharedTimeDomainSeconds.length,
        showCandles,
        showDayBoundaries,
        totalCapitalBaseData,
        totalCapitalProfitData,
        visibleCandlePriceRange,
        workingCapitalGapData
    ])

    useEffect(() => {
        syncOverlay()
    }, [syncOverlay])

    if (!hasVisibleData) {
        return <div className={cls.emptyState}>Нет данных для текущего сочетания фильтров.</div>
    }

    return (
        <div className={cls.root}>
            <div ref={compositeShellRef} className={cls.compositeShell}>
                <div className={cls.globalCrosshairLayer} aria-hidden='true'>
                    <div ref={globalCrosshairLineRef} className={cls.globalCrosshairLine} />
                    <div ref={globalCrosshairTimeLabelRef} className={cls.globalCrosshairTimeLabel} />
                </div>
                <div className={classNames(cls.priceShell, { [cls.priceShellWithBalance]: showDetachedBalancePane })}>
                    <div ref={priceContainerRef} className={cls.chartCanvas} />
                </div>
                <div className={classNames(cls.balanceShell, { [cls.balanceShellHidden]: balanceView === 'overlay' })}>
                    <div ref={balanceContainerRef} className={cls.chartCanvas} />
                </div>
            </div>
        </div>
    )
}
