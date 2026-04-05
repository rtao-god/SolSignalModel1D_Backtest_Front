import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ReferenceLine,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'
import classNames from '@/shared/lib/helpers/classNames'
import { useLocale } from '@/shared/lib/i18n'
import { resolveChartAxisTickStyle } from '@/shared/lib/typography/runtimeTokens'
import Text from '@/shared/ui/Text/ui/Text/Text'
import cls from './ReportMetricChart.module.scss'

export type ReportMetricChartTone = 'positive' | 'negative' | 'neutral' | 'warning' | 'danger'

export interface ReportMetricChartTooltipRow {
    label: string
    value: string
}

export interface ReportMetricBarDatum {
    id: string
    label: string
    value: number
    tone?: ReportMetricChartTone
}

export interface ReportMetricScatterDatum {
    id: string
    label: string
    x: number
    y: number
    tone?: ReportMetricChartTone
}

interface BaseChartProps<TDatum> {
    data: readonly TDatum[]
    height?: number
    maxHeight?: number
    className?: string
    selectedId?: string | null
    emptyTitle: string
    emptyDescription: string
    onSelect?: (datum: TDatum) => void
    getTooltipTitle?: (datum: TDatum) => string
    getTooltipRows?: (datum: TDatum) => ReportMetricChartTooltipRow[]
}

interface ReportMetricBarChartProps<TDatum extends ReportMetricBarDatum> extends BaseChartProps<TDatum> {
    valueLabel: string
    referenceLineY?: number | null
    valueFormatter?: (value: number) => string
    orientation?: 'vertical' | 'horizontal'
    fitWidthToContainer?: boolean
}

interface ReportMetricScatterChartProps<TDatum extends ReportMetricScatterDatum> extends BaseChartProps<TDatum> {
    xLabel: string
    yLabel: string
    referenceLineX?: number | null
    referenceLineY?: number | null
    xValueFormatter?: (value: number) => string
    yValueFormatter?: (value: number) => string
}

const CHART_GRID_COLOR = 'rgba(148, 163, 184, 0.14)'
const CHART_AXIS_COLOR = 'rgba(226, 232, 240, 0.86)'
const CHART_REFERENCE_COLOR = 'rgba(148, 163, 184, 0.34)'

const CHART_TONE_FILL: Record<ReportMetricChartTone, string> = {
    positive: 'var(--report-metric-chart-positive-fill, #34d399)',
    negative: '#f87171',
    neutral: '#38bdf8',
    warning: '#fbbf24',
    danger: '#fb7185'
}

const CHART_TONE_STROKE: Record<ReportMetricChartTone, string> = {
    positive: 'var(--report-metric-chart-positive-stroke, #6ee7b7)',
    negative: '#fca5a5',
    neutral: '#7dd3fc',
    warning: '#fde68a',
    danger: '#fda4af'
}

function resolveDefaultNumberFormatter(
    value: number,
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
): string {
    return formatNumber(value, {
        maximumFractionDigits: 2,
        minimumFractionDigits: Math.abs(value) < 10 ? 2 : 0
    })
}

function truncateAxisLabel(label: string, maxLength: number = 22): string {
    if (label.length <= maxLength) {
        return label
    }

    return `${label.slice(0, maxLength - 1)}…`
}

function resolveToneStyle(tone: ReportMetricChartTone | undefined, isSelected: boolean, opacityScale: number = 1) {
    const safeTone = tone ?? 'neutral'

    return {
        fill: CHART_TONE_FILL[safeTone],
        stroke: isSelected ? '#f8fafc' : CHART_TONE_STROKE[safeTone],
        strokeWidth: isSelected ? 2.2 : 1.1,
        opacity: (isSelected ? 1 : 0.92) * opacityScale
    }
}

function resolveContainerHeight(height: number, maxHeight: number | undefined) {
    const canvasHeight = Math.max(height, 220)
    const containerHeight = maxHeight ? Math.min(canvasHeight, maxHeight) : canvasHeight

    return {
        canvasHeight,
        containerHeight,
        isScrollable: containerHeight < canvasHeight
    }
}

function resolveVerticalCanvasWidth(itemCount: number): number | null {
    if (itemCount <= 12) {
        return null
    }

    return Math.max(760, itemCount * 58)
}

function resolveScatterPointVisual(totalPoints: number, isSelected: boolean) {
    if (isSelected) {
        return { radius: 8, opacityScale: 1 }
    }

    if (totalPoints >= 80) {
        return { radius: 3.8, opacityScale: 0.72 }
    }

    if (totalPoints >= 48) {
        return { radius: 4.4, opacityScale: 0.8 }
    }

    if (totalPoints >= 24) {
        return { radius: 5, opacityScale: 0.88 }
    }

    return { radius: 5.5, opacityScale: 0.92 }
}

