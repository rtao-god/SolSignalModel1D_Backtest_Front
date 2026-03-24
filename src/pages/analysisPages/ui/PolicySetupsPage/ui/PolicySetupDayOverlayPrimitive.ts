import type { CanvasRenderingTarget2D, MediaCoordinatesRenderingScope } from 'fancy-canvas'
import type {
    AutoscaleInfo,
    ISeriesPrimitive,
    ISeriesPrimitivePaneRenderer,
    ISeriesPrimitivePaneView,
    Logical,
    SeriesAttachedParameter,
    Time
} from 'lightweight-charts'
import type { PolicySetupHistoryCandleDto } from '@/shared/types/policySetupHistory'
import type { LineVisibilityMode } from './types'

export interface PolicySetupVisibleTimeRange {
    from: number
    to: number
}

export interface PolicySetupPriceRange {
    minValue: number
    maxValue: number
}

interface PolicySetupPrimitiveMarker {
    time: Time
    price: number
    label: string
    tone: 'long' | 'short' | 'exit'
}

interface PolicySetupPrimitiveLevel {
    key: string
    leftTime: Time
    rightTime: Time
    price: number
    accent: 'sl' | 'tp' | 'liq'
    triggered: boolean
}

export interface PolicySetupPrimitiveDay {
    key: string
    startTime: Time
    endTime: Time
    startUnixSeconds: number
    endUnixSeconds: number
    hasTrade: boolean
    forecastDirection: 'up' | 'down' | null
    forecastLabel: string | null
    levels: PolicySetupPrimitiveLevel[]
    markers: PolicySetupPrimitiveMarker[]
}

export interface PolicySetupDayOverlayPrimitiveData {
    days: readonly PolicySetupPrimitiveDay[]
    hoveredTimestamp: number | null
    showDayBoundaries: boolean
    lineVisibilityMode: LineVisibilityMode
    visibleTimeRange: PolicySetupVisibleTimeRange | null
    visibleCandlePriceRange: PolicySetupPriceRange | null
}

function normalizePriceRange(range: PolicySetupPriceRange | null): PolicySetupPriceRange | null {
    if (!range) return null
    if (!Number.isFinite(range.minValue) || !Number.isFinite(range.maxValue)) return null

    if (range.minValue === range.maxValue) {
        const padding = Math.max(0.01, Math.abs(range.minValue) * 0.0025)
        return {
            minValue: range.minValue - padding,
            maxValue: range.maxValue + padding
        }
    }

    return range
}

/**
 * Берёт только candle range как источник масштаба.
 * Day-level overlay рисуется поверх свечей и не должен раздвигать шкалу до плоской линии.
 */
export function buildPolicySetupOverlayAutoscaleRange(
    data: PolicySetupDayOverlayPrimitiveData
): PolicySetupPriceRange | null {
    return normalizePriceRange(data.visibleCandlePriceRange)
}

/**
 * Канонический диапазон цен свечей, который нужен примитиву для корректного autoscale.
 * Берём low/high, а не open/close, чтобы в шкалу попадал весь реальный ход свечи.
 */
export function buildPolicySetupVisibleCandlePriceRange(
    candles: readonly PolicySetupHistoryCandleDto[]
): PolicySetupPriceRange | null {
    if (candles.length === 0) return null

    let minValue = Number.POSITIVE_INFINITY
    let maxValue = Number.NEGATIVE_INFINITY

    for (const candle of candles) {
        minValue = Math.min(minValue, candle.low)
        maxValue = Math.max(maxValue, candle.high)
    }

    return normalizePriceRange({ minValue, maxValue })
}

