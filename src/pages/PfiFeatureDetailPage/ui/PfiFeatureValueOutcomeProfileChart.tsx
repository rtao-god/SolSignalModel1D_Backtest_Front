import { useEffect, useMemo, useRef, useState } from 'react'
import {
    ColorType,
    CrosshairMode,
    LineStyle,
    LineType,
    createChart,
    type HistogramData,
    type IChartApi,
    type ISeriesApi,
    type LineData,
    type Time,
    type WhitespaceData
} from 'lightweight-charts'
import classNames from '@/shared/lib/helpers/classNames'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { ReportViewControls, Text, type ReportViewControlGroup } from '@/shared/ui'
import type { PfiFeatureValueOutcomePointDto } from '@/shared/types/pfi.types'
import type { PfiFeatureValueOutcomeProfileProps } from './types'
import cls from './PfiFeatureDetailPage.module.scss'

const CHART_HEIGHT_PX = 320
const SYNTHETIC_BASE_UNIX_SECONDS = Math.floor(Date.parse('2000-01-01T00:00:00Z') / 1000)
const SUPPORT_BAR_COLOR = 'rgba(125, 160, 189, 0.26)'
const UP_LINE_COLOR = '#22c55e'
const FLAT_LINE_COLOR = '#cbd5e1'
const DOWN_LINE_COLOR = '#ef4444'
const EDGE_LINE_COLOR = '#7dd3fc'

type ValueOutcomeViewMode =
    | 'all_outcomes'
    | 'up_only'
    | 'flat_only'
    | 'down_only'
    | 'long_short_edge'

type ChartSeriesHandle = ISeriesApi<'Histogram'> | ISeriesApi<'Line'>

interface PreparedLineSeries {
    key: string
    label: string
    color: string
    data: Array<LineData<Time> | WhitespaceData<Time>>
    showZeroBaseline?: boolean
}

const VIEW_MODE_OPTIONS: ReportViewControlGroup<ValueOutcomeViewMode>['options'] = [
    {
        value: 'all_outcomes',
        label: 'Все исходы',
        tooltip:
            'Показывает сразу три линии: вероятность дня роста, вероятность дня падения и вероятность дня без выраженного движения при каждом значении признака.'
    },
    {
        value: 'up_only',
        label: 'Рост',
        tooltip:
            'Показывает только вероятность дня роста. Режим удобен, когда нужен один ответ: где значение признака чаще совпадало именно с ростом.'
    },
    {
        value: 'down_only',
        label: 'Падение',
        tooltip:
            'Показывает только вероятность дня падения. Режим нужен, когда важно отдельно найти зоны, где признак чаще совпадал со слабыми днями.'
    },
    {
        value: 'flat_only',
        label: 'Без движения',
        tooltip:
            'Показывает только вероятность дня без выраженного движения. Режим помогает увидеть зоны, где признак чаще совпадал с нейтральным рынком.'
    },
    {
        value: 'long_short_edge',
        label: 'Перевес',
        tooltip:
            'Показывает разницу между вероятностью роста и вероятностью падения. Линия выше нуля означает перевес в сторону роста, ниже нуля — перевес в сторону падения.'
    }
]

function toSyntheticTime(index: number): Time {
    return (SYNTHETIC_BASE_UNIX_SECONDS + index * 86400) as Time
}

function toSyntheticIndex(time: Time | null | undefined): number | null {
    if (typeof time !== 'number' || !Number.isFinite(time)) {
        return null
    }

    return Math.round((time - SYNTHETIC_BASE_UNIX_SECONDS) / 86400)
}

