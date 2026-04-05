import { useEffect, useMemo, useRef, useState } from 'react'
import {
    ColorType,
    CrosshairMode,
    LineStyle,
    LineType,
    createChart,
    type IChartApi,
    type ISeriesApi,
    type LineData,
    type Time
} from 'lightweight-charts'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import type {
    PfiFeatureHistoryChartDto,
    PfiFeatureHistorySeriesDto,
    PfiFeatureHistoryVariantDto
} from '@/shared/types/pfi.types'
import { normalizeLightweightChartColor } from '@/shared/lib/charts/lightweightChartColor'
import type { PfiFeatureHistoryChartsProps } from './types'
import cls from './PfiFeatureDetailPage.module.scss'

const CHART_HEIGHT_PX = 320
const PRIMARY_LINE_COLOR = '#7dd3fc'
const FOCUSED_COMPETITOR_COLORS = ['#94a3b8', '#5eead4', '#facc15']

type SeriesVisibilityMode = 'primary' | 'top3' | 'top5' | 'all'

interface VisibilityOption {
    value: SeriesVisibilityMode
    label: string
}

interface PreparedSeries {
    featureName: string
    color: string
    data: LineData<Time>[]
    isPrimary: boolean
    isComparison: boolean
    latestValue: number | null
}

const visibilityOptions: VisibilityOption[] = [
    { value: 'primary', label: 'Только фича' },
    { value: 'top3', label: 'Фича + 3' },
    { value: 'top5', label: 'Фича + 5' },
    { value: 'all', label: 'Все серии' }
]

function toUnixSeconds(dayKeyUtc: string): number {
    const timestamp = Date.parse(`${dayKeyUtc}T00:00:00Z`)
    if (!Number.isFinite(timestamp)) {
        throw new Error(`[ui] invalid rolling day key: ${dayKeyUtc}.`)
    }

    return Math.floor(timestamp / 1000)
}

function toChartTime(dayKeyUtc: string): Time {
    return toUnixSeconds(dayKeyUtc) as Time
}

function resolveScoreScopeTitle(scoreScopeKey: string): string {
    switch (scoreScopeKey) {
        case 'train_oof':
            return 'OOF на обучающем окне'
        case 'oos':
            return 'Вне обучающего окна'
        case 'train':
            return 'Обучающее окно'
        case 'full_history':
            return 'Вся история'
        default:
            return scoreScopeKey
    }
}

function formatMetricValue(value: number, decimals: number, metricUnit: string): string {
    const formatted = value.toFixed(decimals)
    return `${formatted} ${metricUnit}`
}

function sortSeries(a: PfiFeatureHistorySeriesDto, b: PfiFeatureHistorySeriesDto): number {
    if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1
    }

    const leftRank = a.comparisonRank ?? Number.MAX_SAFE_INTEGER
    const rightRank = b.comparisonRank ?? Number.MAX_SAFE_INTEGER
    if (leftRank !== rightRank) {
        return leftRank - rightRank
    }

    return a.featureName.localeCompare(b.featureName, 'ru')
}

function selectVisibleSeries(
    orderedSeries: PfiFeatureHistorySeriesDto[],
    visibilityMode: SeriesVisibilityMode
): PfiFeatureHistorySeriesDto[] {
    if (visibilityMode === 'all') {
        return orderedSeries
    }

    if (visibilityMode === 'primary') {
        return orderedSeries.filter(series => series.isPrimary)
    }

    const maxComparisonRank = visibilityMode === 'top5' ? 5 : 3
    const focusedSeries = orderedSeries.filter(
        series => series.isPrimary || (series.comparisonRank ?? Number.MAX_SAFE_INTEGER) <= maxComparisonRank
    )
    if (focusedSeries.length > 1) {
        return focusedSeries
    }

    return orderedSeries.slice(0, Math.min(orderedSeries.length, 4))
}

function resolveSeriesColor(
    series: PfiFeatureHistorySeriesDto,
    visibleIndex: number,
    visibleCount: number
): string {
    if (series.isPrimary) {
        return normalizeLightweightChartColor(PRIMARY_LINE_COLOR, `pfi.history.primary.${series.featureName}`)
    }

    if ((series.comparisonRank ?? Number.MAX_SAFE_INTEGER) <= FOCUSED_COMPETITOR_COLORS.length) {
        return normalizeLightweightChartColor(
            FOCUSED_COMPETITOR_COLORS[(series.comparisonRank ?? 1) - 1] ?? FOCUSED_COMPETITOR_COLORS[0],
            `pfi.history.comparison.${series.featureName}`
        )
    }

    const hue = Math.round((visibleIndex / Math.max(visibleCount, 1)) * 300) + 20
    return normalizeLightweightChartColor(
        `hsla(${hue}, 68%, 63%, 0.42)`,
        `pfi.history.generated.${series.featureName}`
    )
}