const DAY_SHADE_IDLE = 'rgba(120, 146, 167, 0.035)'
const DAY_SHADE_TRADE = 'rgba(57, 123, 181, 0.08)'
const DAY_SHADE_HIGHLIGHT = 'rgba(97, 175, 255, 0.15)'
const DAY_BOUNDARY_IDLE = 'rgba(180, 201, 221, 0.22)'
const DAY_BOUNDARY_HIGHLIGHT = 'rgba(228, 239, 250, 0.54)'
const FORECAST_TEXT = '#f7fbff'
const FORECAST_UP = '#11a87e'
const FORECAST_DOWN = '#d96f3f'
const FORECAST_UP_MICRO = '#188ab9'
const FORECAST_DOWN_MICRO = '#b76a24'
const FORECAST_BADGE_GAP_PX = 8
const FORECAST_ROWS_TOP_PX = [10, 42] as const
const FORECAST_BADGE_PADDING_X_PX = 10
const FORECAST_BADGE_PADDING_Y_PX = 6
const FORECAST_BADGE_LINE_HEIGHT_PX = 12
const FORECAST_FONT = '700 11px "Segoe UI", sans-serif'
const MARKER_FONT = '700 10px "Segoe UI", sans-serif'
const LEVEL_LINE_WIDTH_PX = 1.25
const LEVEL_LINE_TRIGGERED_WIDTH_PX = 2.4

/**
 * Рисует все day-first оверлеи policy setup прямо в canvas графика.
 * Примитив держит геометрию в owner-терминах дня, а не в DOM-координатах отдельных div.
 */