function formatScaleValue(value: number, decimals: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[pfi-value-outcome-profile] scale value must be finite. actual=${String(value)}.`)
    }

    const fixed = value.toFixed(decimals)
    if (decimals <= 0) {
        return fixed
    }

    return fixed.replace(/\.?0+$/, '')
}

function formatMetricValue(value: number, decimals: number, unit: string): string {
    return `${formatScaleValue(value, decimals)} ${unit}`
}

function buildSupportSeries(points: readonly PfiFeatureValueOutcomePointDto[]): HistogramData<Time>[] {
    return points.map((point, index) => ({
        time: toSyntheticTime(index),
        value: point.supportCount,
        color: SUPPORT_BAR_COLOR
    }))
}

function resolveMetricConfig(viewMode: ValueOutcomeViewMode) {
    if (viewMode === 'long_short_edge') {
        return {
            title: 'Перевес роста над падением',
            unit: 'п.п.',
            decimals: 1
        }
    }

    return {
        title: 'Вероятность исхода дня',
        unit: '%',
        decimals: 1
    }
}

function buildLinePoints(
    points: readonly PfiFeatureValueOutcomePointDto[],
    selector: (point: PfiFeatureValueOutcomePointDto) => number | undefined
): Array<LineData<Time> | WhitespaceData<Time>> {
    return points.map((point, index) => {
        const value = selector(point)
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return { time: toSyntheticTime(index) }
        }

        return {
            time: toSyntheticTime(index),
            value
        }
    })
}

function buildPreparedLineSeries(
    viewMode: ValueOutcomeViewMode,
    points: readonly PfiFeatureValueOutcomePointDto[]
): PreparedLineSeries[] {
    switch (viewMode) {
        case 'up_only':
            return [
                {
                    key: 'up',
                    label: 'Рост',
                    color: UP_LINE_COLOR,
                    data: buildLinePoints(points, point =>
                        typeof point.upProbability === 'number' ? point.upProbability * 100.0 : undefined
                    )
                }
            ]
        case 'flat_only':
            return [
                {
                    key: 'flat',
                    label: 'День без выраженного движения',
                    color: FLAT_LINE_COLOR,
                    data: buildLinePoints(points, point =>
                        typeof point.flatProbability === 'number' ? point.flatProbability * 100.0 : undefined
                    )
                }
            ]
        case 'down_only':
            return [
                {
                    key: 'down',
                    label: 'Падение',
                    color: DOWN_LINE_COLOR,
                    data: buildLinePoints(points, point =>
                        typeof point.downProbability === 'number' ? point.downProbability * 100.0 : undefined
                    )
                }
            ]
        case 'long_short_edge':
            return [
                {
                    key: 'edge',
                    label: 'Перевес роста над падением',
                    color: EDGE_LINE_COLOR,
                    data: buildLinePoints(points, point =>
                        typeof point.longShortEdge === 'number' ? point.longShortEdge * 100.0 : undefined
                    ),
                    showZeroBaseline: true
                }
            ]
        case 'all_outcomes':
        default:
            return [
                {
                    key: 'up',
                    label: 'Рост',
                    color: UP_LINE_COLOR,
                    data: buildLinePoints(points, point =>
                        typeof point.upProbability === 'number' ? point.upProbability * 100.0 : undefined
                    )
                },
                {
                    key: 'flat',
                    label: 'День без выраженного движения',
                    color: FLAT_LINE_COLOR,
                    data: buildLinePoints(points, point =>
                        typeof point.flatProbability === 'number' ? point.flatProbability * 100.0 : undefined
                    )
                },
                {
                    key: 'down',
                    label: 'Падение',
                    color: DOWN_LINE_COLOR,
                    data: buildLinePoints(points, point =>
                        typeof point.downProbability === 'number' ? point.downProbability * 100.0 : undefined
                    )
                }
            ]
    }
}

// График работает на time-scale библиотеке, но ось X здесь не время.
// Поэтому профиль маппится на синтетическую последовательность точек, а подписи шкалы
// всегда восстанавливаются обратно в реальные значения признака.
export default function PfiFeatureValueOutcomeProfileChart({
    profile,
    className
}: PfiFeatureValueOutcomeProfileProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRefs = useRef<ChartSeriesHandle[]>([])
    const axisPointsRef = useRef(profile.points)
    const valueDecimalsRef = useRef(profile.valueDecimals)

    const [viewMode, setViewMode] = useState<ValueOutcomeViewMode>('all_outcomes')

    const metricConfig = useMemo(() => resolveMetricConfig(viewMode), [viewMode])
    const supportSeries = useMemo(() => buildSupportSeries(profile.points), [profile.points])
    const lineSeries = useMemo(() => buildPreparedLineSeries(viewMode, profile.points), [profile.points, viewMode])

    const controlGroups = useMemo<ReportViewControlGroup<ValueOutcomeViewMode>[]>(
        () => [
            {
                key: 'value-outcome-view',
                label: 'Режим графика',
                infoTooltip:
                    'График показывает, как разные значения признака были связаны с дальнейшим исходом дня. Полупрозрачные столбцы на фоне всегда показывают, сколько дней было рядом с каждым значением.',
                value: viewMode,
                options: VIEW_MODE_OPTIONS,
                onChange: setViewMode
            }
        ],
        [viewMode]
    )

    const metaItems = useMemo(() => {
        const items = [
            `${profile.scaleTitle}`,
            `Шаг ${formatMetricValue(profile.gridStep, profile.valueDecimals, profile.scaleUnit)}`,
            `${profile.observationCount} дней`
        ]

        if (profile.coverageStartDayKeyUtc && profile.coverageEndDayKeyUtc) {
            items.push(`${profile.coverageStartDayKeyUtc} -> ${profile.coverageEndDayKeyUtc}`)
        }

        items.push(metricConfig.title)
        return items
    }, [
        metricConfig.title,
        profile.coverageEndDayKeyUtc,
        profile.coverageStartDayKeyUtc,
        profile.gridStep,
        profile.observationCount,
        profile.scaleTitle,
        profile.scaleUnit,
        profile.valueDecimals
    ])

    useEffect(() => {
        axisPointsRef.current = profile.points
        valueDecimalsRef.current = profile.valueDecimals
    }, [profile.points, profile.valueDecimals])

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
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.12, bottom: 0.18 }
            },
            leftPriceScale: {
                visible: false,
                borderVisible: false,
                scaleMargins: { top: 0.82, bottom: 0.04 }
            },
            timeScale: {
                borderVisible: false,
                timeVisible: false,
                secondsVisible: false,
                tickMarkFormatter: (time: Time) => {
                    const index = toSyntheticIndex(time)
                    const point = typeof index === 'number' ? axisPointsRef.current[index] : undefined
                    if (!point) {
                        return ''
                    }

                    return formatScaleValue(point.value, valueDecimalsRef.current)
                }
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    visible: true,
                    labelVisible: false,
                    color: 'rgba(186, 199, 214, 0.72)',
                    width: 1,
                    style: LineStyle.Solid
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
        if (!chartInstance) {
            return
        }

        chartInstance.applyOptions({
            timeScale: {
                tickMarkFormatter: (time: Time) => {
                    const index = toSyntheticIndex(time)
                    const point = typeof index === 'number' ? axisPointsRef.current[index] : undefined
                    if (!point) {
                        return ''
                    }

                    return formatScaleValue(point.value, valueDecimalsRef.current)
                }
            }
        })
    }, [profile.points, profile.valueDecimals])

    useEffect(() => {
        const chartInstance = chartRef.current
        if (!chartInstance) {
            return
        }

        for (const series of seriesRefs.current) {
            chartInstance.removeSeries(series)
        }
        seriesRefs.current = []

        const supportHistogram = chartInstance.addHistogramSeries({
            priceScaleId: 'left',
            color: SUPPORT_BAR_COLOR,
            priceLineVisible: false,
            lastValueVisible: false
        })
        supportHistogram.setData(supportSeries)
        seriesRefs.current.push(supportHistogram)

        const minMove = metricConfig.decimals > 0 ? 1 / 10 ** metricConfig.decimals : 1

        for (const definition of lineSeries) {
            const line = chartInstance.addLineSeries({
                color: definition.color,
                lineWidth: 2,
                lineType: LineType.Simple,
                lineStyle: LineStyle.Solid,
                crosshairMarkerVisible: false,
                priceLineVisible: false,
                lastValueVisible: false,
                priceFormat: {
                    type: 'price',
                    precision: metricConfig.decimals,
                    minMove
                }
            })
            line.setData(definition.data)
            if (definition.showZeroBaseline) {
                line.createPriceLine({
                    price: 0,
                    color: 'rgba(203, 213, 225, 0.46)',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: false,
                    title: ''
                })
            }
            seriesRefs.current.push(line)
        }

        chartInstance.timeScale().fitContent()
    }, [lineSeries, metricConfig.decimals, supportSeries])

    return (
        <section className={classNames(cls.valueOutcomeCard, {}, [className ?? ''])}>
            <header className={cls.chartHeader}>
                <div className={cls.chartHeaderMain}>
                    <Text type='h3' className={cls.cardTitle}>
                        {profile.title}
                    </Text>
                    <Text className={cls.chartDescription}>{renderTermTooltipRichText(profile.description)}</Text>
                    <div className={cls.chartMeta}>
                        {metaItems.map(item => (
                            <span key={item} className={cls.chartMetaItem}>
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </header>

            <div className={cls.valueOutcomeControls}>
                <ReportViewControls groups={controlGroups} />
            </div>

            <div ref={containerRef} className={cls.valueOutcomeCanvas} />

            <div className={cls.valueOutcomeLegend}>
                {lineSeries.map(series => (
                    <span key={series.key} className={cls.valueOutcomeLegendItem}>
                        <span className={cls.rollingLegendSwatch} style={{ backgroundColor: series.color }} />
                        <span className={cls.rollingLegendLabel}>{series.label}</span>
                    </span>
                ))}
                <span className={cls.valueOutcomeLegendItem}>
                    <span className={cls.valueOutcomeSupportSwatch} />
                    <span className={cls.rollingLegendLabel}>Число дней рядом со значением</span>
                </span>
            </div>
        </section>
    )
}
