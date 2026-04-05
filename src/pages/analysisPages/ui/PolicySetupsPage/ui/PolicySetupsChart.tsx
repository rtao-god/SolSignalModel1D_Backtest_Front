import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import {
    type AutoscaleInfoProvider,
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
    PolicySetupHistoryDayDto
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
import {
    buildChartCandleData,
    buildDayWindows,
    filterCandlesByVisibleTradingDays
} from './PolicySetupsChart.candles'
import {
    type CompositePaneZone,
    type PriceScaleRangeOverride,
    resolveCompositePaneZone,
    resolveLogicalRangeAfterPan,
    resolveLogicalRangeAfterRightEdgeZoom,
    resolvePriceAtCoordinateForRange,
    resolvePriceRangeAfterPan,
    resolvePriceRangeAfterWheelZoom
} from './PolicySetupsChart.interactions'
import { resolveInitialVisibleRange } from './PolicySetupsChart.viewport'
import cls from './PolicySetupsChart.module.scss'

type ChartLinePoint = LineData<Time> | WhitespaceData<Time>

interface CompositePointerPaneLocation {
    pane: 'price' | 'balance'
    chart: IChartApi
    container: HTMLDivElement
    containerRect: DOMRect
    localX: number
    localY: number
    leftPriceScaleWidth: number
    rightPriceScaleWidth: number
    timeAxisHeight: number
    plotWidth: number
    plotHeight: number
    zone: CompositePaneZone
}

interface PlotDragState {
    pane: 'price' | 'balance'
    initialLogicalRange: LogicalRange
    startLogical: number
    initialPriceRange: PriceScaleRangeOverride
    startPrice: number
}

interface ChartInteractionRuntime {
    applyCompositePointerInteraction: (clientX: number, clientY: number) => void
    applyPlotAreaDrag: (clientX: number, clientY: number) => boolean
    resolvePointerPaneLocation: (clientX: number, clientY: number) => CompositePointerPaneLocation | null
    startPlotAreaDrag: (paneLocation: CompositePointerPaneLocation) => boolean
    setCompositePointerDragActive: (active: boolean, reason: string) => void
    clearCompositeCrosshair: (reason: string) => void
    clearPriceScaleOverride: (pane: 'price' | 'balance', scaleSide: 'left' | 'right') => void
    forcePriceScaleRepaint: (pane: 'price' | 'balance', scaleSide: 'left' | 'right') => void
    applyPriceAxisWheelZoom: (paneLocation: CompositePointerPaneLocation, deltaY: number) => void
    applyTimeAxisWheelZoom: (paneLocation: CompositePointerPaneLocation, deltaY: number) => void
}

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
        pressedMouseMove: false,
        horzTouchDrag: true,
        vertTouchDrag: true
    },
    handleScale: {
        mouseWheel: false,
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

function areVisibleTimeRangesEqual(
    left: PolicySetupVisibleTimeRange | null,
    right: PolicySetupVisibleTimeRange | null
): boolean {
    if (left === right) {
        return true
    }
    if (!left || !right) {
        return false
    }

    return left.from === right.from && left.to === right.to
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

function buildPriceScaleAutoscaleInfoProvider(
    rangeOverrideRef: React.MutableRefObject<PriceScaleRangeOverride | null>
): AutoscaleInfoProvider {
    return baseImplementation => {
        const baseAutoscale = baseImplementation()
        const override = rangeOverrideRef.current
        if (!override) {
            return baseAutoscale
        }

        if (baseAutoscale == null) {
            return {
                priceRange: {
                    minValue: override.minValue,
                    maxValue: override.maxValue
                }
            }
        }

        return {
            ...baseAutoscale,
            priceRange: {
                minValue: override.minValue,
                maxValue: override.maxValue
            }
        }
    }
}

function formatCompositeCrosshairTime(unixSeconds: number): string {
    return `${GLOBAL_CROSSHAIR_TIME_FORMATTER.format(new Date(unixSeconds * 1000))} UTC`
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

function PolicySetupsChartComponent({
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
    const applyInitialViewportRef = useRef<() => void>(() => undefined)
    const chartInteractionRuntimeRef = useRef<ChartInteractionRuntime | null>(null)
    const showDetachedBalancePaneRef = useRef(false)
    const isCompositePointerDragRef = useRef(false)
    const plotDragStateRef = useRef<PlotDragState | null>(null)
    const priceRightScaleRangeOverrideRef = useRef<PriceScaleRangeOverride | null>(null)
    const priceLeftScaleRangeOverrideRef = useRef<PriceScaleRangeOverride | null>(null)
    const balanceRightScaleRangeOverrideRef = useRef<PriceScaleRangeOverride | null>(null)

    const visibleDays = useMemo(
        () => (hideNoTradeDays ? ledger.days.filter(day => day.hasTrade) : ledger.days),
        [hideNoTradeDays, ledger.days]
    )
    const dayWindows = useMemo(() => buildDayWindows(visibleDays), [visibleDays])
    const visibleCandles = useMemo(
        // Общий owner диапазона — выбранные календарные дни ledger.
        // Day-block нужен только для оверлея и привязки входной 3h/6h свечи, а не для скрытия хвоста свечей внутри дня.
        () => filterCandlesByVisibleTradingDays(candlesResponse.candles, visibleDays),
        [candlesResponse.candles, visibleDays]
    )
    const candleData = useMemo(
        () => buildChartCandleData(visibleCandles, dayWindows, candlesResponse.appliedRange.resolution),
        [candlesResponse.appliedRange.resolution, dayWindows, visibleCandles]
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

    useEffect(() => {
        showDetachedBalancePaneRef.current = showDetachedBalancePane
    }, [showDetachedBalancePane])

    const updateVisibleTimeRange = useCallback((range: { from: Time; to: Time } | null) => {
        const normalizedRange = normalizeVisibleTimeRange(range)
        if (areVisibleTimeRangesEqual(visibleTimeRangeRef.current, normalizedRange)) {
            return
        }

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

    const resolvePriceLeftScaleSeries = useCallback((): ISeriesApi<'Line'> | null => {
        return (
            overlayTotalCapitalBaseSeriesRef.current
            ?? overlayTotalCapitalProfitSeriesRef.current
            ?? overlayWorkingGapSeriesRef.current
        )
    }, [])

    const resolvePriceCrosshairSeries = useCallback((): ISeriesApi<'Line' | 'Candlestick'> | null => {
        return candleSeriesRef.current
    }, [])

    const resolvePlotAreaPriceTarget = useCallback((
        pane: 'price' | 'balance'
    ): {
        pane: 'price' | 'balance'
        scaleSide: 'right'
        series: ISeriesApi<'Candlestick' | 'Line'> | null
        rangeOverrideRef: { current: PriceScaleRangeOverride | null }
    } => {
        if (pane === 'price') {
            return {
                pane: 'price',
                scaleSide: 'right',
                series: resolvePriceCrosshairSeries(),
                rangeOverrideRef: priceRightScaleRangeOverrideRef
            }
        }

        return {
            pane: 'balance',
            scaleSide: 'right',
            series: resolveBalanceCrosshairSeries(),
            rangeOverrideRef: balanceRightScaleRangeOverrideRef
        }
    }, [resolveBalanceCrosshairSeries, resolvePriceCrosshairSeries])

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
            // Во время drag жест принадлежит либо нашему plot-pan controller, либо самой библиотеке на осях.
            // Общий crosshair в этот момент должен полностью уступать управление.
            clearCompositeCrosshair(reason)
            return
        }

        plotDragStateRef.current = null
    }, [clearCompositeCrosshair])

    const clearPriceScaleOverride = useCallback((pane: 'price' | 'balance', scaleSide: 'left' | 'right') => {
        if (pane === 'price' && scaleSide === 'left') {
            priceLeftScaleRangeOverrideRef.current = null
            return
        }

        if (pane === 'price' && scaleSide === 'right') {
            priceRightScaleRangeOverrideRef.current = null
            return
        }

        balanceRightScaleRangeOverrideRef.current = null
    }, [])

    const clearAllPriceScaleOverrides = useCallback(() => {
        priceRightScaleRangeOverrideRef.current = null
        priceLeftScaleRangeOverrideRef.current = null
        balanceRightScaleRangeOverrideRef.current = null
    }, [])

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

    const resolvePointerPaneLocation = useCallback((clientX: number, clientY: number): CompositePointerPaneLocation | null => {
        const sourcePane = resolvePointerSourcePane(clientY)
        if (!sourcePane) {
            return null
        }

        const chart = sourcePane === 'price' ? priceChartRef.current : balanceChartRef.current
        const container = sourcePane === 'price' ? priceContainerRef.current : balanceContainerRef.current
        if (!chart || !container) {
            return null
        }

        const containerRect = container.getBoundingClientRect()
        const localX = clamp(clientX - containerRect.left, 0, containerRect.width)
        const localY = clamp(clientY - containerRect.top, 0, containerRect.height)
        const timeAxisHeight = chart.timeScale().height()
        const leftPriceScaleWidth = chart.priceScale('left').width()
        const rightPriceScaleWidth = chart.priceScale('right').width()
        const plotWidth = Math.max(containerRect.width - leftPriceScaleWidth - rightPriceScaleWidth, 0)
        const plotHeight = Math.max(containerRect.height - timeAxisHeight, 0)

        return {
            pane: sourcePane,
            chart,
            container,
            containerRect,
            localX,
            localY,
            leftPriceScaleWidth,
            rightPriceScaleWidth,
            timeAxisHeight,
            plotWidth,
            plotHeight,
            zone: resolveCompositePaneZone(
                localX,
                localY,
                leftPriceScaleWidth,
                rightPriceScaleWidth,
                plotWidth,
                plotHeight,
                timeAxisHeight
            )
        }
    }, [resolvePointerSourcePane])

    const forcePriceScaleRepaint = useCallback((pane: 'price' | 'balance', scaleSide: 'left' | 'right') => {
        const chart =
            pane === 'price'
                ? priceChartRef.current
                : balanceChartRef.current
        if (!chart) {
            return
        }

        const scale = chart.priceScale(scaleSide)
        const options = scale.options()
        scale.applyOptions({
            autoScale: options.autoScale,
            mode: options.mode,
            invertScale: options.invertScale,
            alignLabels: options.alignLabels,
            borderVisible: options.borderVisible,
            borderColor: options.borderColor,
            visible: options.visible,
            ticksVisible: options.ticksVisible,
            entireTextOnly: options.entireTextOnly,
            minimumWidth: options.minimumWidth,
            scaleMargins: {
                top: options.scaleMargins.top,
                bottom: options.scaleMargins.bottom
            }
        })
    }, [])

    const resolvePriceAxisInteractionTarget = useCallback((
        paneLocation: CompositePointerPaneLocation
    ): {
        pane: 'price' | 'balance'
        scaleSide: 'left' | 'right'
        series: ISeriesApi<'Candlestick' | 'Line'> | null
        rangeOverrideRef: { current: PriceScaleRangeOverride | null }
    } | null => {
        if (paneLocation.zone === 'left-price-axis') {
            if (paneLocation.pane !== 'price') {
                return null
            }

            return {
                pane: 'price',
                scaleSide: 'left',
                series: resolvePriceLeftScaleSeries(),
                rangeOverrideRef: priceLeftScaleRangeOverrideRef
            }
        }

        if (paneLocation.zone !== 'right-price-axis') {
            return null
        }

        if (paneLocation.pane === 'price') {
            return {
                pane: 'price',
                scaleSide: 'right',
                series: resolvePriceCrosshairSeries(),
                rangeOverrideRef: priceRightScaleRangeOverrideRef
            }
        }

        return {
            pane: 'balance',
            scaleSide: 'right',
            series: resolveBalanceCrosshairSeries(),
            rangeOverrideRef: balanceRightScaleRangeOverrideRef
        }
    }, [resolveBalanceCrosshairSeries, resolvePriceCrosshairSeries, resolvePriceLeftScaleSeries])

    const applyPriceAxisWheelZoom = useCallback((
        paneLocation: CompositePointerPaneLocation,
        deltaY: number
    ) => {
        const target = resolvePriceAxisInteractionTarget(paneLocation)
        if (!target?.series) {
            return
        }

        const clampedPlotY = clamp(paneLocation.localY, 0, paneLocation.plotHeight)
        const currentMinValue =
            target.rangeOverrideRef.current?.minValue
            ?? target.series.coordinateToPrice(paneLocation.plotHeight)
        const currentMaxValue =
            target.rangeOverrideRef.current?.maxValue
            ?? target.series.coordinateToPrice(0)
        if (
            currentMinValue == null
            || currentMaxValue == null
            || !Number.isFinite(Number(currentMinValue))
            || !Number.isFinite(Number(currentMaxValue))
        ) {
            return
        }

        const normalizedMinValue = Math.min(Number(currentMinValue), Number(currentMaxValue))
        const normalizedMaxValue = Math.max(Number(currentMinValue), Number(currentMaxValue))
        const anchorPrice =
            target.series.coordinateToPrice(clampedPlotY)
            ?? ((normalizedMinValue + normalizedMaxValue) / 2)
        if (anchorPrice == null || !Number.isFinite(Number(anchorPrice))) {
            return
        }

        target.rangeOverrideRef.current = resolvePriceRangeAfterWheelZoom(
            {
                minValue: normalizedMinValue,
                maxValue: normalizedMaxValue
            },
            Number(anchorPrice),
            deltaY
        )
        forcePriceScaleRepaint(target.pane, target.scaleSide)
    }, [forcePriceScaleRepaint, resolvePriceAxisInteractionTarget])

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

    const applyTimeAxisWheelZoom = useCallback((
        paneLocation: CompositePointerPaneLocation,
        deltaY: number
    ) => {
        const sourceChart = paneLocation.chart
        const currentRange = sourceChart.timeScale().getVisibleLogicalRange()
        if (!currentRange) {
            return
        }

        applySharedLogicalRange(
            resolveLogicalRangeAfterRightEdgeZoom(currentRange, deltaY),
            {
                sourcePane: paneLocation.pane,
                interaction: paneLocation.zone === 'time-axis' ? 'time-axis-wheel' : 'plot-wheel'
            }
        )
    }, [applySharedLogicalRange])

    const startPlotAreaDrag = useCallback((paneLocation: CompositePointerPaneLocation) => {
        const priceTarget = resolvePlotAreaPriceTarget(paneLocation.pane)
        if (!priceTarget.series) {
            return false
        }

        const initialLogicalRange = paneLocation.chart.timeScale().getVisibleLogicalRange()
        const startLogical = paneLocation.chart.timeScale().coordinateToLogical(paneLocation.localX)
        if (!initialLogicalRange || startLogical == null || !Number.isFinite(startLogical)) {
            return false
        }

        const currentMinValue =
            priceTarget.rangeOverrideRef.current?.minValue
            ?? priceTarget.series.coordinateToPrice(paneLocation.plotHeight)
        const currentMaxValue =
            priceTarget.rangeOverrideRef.current?.maxValue
            ?? priceTarget.series.coordinateToPrice(0)
        if (
            currentMinValue == null
            || currentMaxValue == null
            || !Number.isFinite(Number(currentMinValue))
            || !Number.isFinite(Number(currentMaxValue))
        ) {
            return false
        }

        const initialPriceRange = {
            minValue: Math.min(Number(currentMinValue), Number(currentMaxValue)),
            maxValue: Math.max(Number(currentMinValue), Number(currentMaxValue))
        }
        const startPrice = resolvePriceAtCoordinateForRange(
            initialPriceRange,
            paneLocation.localY,
            paneLocation.plotHeight
        )

        priceTarget.rangeOverrideRef.current = initialPriceRange
        forcePriceScaleRepaint(priceTarget.pane, priceTarget.scaleSide)
        plotDragStateRef.current = {
            pane: paneLocation.pane,
            initialLogicalRange,
            startLogical,
            initialPriceRange,
            startPrice
        }
        setCompositePointerDragActive(true, 'plot-drag-start')
        return true
    }, [forcePriceScaleRepaint, resolvePlotAreaPriceTarget, setCompositePointerDragActive])

    const applyPlotAreaDrag = useCallback((clientX: number, clientY: number) => {
        const dragState = plotDragStateRef.current
        if (!dragState) {
            return false
        }

        const chart = dragState.pane === 'price' ? priceChartRef.current : balanceChartRef.current
        const container = dragState.pane === 'price' ? priceContainerRef.current : balanceContainerRef.current
        if (!chart || !container) {
            return false
        }

        const containerRect = container.getBoundingClientRect()
        const localX = clamp(clientX - containerRect.left, 0, containerRect.width)
        const localY = clamp(clientY - containerRect.top, 0, containerRect.height)
        const timeAxisHeight = chart.timeScale().height()
        const plotHeight = Math.max(containerRect.height - timeAxisHeight, 0)
        const currentLogical = chart.timeScale().coordinateToLogical(localX)
        if (currentLogical == null || !Number.isFinite(currentLogical)) {
            return false
        }

        applySharedLogicalRange(
            resolveLogicalRangeAfterPan(dragState.initialLogicalRange, dragState.startLogical, currentLogical),
            {
                sourcePane: dragState.pane,
                interaction: 'plot-drag-pan'
            }
        )

        const priceTarget = resolvePlotAreaPriceTarget(dragState.pane)
        const nextPriceRange = resolvePriceRangeAfterPan(
            dragState.initialPriceRange,
            dragState.startPrice,
            resolvePriceAtCoordinateForRange(dragState.initialPriceRange, localY, plotHeight)
        )
        priceTarget.rangeOverrideRef.current = nextPriceRange
        forcePriceScaleRepaint(priceTarget.pane, priceTarget.scaleSide)
        return true
    }, [applySharedLogicalRange, forcePriceScaleRepaint, resolvePlotAreaPriceTarget])

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

        const paneLocation = resolvePointerPaneLocation(clientX, clientY)
        if (!paneLocation) {
            clearCompositeCrosshair('pointer-outside-pane')
            return
        }

        if (paneLocation.zone !== 'plot-area') {
            // Оси X/Y должны оставаться под полным контролем chart engine:
            // общий crosshair живёт только внутри plot-area и не вмешивается в axis gestures.
            clearCompositeCrosshair('pointer-over-axis')
            return
        }

        const sourcePane = paneLocation.pane

        const shell = compositeShellRef.current
        const sourceChart = paneLocation.chart
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

        if (!shell) {
            return
        }

        const sourceRect = paneLocation.containerRect
        if (sourceRect.width <= 0 || sourceRect.height <= 0) {
            clearCompositeCrosshair('invalid-source-pane-rect')
            return
        }

        const sourceX = paneLocation.localX
        const sourceY = paneLocation.localY
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
        resolvePointerPaneLocation,
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
            candlesResponse.appliedRange.resolution,
            candleData[candleData.length - 1]?.time ?? null
        )
        if (!visibleRange) return

        try {
            clearAllPriceScaleOverrides()
            forcePriceScaleRepaint('price', 'right')
            forcePriceScaleRepaint('price', 'left')
            forcePriceScaleRepaint('balance', 'right')
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
        candleData,
        hideNoTradeDays,
        ledger.setup.setupId,
        clearAllPriceScaleOverrides,
        updateVisibleTimeRange,
        forcePriceScaleRepaint,
        viewportResetKey,
        visibleDays,
        candlesResponse.appliedRange.resolution
    ])

    useEffect(() => {
        applyInitialViewportRef.current = applyInitialViewport
    }, [applyInitialViewport])

    useEffect(() => {
        chartInteractionRuntimeRef.current = {
            applyCompositePointerInteraction,
            applyPlotAreaDrag,
            resolvePointerPaneLocation,
            startPlotAreaDrag,
            setCompositePointerDragActive,
            clearCompositeCrosshair,
            clearPriceScaleOverride,
            forcePriceScaleRepaint,
            applyPriceAxisWheelZoom,
            applyTimeAxisWheelZoom
        }
    }, [
        applyCompositePointerInteraction,
        applyPlotAreaDrag,
        resolvePointerPaneLocation,
        startPlotAreaDrag,
        setCompositePointerDragActive,
        clearCompositeCrosshair,
        clearPriceScaleOverride,
        forcePriceScaleRepaint,
        applyPriceAxisWheelZoom,
        applyTimeAxisWheelZoom
    ])

    useEffect(() => {
        if (!hasVisibleData || !compositeShellRef.current || !priceContainerRef.current || !balanceContainerRef.current) return

        const compositeShell = compositeShellRef.current

        const priceOwnsGlobalTimeAxis = !showDetachedBalancePaneRef.current
        const priceRightScaleAutoscaleInfoProvider = buildPriceScaleAutoscaleInfoProvider(priceRightScaleRangeOverrideRef)
        const priceLeftScaleAutoscaleInfoProvider = buildPriceScaleAutoscaleInfoProvider(priceLeftScaleRangeOverrideRef)
        const balanceRightScaleAutoscaleInfoProvider = buildPriceScaleAutoscaleInfoProvider(balanceRightScaleRangeOverrideRef)

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

        const candleSeries = priceChart.addCandlestickSeries({
            ...resolveVisibleCandleOptions(true),
            autoscaleInfoProvider: priceRightScaleAutoscaleInfoProvider
        })
        const overlayPrimitive = new PolicySetupDayOverlayPrimitive()
        candleSeries.attachPrimitive(overlayPrimitive)

        const overlayTotalCapitalBaseSeries = priceChart.addLineSeries({
            priceScaleId: 'left',
            color: '#aeb8c4',
            lineWidth: 2,
            lineType: LineType.Simple,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
            autoscaleInfoProvider: priceLeftScaleAutoscaleInfoProvider
        })
        const overlayTotalCapitalProfitSeries = priceChart.addLineSeries({
            priceScaleId: 'left',
            color: '#22c55e',
            lineWidth: 2,
            lineType: LineType.Simple,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
            autoscaleInfoProvider: priceLeftScaleAutoscaleInfoProvider
        })
        const overlayWorkingGapSeries = priceChart.addLineSeries({
            priceScaleId: 'left',
            color: 'rgba(226, 235, 244, 0.86)',
            lineWidth: 1,
            lineType: LineType.Simple,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
            autoscaleInfoProvider: priceLeftScaleAutoscaleInfoProvider
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
            timeScale: resolveTimeScaleOptions(showDetachedBalancePaneRef.current),
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
            priceLineVisible: false,
            autoscaleInfoProvider: balanceRightScaleAutoscaleInfoProvider
        })
        const balanceTotalCapitalProfitSeries = balanceChart.addLineSeries({
            color: '#22c55e',
            lineWidth: 2,
            lineType: LineType.Simple,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            autoscaleInfoProvider: balanceRightScaleAutoscaleInfoProvider
        })
        const balanceWorkingGapSeries = balanceChart.addLineSeries({
            color: 'rgba(226, 235, 244, 0.86)',
            lineWidth: 1,
            lineType: LineType.Simple,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
            autoscaleInfoProvider: balanceRightScaleAutoscaleInfoProvider
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
        let pendingPointerFrameId: number | null = null
        let pendingPointerEvent: { clientX: number; clientY: number; buttons: number } | null = null

        const flushPendingPointerMove = () => {
            pendingPointerFrameId = null

            const nextEvent = pendingPointerEvent
            pendingPointerEvent = null
            if (!nextEvent) {
                return
            }

            const runtime = chartInteractionRuntimeRef.current
            if (!runtime) {
                return
            }

            const isPrimaryButtonPressed = (nextEvent.buttons & 1) === 1
            if (isPrimaryButtonPressed) {
                if (plotDragStateRef.current) {
                    runtime.applyPlotAreaDrag(nextEvent.clientX, nextEvent.clientY)
                    return
                }

                if (isCompositePointerDragRef.current) {
                    return
                }

                const paneLocation = runtime.resolvePointerPaneLocation(nextEvent.clientX, nextEvent.clientY)
                if (paneLocation?.zone === 'plot-area') {
                    if (runtime.startPlotAreaDrag(paneLocation)) {
                        runtime.applyPlotAreaDrag(nextEvent.clientX, nextEvent.clientY)
                    }
                    return
                }

                if (paneLocation?.zone) {
                    runtime.setCompositePointerDragActive(true, 'axis-drag-move')
                }
                return
            }

            if (isCompositePointerDragRef.current) {
                runtime.setCompositePointerDragActive(false, 'pointer-drag-end')
            }

            runtime.applyCompositePointerInteraction(nextEvent.clientX, nextEvent.clientY)
        }

        const schedulePointerMove = (event: PointerEvent) => {
            pendingPointerEvent = {
                clientX: event.clientX,
                clientY: event.clientY,
                buttons: event.buttons
            }

            if (pendingPointerFrameId != null) {
                return
            }

            pendingPointerFrameId = window.requestAnimationFrame(flushPendingPointerMove)
        }

        const handleGlobalPointerMove = (event: PointerEvent) => {
            schedulePointerMove(event)
        }
        const handleCompositePointerDown = (event: PointerEvent) => {
            const runtime = chartInteractionRuntimeRef.current
            if (!runtime) {
                return
            }

            const paneLocation = runtime.resolvePointerPaneLocation(event.clientX, event.clientY)
            if (paneLocation?.zone === 'left-price-axis') {
                runtime.clearPriceScaleOverride('price', 'left')
                runtime.forcePriceScaleRepaint('price', 'left')
            } else if (paneLocation?.zone === 'right-price-axis') {
                runtime.clearPriceScaleOverride(paneLocation.pane, 'right')
                runtime.forcePriceScaleRepaint(paneLocation.pane, 'right')
            }

            if (event.button !== 0 || !paneLocation?.zone) {
                return
            }

            if (paneLocation.zone === 'plot-area') {
                runtime.startPlotAreaDrag(paneLocation)
                return
            }

            runtime.setCompositePointerDragActive(true, 'axis-drag-start')
        }
        const handleGlobalPointerUp = () => {
            pendingPointerEvent = null
            if (pendingPointerFrameId != null) {
                window.cancelAnimationFrame(pendingPointerFrameId)
                pendingPointerFrameId = null
            }
            chartInteractionRuntimeRef.current?.setCompositePointerDragActive(false, 'pointer-drag-release')
        }
        const handleCompositeWheel = (event: WheelEvent) => {
            const runtime = chartInteractionRuntimeRef.current
            if (!runtime) {
                return
            }

            const paneLocation = runtime.resolvePointerPaneLocation(event.clientX, event.clientY)
            if (!paneLocation?.zone) {
                return
            }

            event.preventDefault()

            if (paneLocation.zone === 'left-price-axis' || paneLocation.zone === 'right-price-axis') {
                runtime.applyPriceAxisWheelZoom(paneLocation, event.deltaY)
                return
            }

            runtime.applyTimeAxisWheelZoom(paneLocation, event.deltaY)
        }
        const handleCompositeDoubleClick = (event: MouseEvent) => {
            const runtime = chartInteractionRuntimeRef.current
            if (!runtime) {
                return
            }

            const paneLocation = runtime.resolvePointerPaneLocation(event.clientX, event.clientY)
            if (!paneLocation) {
                return
            }

            if (paneLocation.zone === 'left-price-axis') {
                runtime.clearPriceScaleOverride('price', 'left')
                runtime.forcePriceScaleRepaint('price', 'left')
                return
            }

            if (paneLocation.zone === 'right-price-axis') {
                runtime.clearPriceScaleOverride(paneLocation.pane, 'right')
                runtime.forcePriceScaleRepaint(paneLocation.pane, 'right')
            }
        }
        const handleCompositePointerLeave = () => {
            if (isCompositePointerDragRef.current) {
                return
            }
            chartInteractionRuntimeRef.current?.clearCompositeCrosshair('pointer-leave-shell')
        }

        priceChart.timeScale().subscribeVisibleLogicalRangeChange(handlePriceLogicalRange)
        balanceChart.timeScale().subscribeVisibleLogicalRangeChange(handleBalanceLogicalRange)
        compositeShell.addEventListener('pointerdown', handleCompositePointerDown)
        compositeShell.addEventListener('pointerleave', handleCompositePointerLeave)
        compositeShell.addEventListener('wheel', handleCompositeWheel, { passive: false })
        compositeShell.addEventListener('dblclick', handleCompositeDoubleClick)
        window.addEventListener('pointermove', handleGlobalPointerMove)
        window.addEventListener('pointerup', handleGlobalPointerUp)
        window.addEventListener('pointercancel', handleGlobalPointerUp)

        const resizeObserver = new ResizeObserver(() => {
            if (priceContainerRef.current) {
                priceChart.applyOptions({ width: priceContainerRef.current.clientWidth })
            }
            if (balanceContainerRef.current) {
                balanceChart.applyOptions({ width: balanceContainerRef.current.clientWidth })
            }
            applyInitialViewportRef.current()
            syncOverlayRef.current()
        })

        resizeObserver.observe(priceContainerRef.current)
        resizeObserver.observe(balanceContainerRef.current)

        return () => {
            resizeObserver.disconnect()
            if (pendingPointerFrameId != null) {
                window.cancelAnimationFrame(pendingPointerFrameId)
            }
            window.removeEventListener('pointermove', handleGlobalPointerMove)
            window.removeEventListener('pointercancel', handleGlobalPointerUp)
            window.removeEventListener('pointerup', handleGlobalPointerUp)
            compositeShell.removeEventListener('dblclick', handleCompositeDoubleClick)
            compositeShell.removeEventListener('wheel', handleCompositeWheel)
            compositeShell.removeEventListener('pointerdown', handleCompositePointerDown)
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
        hasVisibleData,
        handleCompositeLogicalRangeChange,
        hideGlobalCrosshairOverlay
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

const PolicySetupsChart = memo(PolicySetupsChartComponent)

export default PolicySetupsChart