function buildPreparedSeries(
    selectedChart: PfiFeatureHistoryChartDto,
    selectedVariant: PfiFeatureHistoryVariantDto,
    visibilityMode: SeriesVisibilityMode
): PreparedSeries[] {
    const orderedSeries = [...selectedVariant.series].sort(sortSeries)
    const visibleSeries = selectVisibleSeries(orderedSeries, visibilityMode)

    return visibleSeries.map((series, index) => ({
        featureName: series.featureName,
        color: resolveSeriesColor(series, index, visibleSeries.length),
        data: selectedChart.windows.map((window, windowIndex) => ({
            time: toChartTime(window.endDayKeyUtc),
            value: series.values[windowIndex] ?? 0
        })),
        isPrimary: series.isPrimary,
        isComparison: !series.isPrimary && (series.comparisonRank ?? Number.MAX_SAFE_INTEGER) <= 3,
        latestValue: series.values.at(-1) ?? null
    }))
}

function buildMetaLine(selectedChart: PfiFeatureHistoryChartDto, selectedVariant: PfiFeatureHistoryVariantDto): string[] {
    return [
        selectedChart.modelDisplayName,
        resolveScoreScopeTitle(selectedChart.scoreScopeKey),
        `Окно ${selectedChart.windowDays} дн.`,
        `Шаг ${selectedChart.stepDays} дн.`,
        `${selectedVariant.metricTitle} (${selectedVariant.metricUnit})`
    ]
}

interface SelectorGroupProps<T extends string> {
    title: string
    value: T
    options: ReadonlyArray<{ value: T; label: string }>
    onChange: (nextValue: T) => void
}

