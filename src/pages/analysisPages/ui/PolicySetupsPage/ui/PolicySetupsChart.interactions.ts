import type { LogicalRange } from 'lightweight-charts'

export type CompositePaneZone =
    | 'plot-area'
    | 'time-axis'
    | 'left-price-axis'
    | 'right-price-axis'
    | null

export interface PriceScaleRangeOverride {
    minValue: number
    maxValue: number
}

const AXIS_WHEEL_LINE_HEIGHT_PX = 16
const AXIS_WHEEL_PAGE_HEIGHT_PX = 160
const AXIS_WHEEL_ZOOM_SPEED = 0.0022
const MIN_VISIBLE_LOGICAL_SPAN = 2
const MIN_VISIBLE_PRICE_SPAN = 0.000001

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

function normalizeWheelDelta(deltaY: number, deltaMode: number): number {
    const deltaMultiplier =
        deltaMode === 1 ? AXIS_WHEEL_LINE_HEIGHT_PX
        : deltaMode === 2 ? AXIS_WHEEL_PAGE_HEIGHT_PX
        : 1

    return clamp(deltaY * deltaMultiplier, -240, 240)
}

export function resolveCompositePaneZone(
    localX: number,
    localY: number,
    leftPriceScaleWidth: number,
    rightPriceScaleWidth: number,
    plotWidth: number,
    plotHeight: number,
    timeAxisHeight: number
): CompositePaneZone {
    const plotLeft = leftPriceScaleWidth
    const plotRight = leftPriceScaleWidth + plotWidth
    const inVerticalPlotBand = localY >= 0 && localY <= plotHeight
    const inHorizontalPlotBand = localX >= plotLeft && localX <= plotRight

    if (inVerticalPlotBand && inHorizontalPlotBand) {
        return 'plot-area'
    }

    if (timeAxisHeight > 0 && localY > plotHeight && inHorizontalPlotBand) {
        return 'time-axis'
    }

    if (inVerticalPlotBand && leftPriceScaleWidth > 0 && localX < plotLeft) {
        return 'left-price-axis'
    }

    if (inVerticalPlotBand && rightPriceScaleWidth > 0 && localX > plotRight) {
        return 'right-price-axis'
    }

    return null
}

export function resolveLogicalRangeAfterRightEdgeZoom(
    range: LogicalRange,
    deltaY: number
): LogicalRange {
    const currentSpan = range.to - range.from
    if (!Number.isFinite(currentSpan) || currentSpan <= 0) {
        return range
    }

    const normalizedDelta = normalizeWheelDelta(deltaY, 0)
    if (normalizedDelta === 0) {
        return range
    }

    const zoomMultiplier = Math.exp(Math.abs(normalizedDelta) * AXIS_WHEEL_ZOOM_SPEED)
    const nextSpan =
        normalizedDelta < 0
            ? Math.max(MIN_VISIBLE_LOGICAL_SPAN, currentSpan / zoomMultiplier)
            : currentSpan * zoomMultiplier
    const nextTo = range.to
    const nextFrom = nextTo - nextSpan

    return {
        from: nextFrom as LogicalRange['from'],
        to: nextTo as LogicalRange['to']
    }
}

export function resolvePriceRangeAfterWheelZoom(
    range: PriceScaleRangeOverride,
    anchorPrice: number,
    deltaY: number
): PriceScaleRangeOverride {
    const currentSpan = range.maxValue - range.minValue
    if (!Number.isFinite(currentSpan) || currentSpan <= MIN_VISIBLE_PRICE_SPAN) {
        return range
    }

    const normalizedDelta = normalizeWheelDelta(deltaY, 0)
    if (normalizedDelta === 0) {
        return range
    }

    const zoomMultiplier = Math.exp(Math.abs(normalizedDelta) * AXIS_WHEEL_ZOOM_SPEED)
    const nextSpan =
        normalizedDelta < 0
            ? Math.max(MIN_VISIBLE_PRICE_SPAN, currentSpan / zoomMultiplier)
            : currentSpan * zoomMultiplier
    const anchorRatio = (anchorPrice - range.minValue) / currentSpan
    const nextMinValue = anchorPrice - anchorRatio * nextSpan

    return {
        minValue: nextMinValue,
        maxValue: nextMinValue + nextSpan
    }
}

export function resolveLogicalRangeAfterPan(
    range: LogicalRange,
    startLogical: number,
    currentLogical: number
): LogicalRange {
    const deltaLogical = startLogical - currentLogical

    return {
        from: (range.from + deltaLogical) as LogicalRange['from'],
        to: (range.to + deltaLogical) as LogicalRange['to']
    }
}

export function resolvePriceAtCoordinateForRange(
    range: PriceScaleRangeOverride,
    coordinateY: number,
    plotHeight: number
): number {
    if (!Number.isFinite(plotHeight) || plotHeight <= 0) {
        return (range.minValue + range.maxValue) / 2
    }

    const clampedY = clamp(coordinateY, 0, plotHeight)
    const ratio = 1 - (clampedY / plotHeight)
    return range.minValue + ((range.maxValue - range.minValue) * ratio)
}

export function resolvePriceRangeAfterPan(
    range: PriceScaleRangeOverride,
    startPrice: number,
    currentPrice: number
): PriceScaleRangeOverride {
    const deltaPrice = startPrice - currentPrice

    return {
        minValue: range.minValue + deltaPrice,
        maxValue: range.maxValue + deltaPrice
    }
}