function useObservedContainerWidth() {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [containerWidth, setContainerWidth] = useState(0)

    useEffect(() => {
        const element = containerRef.current
        if (!element) {
            return
        }

        let frameId = 0

        const commitWidth = (nextWidth: number) => {
            if (!Number.isFinite(nextWidth) || nextWidth <= 0) {
                return
            }

            const roundedWidth = Math.round(nextWidth)
            setContainerWidth(prevWidth => (prevWidth === roundedWidth ? prevWidth : roundedWidth))
        }

        const scheduleWidthUpdate = (nextWidth: number) => {
            if (frameId !== 0) {
                cancelAnimationFrame(frameId)
            }

            frameId = requestAnimationFrame(() => {
                frameId = 0
                commitWidth(nextWidth)
            })
        }

        commitWidth(element.clientWidth)

        if (typeof ResizeObserver !== 'function') {
            const handleWindowResize = () => scheduleWidthUpdate(element.clientWidth)
            window.addEventListener('resize', handleWindowResize)

            return () => {
                if (frameId !== 0) {
                    cancelAnimationFrame(frameId)
                }
                window.removeEventListener('resize', handleWindowResize)
            }
        }

        // Общий owner-контракт для report charts: ширину считаем сами и отдаём
        // в recharts явно, чтобы не ловить внутренний resize-loop ResponsiveContainer.
        const resizeObserver = new ResizeObserver(entries => {
            const entry = entries[0]
            if (!entry) {
                return
            }

            scheduleWidthUpdate(entry.contentRect.width)
        })

        resizeObserver.observe(element)

        return () => {
            if (frameId !== 0) {
                cancelAnimationFrame(frameId)
            }
            resizeObserver.disconnect()
        }
    }, [])

    return { containerRef, containerWidth }
}

function renderEmptyState(title: string, description: string) {
    return (
        <div className={cls.emptyState}>
            <Text className={cls.emptyTitle}>{title}</Text>
            <Text className={cls.emptyDescription}>{description}</Text>
        </div>
    )
}