function SelectorGroup<T extends string>({ title, value, options, onChange }: SelectorGroupProps<T>) {
    return (
        <div className={cls.controlGroup}>
            <span className={cls.controlLabel}>{title}</span>
            <div className={cls.controlOptions}>
                {options.map(option => {
                    const isActive = option.value === value

                    return (
                        <button
                            key={option.value}
                            type='button'
                            className={classNames(cls.controlButton, { [cls.controlButtonActive]: isActive })}
                            onClick={() => onChange(option.value)}
                            aria-pressed={isActive}>
                            {option.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default function PfiFeatureRollingChart({ charts, className }: PfiFeatureHistoryChartsProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRefs = useRef<ISeriesApi<'Line'>[]>([])

    const [selectedChartKey, setSelectedChartKey] = useState(charts[0]?.chartKey ?? '')
    const [selectedVariantKey, setSelectedVariantKey] = useState('')
    const [visibilityMode, setVisibilityMode] = useState<SeriesVisibilityMode>('top3')

    const selectedChart = useMemo(
        () => charts.find(chart => chart.chartKey === selectedChartKey) ?? charts[0] ?? null,
        [charts, selectedChartKey]
    )

    useEffect(() => {
        if (!selectedChart && charts[0]) {
            setSelectedChartKey(charts[0].chartKey)
            return
        }

        if (selectedChart && selectedChart.chartKey !== selectedChartKey) {
            setSelectedChartKey(selectedChart.chartKey)
        }
    }, [charts, selectedChart, selectedChartKey])

    useEffect(() => {
        if (!selectedChart) {
            return
        }

        const nextVariant =
            selectedChart.variants.find(variant => variant.variantKey === selectedVariantKey) ??
            selectedChart.variants.find(variant => variant.variantKey === selectedChart.defaultVariantKey) ??
            selectedChart.variants[0]

        if (nextVariant && nextVariant.variantKey !== selectedVariantKey) {
            setSelectedVariantKey(nextVariant.variantKey)
        }
    }, [selectedChart, selectedVariantKey])

    const selectedVariant = useMemo(
        () =>
            selectedChart?.variants.find(variant => variant.variantKey === selectedVariantKey) ??
            selectedChart?.variants[0] ??
            null,
        [selectedChart, selectedVariantKey]
    )

    const chartOptions = useMemo(
        () =>
            charts.map(chart => ({
                value: chart.chartKey,
                label: chart.title
            })),
        [charts]
    )

    const variantOptions = useMemo(
        () =>
            selectedChart?.variants.map(variant => ({
                value: variant.variantKey,
                label: variant.title
            })) ?? [],
        [selectedChart]
    )

    const preparedSeries = useMemo(() => {
        if (!selectedChart || !selectedVariant) {
            return []
        }

        return buildPreparedSeries(selectedChart, selectedVariant, visibilityMode)
    }, [selectedChart, selectedVariant, visibilityMode])

    useEffect(() => {
        const container = containerRef.current
        if (!container || chartRef.current) {
            return
        }

        const chartInstance = createChart(container, {
            width: container.clientWidth,
            height: CHART_HEIGHT_PX,
            layout: { background: { type: ColorType.Solid, color: '#07131f' }, textColor: '#dbe7f2' },
            grid: {
                vertLines: { color: 'rgba(125, 160, 189, 0.08)' },
                horzLines: { color: 'rgba(125, 160, 189, 0.08)' }
            },
            rightPriceScale: { borderVisible: false },
            timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    visible: true,
                    labelVisible: true,
                    color: 'rgba(186, 199, 214, 0.72)',
                    width: 1,
                    style: LineStyle.Solid,
                    labelBackgroundColor: '#0f2031'
                },
                horzLine: {
                    visible: true,
                    labelVisible: true,
                    color: 'rgba(186, 199, 214, 0.72)',
                    width: 1,
                    style: LineStyle.Solid,
                    labelBackgroundColor: '#0f2031'
                }
            }
        })

        chartRef.current = chartInstance

        const resizeObserver = new ResizeObserver(() => {
            if (!containerRef.current || !chartRef.current) {
                return
            }

            chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
        })

        resizeObserver.observe(container)

        return () => {
            resizeObserver.disconnect()
            chartInstance.remove()
            chartRef.current = null
            seriesRefs.current = []
        }
    }, [])

    useEffect(() => {
        const chartInstance = chartRef.current
        if (!chartInstance || !selectedVariant) {
            return
        }

        for (const series of seriesRefs.current) {
            chartInstance.removeSeries(series)
        }
        seriesRefs.current = []

        chartInstance.priceScale('right').applyOptions({
            invertScale: selectedVariant.lowerValuesAreBetter
        })

        const minMove = selectedVariant.valueDecimals > 0 ? 1 / 10 ** selectedVariant.valueDecimals : 1
        seriesRefs.current = preparedSeries.map(item => {
            const series = chartInstance.addLineSeries({
                color: item.color,
                lineWidth: item.isPrimary ? 3 : item.isComparison ? 2 : 1,
                lineType: LineType.Simple,
                lineStyle: item.isPrimary ? LineStyle.Solid : item.isComparison ? LineStyle.Dashed : LineStyle.Dotted,
                crosshairMarkerVisible: false,
                priceLineVisible: false,
                lastValueVisible: false,
                priceFormat: {
                    type: 'price',
                    precision: selectedVariant.valueDecimals,
                    minMove
                }
            })

            series.setData(item.data)
            return series
        })

        chartInstance.timeScale().fitContent()
    }, [preparedSeries, selectedVariant])

    if (!selectedChart || !selectedVariant) {
        return null
    }

    const metaLine = buildMetaLine(selectedChart, selectedVariant)
    const totalSeries = selectedVariant.series.length
    const visibleSeries = preparedSeries.length

    return (
        <section className={classNames(cls.rollingChartCard, {}, [className ?? ''])}>
            <header className={cls.chartHeader}>
                <div className={cls.chartHeaderMain}>
                    <Text type='h3' className={cls.cardTitle}>
                        {selectedChart.title}
                    </Text>
                    <Text className={cls.chartDescription}>{selectedChart.description}</Text>
                    <div className={cls.chartMeta}>
                        {metaLine.map(item => (
                            <span key={item} className={cls.chartMetaItem}>
                                {item}
                            </span>
                        ))}
                        <span className={cls.chartMetaItem}>{`Показано ${visibleSeries} из ${totalSeries} серий`}</span>
                    </div>
                </div>
            </header>

            <div className={cls.chartControls}>
                {chartOptions.length > 1 && (
                    <SelectorGroup title='График' value={selectedChart.chartKey} options={chartOptions} onChange={setSelectedChartKey} />
                )}
                {variantOptions.length > 1 && (
                    <SelectorGroup
                        title='Метрика'
                        value={selectedVariant.variantKey}
                        options={variantOptions}
                        onChange={setSelectedVariantKey}
                    />
                )}
                <SelectorGroup
                    title='Серии'
                    value={visibilityMode}
                    options={visibilityOptions}
                    onChange={setVisibilityMode}
                />
            </div>

            <div ref={containerRef} className={cls.rollingChartCanvas} />

            <div className={cls.rollingLegend}>
                {preparedSeries.map(item => (
                    <div
                        key={item.featureName}
                        className={classNames(cls.rollingLegendItem, { [cls.rollingLegendPrimary]: item.isPrimary })}>
                        <span className={cls.rollingLegendSwatch} style={{ backgroundColor: item.color }} />
                        <span className={cls.rollingLegendLabel}>{item.featureName}</span>
                        {item.latestValue !== null && (
                            <span className={cls.rollingLegendValue}>
                                {formatMetricValue(
                                    item.latestValue,
                                    selectedVariant.valueDecimals,
                                    selectedVariant.metricUnit
                                )}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </section>
    )
}