export class PolicySetupDayOverlayPrimitive
    implements ISeriesPrimitive<Time>, ISeriesPrimitivePaneView, ISeriesPrimitivePaneRenderer
{
    private attachedParams: SeriesAttachedParameter<Time> | null = null
    private data: PolicySetupDayOverlayPrimitiveData = {
        days: [],
        hoveredTimestamp: null,
        showDayBoundaries: true,
        lineVisibilityMode: 'strong',
        visibleTimeRange: null,
        visibleCandlePriceRange: null
    }

    public attached(params: SeriesAttachedParameter<Time>): void {
        this.attachedParams = params
    }

    public detached(): void {
        this.attachedParams = null
    }

    public setData(next: PolicySetupDayOverlayPrimitiveData): void {
        this.data = next
        this.attachedParams?.requestUpdate()
    }

    public paneViews(): readonly ISeriesPrimitivePaneView[] {
        return [this]
    }

    public renderer(): ISeriesPrimitivePaneRenderer | null {
        return this.data.days.length > 0 ? this : null
    }

    public zOrder(): 'top' {
        return 'top'
    }

    public drawBackground(target: CanvasRenderingTarget2D): void {
        const params = this.attachedParams
        if (!params) return

        target.useMediaCoordinateSpace(scope => {
            for (const day of this.data.days) {
                const box = this.resolveDayBox(day)
                if (!box) continue

                const isHighlighted =
                    this.data.hoveredTimestamp != null
                    && this.data.hoveredTimestamp >= day.startUnixSeconds
                    && this.data.hoveredTimestamp < day.endUnixSeconds

                this.drawDayShade(scope, box.left, box.right, day.hasTrade, isHighlighted)
                if (this.data.showDayBoundaries) {
                    this.drawBoundary(scope, box.left, isHighlighted)
                    this.drawBoundary(scope, box.right, isHighlighted)
                }
            }
        })
    }

    public draw(target: CanvasRenderingTarget2D): void {
        const params = this.attachedParams
        if (!params) return

        target.useMediaCoordinateSpace(scope => {
            this.drawForecastBadges(scope)
            this.drawLevels(scope)
            this.drawMarkers(scope)
        })
    }

    public autoscaleInfo(_startTimePoint: Logical, _endTimePoint: Logical): AutoscaleInfo | null {
        const params = this.attachedParams
        if (!params) return null

        const priceRange = buildPolicySetupOverlayAutoscaleRange(this.data)
        if (!priceRange) {
            return null
        }

        return {
            priceRange: {
                minValue: priceRange.minValue,
                maxValue: priceRange.maxValue
            }
        }
    }

    private drawForecastBadges(scope: MediaCoordinatesRenderingScope): void {
        const params = this.attachedParams
        if (!params) return

        const { context, mediaSize } = scope
        context.save()
        context.font = FORECAST_FONT
        context.textAlign = 'left'
        context.textBaseline = 'middle'

        const rowRightEdges = FORECAST_ROWS_TOP_PX.map(() => -Infinity)

        for (const day of this.data.days) {
            if (!day.forecastDirection || !day.forecastLabel) continue

            const box = this.resolveDayBox(day)
            if (!box || box.width < 14) continue

            const labelLines = splitForecastLabel(day.forecastLabel)
            const badgeWidth = Math.max(
                46,
                Math.min(
                    112,
                    Math.ceil(
                        Math.max(...labelLines.map(line => context.measureText(line).width))
                        + FORECAST_BADGE_PADDING_X_PX * 2
                    )
                )
            )
            const badgeHeight =
                labelLines.length * FORECAST_BADGE_LINE_HEIGHT_PX + FORECAST_BADGE_PADDING_Y_PX * 2
            const left = clamp(box.left + 5, 4, mediaSize.width - badgeWidth - 4)
            const rowIndex = this.resolveForecastRow(left, badgeWidth, rowRightEdges)
            const top = FORECAST_ROWS_TOP_PX[rowIndex]
            rowRightEdges[rowIndex] = left + badgeWidth

            const micro = day.forecastLabel.startsWith('микро-')
            const backColor =
                day.forecastDirection === 'up'
                    ? (micro ? FORECAST_UP_MICRO : FORECAST_UP)
                    : (micro ? FORECAST_DOWN_MICRO : FORECAST_DOWN)

            drawRoundedRect(context, left, top, badgeWidth, badgeHeight, 12)
            context.fillStyle = backColor
            context.fill()

            context.fillStyle = FORECAST_TEXT
            labelLines.forEach((line, index) => {
                const lineTop =
                    top
                    + FORECAST_BADGE_PADDING_Y_PX
                    + FORECAST_BADGE_LINE_HEIGHT_PX / 2
                    + index * FORECAST_BADGE_LINE_HEIGHT_PX
                context.fillText(line, left + FORECAST_BADGE_PADDING_X_PX, lineTop)
            })
        }

        context.restore()
    }

    private drawLevels(scope: MediaCoordinatesRenderingScope): void {
        const params = this.attachedParams
        if (!params) return

        const { context } = scope
        context.save()
        context.lineCap = 'round'

        for (const day of this.data.days) {
            const dayBox = this.resolveDayBox(day)
            if (!dayBox || dayBox.width < 2) continue

            const highlighted =
                this.data.hoveredTimestamp != null
                && this.data.hoveredTimestamp >= day.startUnixSeconds
                && this.data.hoveredTimestamp < day.endUnixSeconds

            for (const level of day.levels) {
                const y = params.series.priceToCoordinate(level.price)
                if (y == null) continue

                const strong =
                    this.data.lineVisibilityMode === 'strong'
                    || highlighted
                    || level.triggered

                context.beginPath()
                context.setLineDash(strong ? [] : [4, 4])
                context.lineWidth = level.triggered ? LEVEL_LINE_TRIGGERED_WIDTH_PX : LEVEL_LINE_WIDTH_PX
                context.strokeStyle = resolveLevelColor(level.accent)
                context.moveTo(dayBox.left, y)
                context.lineTo(dayBox.right, y)
                context.stroke()
            }
        }

        context.restore()
    }

    private drawMarkers(scope: MediaCoordinatesRenderingScope): void {
        const params = this.attachedParams
        if (!params) return

        const { context } = scope
        context.save()
        context.font = MARKER_FONT
        context.textAlign = 'center'
        context.textBaseline = 'middle'

        for (const day of this.data.days) {
            for (const marker of day.markers) {
                const x = params.chart.timeScale().timeToCoordinate(marker.time)
                const y = params.series.priceToCoordinate(marker.price)
                if (x == null || y == null) continue

                const width = marker.label.length > 2 ? 28 : 22
                const height = 18
                const left = x - width / 2
                const top = y - height / 2

                drawRoundedRect(context, left, top, width, height, 9)
                context.fillStyle = resolveMarkerColor(marker.tone)
                context.fill()

                context.fillStyle = '#f7fbff'
                context.fillText(marker.label, x, y + 0.5)
            }
        }

        context.restore()
    }

    private resolveForecastRow(
        left: number,
        badgeWidth: number,
        rowRightEdges: number[]
    ): number {
        const targetRight = left + badgeWidth
        for (let index = 0; index < rowRightEdges.length; index += 1) {
            if (left > rowRightEdges[index] + FORECAST_BADGE_GAP_PX) {
                return index
            }
        }

        let bestRow = 0
        let bestOverflow = Number.POSITIVE_INFINITY
        for (let index = 0; index < rowRightEdges.length; index += 1) {
            const overflow = rowRightEdges[index] - left
            if (overflow < bestOverflow) {
                bestOverflow = overflow
                bestRow = index
            }
        }

        rowRightEdges[bestRow] = Math.max(rowRightEdges[bestRow], targetRight)
        return bestRow
    }

    private resolveDayBox(day: PolicySetupPrimitiveDay): { left: number; right: number; width: number } | null {
        const params = this.attachedParams
        if (!params) return null

        const startX = params.chart.timeScale().timeToCoordinate(day.startTime)
        const endX = params.chart.timeScale().timeToCoordinate(day.endTime)
        if (startX == null || endX == null) return null

        const left = Math.min(startX, endX)
        const right = Math.max(startX, endX)
        return {
            left,
            right,
            width: Math.max(1, right - left)
        }
    }

    private drawDayShade(
        scope: MediaCoordinatesRenderingScope,
        left: number,
        right: number,
        trade: boolean,
        highlight: boolean
    ): void {
        const { context, mediaSize } = scope
        const width = Math.max(1, right - left)
        context.fillStyle = highlight ? DAY_SHADE_HIGHLIGHT : trade ? DAY_SHADE_TRADE : DAY_SHADE_IDLE
        context.fillRect(left, 0, width, mediaSize.height)
    }

    private drawBoundary(scope: MediaCoordinatesRenderingScope, x: number, highlight: boolean): void {
        const { context, mediaSize } = scope
        context.beginPath()
        context.strokeStyle = highlight ? DAY_BOUNDARY_HIGHLIGHT : DAY_BOUNDARY_IDLE
        context.lineWidth = 1
        context.moveTo(x, 0)
        context.lineTo(x, mediaSize.height)
        context.stroke()
    }

}