const ChartTooltip = memo(function ChartTooltip({
    title,
    rows
}: {
    title: string
    rows: readonly ReportMetricChartTooltipRow[]
}) {
    return (
        <div className={cls.tooltip}>
            <Text className={cls.tooltipTitle}>{title}</Text>

            <div className={cls.tooltipRows}>
                {rows.map(row => (
                    <div key={`${row.label}-${row.value}`} className={cls.tooltipRow}>
                        <span className={cls.tooltipLabel}>{row.label}</span>
                        <span className={cls.tooltipValue}>{row.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
})

/**
 * Тёмная bar-chart обёртка для сравнительных отчётов.
 * Компонент фиксирует контраст, tooltip и единый стиль осей, чтобы страницы
 * не переопределяли эти детали вручную и не расходились по визуалу.
 */
export function ReportMetricBarChart<TDatum extends ReportMetricBarDatum>({
    data,
    height = 320,
    maxHeight,
    className,
    selectedId = null,
    emptyTitle,
    emptyDescription,
    onSelect,
    getTooltipTitle,
    getTooltipRows,
    valueLabel,
    referenceLineY = 0,
    valueFormatter,
    orientation = 'vertical',
    fitWidthToContainer = false
}: ReportMetricBarChartProps<TDatum>) {
    const { formatNumber } = useLocale()

    const dataById = useMemo(() => new Map(data.map(item => [item.id, item])), [data])
    const chartData = useMemo(() => [...data], [data])
    const formatValue = (value: number) =>
        valueFormatter ? valueFormatter(value) : resolveDefaultNumberFormatter(value, formatNumber)
    const chartFrame = resolveContainerHeight(height, maxHeight)
    const chartCanvasWidth =
        orientation === 'vertical' && !fitWidthToContainer ? resolveVerticalCanvasWidth(data.length) : null
    const { containerRef, containerWidth } = useObservedContainerWidth()
    const chartAxisTickStyle = resolveChartAxisTickStyle(CHART_AXIS_COLOR)
    const handleBarClick = useCallback(
        (_: unknown, index: number) => {
            const datum = data[index]
            if (datum) {
                onSelect?.(datum)
            }
        },
        [data, onSelect]
    )
    const renderBarTooltip = useCallback(
        ({ active, payload }: { active?: boolean; payload?: readonly { payload?: TDatum }[] }) => {
            const payloadItem = payload?.[0]?.payload as TDatum | undefined
            if (!active || !payloadItem) {
                return null
            }

            const datum = dataById.get(payloadItem.id)
            if (!datum) {
                return null
            }

            const tooltipRows = getTooltipRows?.(datum) ?? [{ label: valueLabel, value: formatValue(datum.value) }]

            return <ChartTooltip title={getTooltipTitle?.(datum) ?? datum.label} rows={tooltipRows} />
        },
        [dataById, formatValue, getTooltipRows, getTooltipTitle, valueLabel]
    )

    if (data.length === 0) {
        return renderEmptyState(emptyTitle, emptyDescription)
    }

    const resolvedChartWidth = chartCanvasWidth ?? containerWidth

    return (
        <div
            ref={containerRef}
            className={classNames(cls.chartRoot, {}, [className ?? ''])}
            style={{
                height: chartFrame.containerHeight,
                overflowY: chartFrame.isScrollable ? 'auto' : undefined,
                overflowX: chartCanvasWidth ? 'auto' : undefined
            }}>
            <div
                style={{
                    height: chartFrame.canvasHeight,
                    minWidth: chartCanvasWidth ?? undefined
                }}>
                {resolvedChartWidth > 0 && (
                    <BarChart
                        width={resolvedChartWidth}
                        height={chartFrame.canvasHeight}
                        data={chartData}
                        layout={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
                        margin={
                            orientation === 'horizontal' ?
                                { top: 12, right: 20, left: 8, bottom: 12 }
                            :   { top: 18, right: 14, left: 0, bottom: 48 }
                        }>
                        <CartesianGrid
                            stroke={CHART_GRID_COLOR}
                            vertical={orientation === 'horizontal'}
                            horizontal={orientation !== 'horizontal'}
                        />
                        {orientation === 'horizontal' ?
                            <>
                                <XAxis
                                    type='number'
                                    tick={chartAxisTickStyle}
                                    tickFormatter={value =>
                                        typeof value === 'number' ? formatValue(value) : String(value)
                                    }
                                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    type='category'
                                    dataKey='label'
                                    tick={chartAxisTickStyle}
                                    tickFormatter={value => truncateAxisLabel(String(value), 30)}
                                    width={190}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                />
                            </>
                        :   <>
                                <XAxis
                                    dataKey='label'
                                    tick={chartAxisTickStyle}
                                    tickFormatter={value => truncateAxisLabel(String(value))}
                                    angle={-26}
                                    textAnchor='end'
                                    height={58}
                                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={chartAxisTickStyle}
                                    tickFormatter={value =>
                                        typeof value === 'number' ? formatValue(value) : String(value)
                                    }
                                    width={76}
                                    axisLine={false}
                                    tickLine={false}
                                />
                            </>
                        }
                        <Tooltip
                            isAnimationActive={false}
                            cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                            content={renderBarTooltip}
                        />

                        {referenceLineY !== null &&
                            (orientation === 'horizontal' ?
                                <ReferenceLine
                                    x={referenceLineY}
                                    stroke={CHART_REFERENCE_COLOR}
                                    strokeDasharray='4 4'
                                />
                            :   <ReferenceLine
                                    y={referenceLineY}
                                    stroke={CHART_REFERENCE_COLOR}
                                    strokeDasharray='4 4'
                                />)}

                        <Bar
                            dataKey='value'
                            radius={[6, 6, 6, 6]}
                            barSize={orientation === 'horizontal' ? 18 : 28}
                            isAnimationActive={false}
                            onClick={handleBarClick}>
                            {data.map(datum => {
                                const toneStyle = resolveToneStyle(datum.tone, datum.id === selectedId)

                                return (
                                    <Cell
                                        key={datum.id}
                                        fill={toneStyle.fill}
                                        stroke={toneStyle.stroke}
                                        strokeWidth={toneStyle.strokeWidth}
                                        fillOpacity={toneStyle.opacity}
                                        style={{ cursor: onSelect ? 'pointer' : 'default' }}
                                    />
                                )
                            })}
                        </Bar>
                    </BarChart>
                )}
            </div>
        </div>
    )
}

/**
 * Тёмная scatter-chart обёртка для risk/return сравнения.
 * Все точки получают единый tooltip и контрастные оси, чтобы кликабельный
 * режим выбора строки не зависел от конкретной страницы.
 */
export function ReportMetricScatterChart<TDatum extends ReportMetricScatterDatum>({
    data,
    height = 320,
    maxHeight,
    className,
    selectedId = null,
    emptyTitle,
    emptyDescription,
    onSelect,
    getTooltipTitle,
    getTooltipRows,
    xLabel,
    yLabel,
    referenceLineX = null,
    referenceLineY = 0,
    xValueFormatter,
    yValueFormatter
}: ReportMetricScatterChartProps<TDatum>) {
    const { formatNumber } = useLocale()

    const dataById = useMemo(() => new Map(data.map(item => [item.id, item])), [data])
    const chartData = useMemo(() => [...data], [data])
    const chartFrame = resolveContainerHeight(height, maxHeight)
    const formatX = (value: number) =>
        xValueFormatter ? xValueFormatter(value) : resolveDefaultNumberFormatter(value, formatNumber)
    const formatY = (value: number) =>
        yValueFormatter ? yValueFormatter(value) : resolveDefaultNumberFormatter(value, formatNumber)
    const { containerRef, containerWidth } = useObservedContainerWidth()
    const chartAxisTickStyle = resolveChartAxisTickStyle(CHART_AXIS_COLOR)
    const handleScatterSelect = useCallback(
        (payload?: { payload?: TDatum }) => {
            const datum = payload?.payload as TDatum | undefined
            if (datum) {
                onSelect?.(datum)
            }
        },
        [onSelect]
    )
    const renderScatterTooltip = useCallback(
        ({ active, payload }: { active?: boolean; payload?: readonly { payload?: TDatum }[] }) => {
            const payloadItem = payload?.[0]?.payload as TDatum | undefined
            if (!active || !payloadItem) {
                return null
            }

            const datum = dataById.get(payloadItem.id)
            if (!datum) {
                return null
            }

            const tooltipRows = getTooltipRows?.(datum) ?? [
                { label: xLabel, value: formatX(datum.x) },
                { label: yLabel, value: formatY(datum.y) }
            ]

            return <ChartTooltip title={getTooltipTitle?.(datum) ?? datum.label} rows={tooltipRows} />
        },
        [dataById, formatX, formatY, getTooltipRows, getTooltipTitle, xLabel, yLabel]
    )
    const renderScatterShape = useCallback(
        (shapeProps: unknown) => {
            const safeProps = shapeProps as {
                cx?: number
                cy?: number
                payload?: TDatum
            }
            const datum = safeProps.payload
            if (!datum || typeof safeProps.cx !== 'number' || typeof safeProps.cy !== 'number') {
                return <g />
            }

            const pointVisual = resolveScatterPointVisual(data.length, datum.id === selectedId)
            const toneStyle = resolveToneStyle(datum.tone, datum.id === selectedId, pointVisual.opacityScale)

            return (
                <circle
                    cx={safeProps.cx}
                    cy={safeProps.cy}
                    r={pointVisual.radius}
                    fill={toneStyle.fill}
                    stroke={toneStyle.stroke}
                    strokeWidth={toneStyle.strokeWidth}
                    fillOpacity={toneStyle.opacity}
                    style={{ cursor: onSelect ? 'pointer' : 'default' }}
                />
            )
        },
        [data.length, onSelect, selectedId]
    )

    if (data.length === 0) {
        return renderEmptyState(emptyTitle, emptyDescription)
    }

    return (
        <div
            ref={containerRef}
            className={classNames(cls.chartRoot, {}, [className ?? ''])}
            style={{ height: chartFrame.containerHeight }}>
            <div style={{ height: chartFrame.canvasHeight }}>
                {containerWidth > 0 && (
                    <ScatterChart width={containerWidth} height={chartFrame.canvasHeight} margin={{ top: 18, right: 18, left: 8, bottom: 24 }}>
                        <CartesianGrid stroke={CHART_GRID_COLOR} />
                        <XAxis
                            type='number'
                            dataKey='x'
                            name={xLabel}
                            tick={chartAxisTickStyle}
                            tickFormatter={value => (typeof value === 'number' ? formatX(value) : String(value))}
                            axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                            tickLine={false}
                        />
                        <YAxis
                            type='number'
                            dataKey='y'
                            name={yLabel}
                            tick={chartAxisTickStyle}
                            tickFormatter={value => (typeof value === 'number' ? formatY(value) : String(value))}
                            width={76}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            isAnimationActive={false}
                            cursor={{ strokeDasharray: '4 4', stroke: 'rgba(148, 163, 184, 0.22)' }}
                            content={renderScatterTooltip}
                        />

                        {referenceLineX !== null && (
                            <ReferenceLine x={referenceLineX} stroke={CHART_REFERENCE_COLOR} strokeDasharray='4 4' />
                        )}
                        {referenceLineY !== null && (
                            <ReferenceLine y={referenceLineY} stroke={CHART_REFERENCE_COLOR} strokeDasharray='4 4' />
                        )}

                        <Scatter
                            data={chartData}
                            isAnimationActive={false}
                            onClick={handleScatterSelect}
                            shape={renderScatterShape}
                        />
                    </ScatterChart>
                )}
            </div>
        </div>
    )
}