function resolveLevelColor(accent: PolicySetupPrimitiveLevel['accent']): string {
    switch (accent) {
        case 'sl':
            return 'rgba(255, 99, 99, 0.96)'
        case 'tp':
            return 'rgba(76, 223, 153, 0.96)'
        case 'liq':
            return 'rgba(255, 73, 198, 0.94)'
    }
}

function resolveMarkerColor(tone: PolicySetupPrimitiveMarker['tone']): string {
    switch (tone) {
        case 'long':
            return '#14a67e'
        case 'short':
            return '#d96f3f'
        case 'exit':
            return '#25364b'
    }
}

function splitForecastLabel(label: string): string[] {
    if (label.startsWith('микро-')) {
        return ['микро', label.slice('микро-'.length)]
    }

    return [label]
}

function drawRoundedRect(
    context: CanvasRenderingContext2D,
    left: number,
    top: number,
    width: number,
    height: number,
    radius: number
): void {
    const boundedRadius = Math.min(radius, width / 2, height / 2)
    context.beginPath()
    context.moveTo(left + boundedRadius, top)
    context.arcTo(left + width, top, left + width, top + height, boundedRadius)
    context.arcTo(left + width, top + height, left, top + height, boundedRadius)
    context.arcTo(left, top + height, left, top, boundedRadius)
    context.arcTo(left, top, left + width, top, boundedRadius)
    context.closePath()
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}
