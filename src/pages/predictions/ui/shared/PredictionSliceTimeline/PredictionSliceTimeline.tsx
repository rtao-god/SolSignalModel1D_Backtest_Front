import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { formatIsoDateHuman } from '@/shared/utils/dateFormat'
import { Text } from '@/shared/ui'
import { TermTooltip, renderRegisteredTermTooltipDescriptionById, renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import type {
    CurrentPredictionBackfilledTrainingScopeStatsDto,
    CurrentPredictionTrainingScope
} from '@/shared/api/endpoints/reportEndpoints'
import cls from './PredictionSliceTimeline.module.scss'

interface PredictionSliceTimelineProps {
    stats: CurrentPredictionBackfilledTrainingScopeStatsDto
    activeScope: CurrentPredictionTrainingScope
    className?: string
}

interface DayKeyPoint {
    iso: string
    utcMs: number
}

interface SegmentCardView {
    key: 'warmup' | 'train' | 'oos' | 'recent'
    title: string
    startIso: string
    endIso: string
    countLabel: string
    isActive: boolean
}

interface BoundaryMarkerView {
    key: 'warmupStart' | 'featureReady' | 'oosStart' | 'end'
    label: string
    percent: number
    align: 'start' | 'center' | 'end'
}

interface BoundaryMarkerLayout {
    leftPx: number
    row: number
}

interface DimensionLineView {
    key: 'warmup' | 'train' | 'oos' | 'recent'
    startPercent: number
    endPercent: number
    label: ReactNode
    toneClassName: string
    labelAlignClassName: string
    laneClassName: string
    labelClassName?: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const SCALE_BOUNDARY_MIN_GAP_PX = 8
const SCALE_BOUNDARY_ROW_HEIGHT_PX = 36

function parseDayKeyPoint(raw: string, fieldName: string): DayKeyPoint {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
    if (!match) {
        throw new Error(`[prediction-slice-timeline] Invalid UTC day key. field=${fieldName}; value=${raw}.`)
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const utcMs = Date.UTC(year, month - 1, day)

    return {
        iso: raw,
        utcMs
    }
}

function shiftDayKeyIso(point: DayKeyPoint, daysDelta: number): string {
    if (!Number.isInteger(daysDelta) || daysDelta === 0) {
        throw new Error(`[prediction-slice-timeline] day shift must be a non-zero integer. value=${daysDelta}.`)
    }

    return new Date(point.utcMs + daysDelta * DAY_MS).toISOString().slice(0, 10)
}

function countInclusiveCalendarDays(start: DayKeyPoint, end: DayKeyPoint, label: string): number {
    const daySpan = Math.floor((end.utcMs - start.utcMs) / DAY_MS) + 1
    if (!Number.isInteger(daySpan) || daySpan <= 0) {
        throw new Error(
            `[prediction-slice-timeline] Invalid calendar span. label=${label}; start=${start.iso}; end=${end.iso}.`
        )
    }

    return daySpan
}

function resolveRussianCountWord(
    value: number,
    singular: string,
    dual: string,
    plural: string
): string {
    const absValue = Math.abs(value) % 100
    const lastDigit = absValue % 10

    if (absValue >= 11 && absValue <= 19) {
        return plural
    }

    if (lastDigit === 1) {
        return singular
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return dual
    }

    return plural
}

function formatCount(value: number, locale: string): string {
    return value.toLocaleString(locale)
}

function formatHistoryDayCount(value: number, locale: string): string {
    if (locale.toLowerCase().startsWith('ru')) {
        return `${formatCount(value, locale)} ${resolveRussianCountWord(value, 'день истории', 'дня истории', 'дней истории')}`
    }

    return `${formatCount(value, locale)} history days`
}

function formatCalendarDayCount(value: number, locale: string): string {
    if (locale.toLowerCase().startsWith('ru')) {
        return `${formatCount(value, locale)} ${resolveRussianCountWord(value, 'календарный день', 'календарных дня', 'календарных дней')}`
    }

    return `${formatCount(value, locale)} calendar days`
}

function formatHumanDate(iso: string, locale: string): string {
    return formatIsoDateHuman(iso, {
        locale,
        omitYearForCurrent: false,
        timeZone: 'UTC'
    })
}

function formatPercentLabel(value: number, locale: string): string {
    const normalizedValue = Math.round(value * 10) / 10

    return `${normalizedValue.toLocaleString(locale, {
        minimumFractionDigits: Number.isInteger(normalizedValue) ? 0 : 1,
        maximumFractionDigits: 1
    })}%`
}

// Компонент показывает один и тот же owner-split для текущего прогноза и истории,
// чтобы пользователь видел одинаковые границы разогрева, TRAIN и OOS на обеих страницах.
export function PredictionSliceTimeline({ stats, activeScope, className }: PredictionSliceTimelineProps) {
    const { t, i18n } = useTranslation('reports')
    const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith('ru') ? 'ru-RU' : 'en-US'
    const warmupTopLabel = t('predictionSliceTimeline.dimensions.warmupDisplayTop')
    const warmupBottomLabel = t('predictionSliceTimeline.dimensions.warmupDisplayBottom')
    const warmupTooltipLabel = `${warmupTopLabel} ${warmupBottomLabel}`
    const scaleBoundariesRef = useRef<HTMLDivElement | null>(null)
    const boundaryItemRefs = useRef<Partial<Record<BoundaryMarkerView['key'], HTMLSpanElement | null>>>({})
    const [boundaryLayoutByKey, setBoundaryLayoutByKey] = useState<Partial<Record<BoundaryMarkerView['key'], BoundaryMarkerLayout>>>({})
    const [boundaryRowCount, setBoundaryRowCount] = useState(1)

    const view = useMemo(() => {
        const warmupStart = parseDayKeyPoint(stats.indicatorWarmupStartDateUtc, 'indicatorWarmupStartDateUtc')
        const fullStart = parseDayKeyPoint(stats.fullStartDateUtc, 'fullStartDateUtc')
        const trainStart = parseDayKeyPoint(stats.trainStartDateUtc, 'trainStartDateUtc')
        const trainEnd = parseDayKeyPoint(stats.trainEndDateUtc, 'trainEndDateUtc')
        const oosStart = parseDayKeyPoint(stats.oosStartDateUtc, 'oosStartDateUtc')
        const oosEnd = parseDayKeyPoint(stats.oosEndDateUtc, 'oosEndDateUtc')
        const recentStart = parseDayKeyPoint(stats.recentStartDateUtc, 'recentStartDateUtc')
        const recentEnd = parseDayKeyPoint(stats.recentEndDateUtc, 'recentEndDateUtc')

        const warmupCalendarDays =
            warmupStart.utcMs < fullStart.utcMs ? Math.floor((fullStart.utcMs - warmupStart.utcMs) / DAY_MS) : 0
        const trainCalendarDays = countInclusiveCalendarDays(trainStart, trainEnd, 'train')
        const oosCalendarDays = countInclusiveCalendarDays(oosStart, oosEnd, 'oos')
        const recentCalendarDays = countInclusiveCalendarDays(recentStart, recentEnd, 'recent')
        const warmupEndIso = warmupCalendarDays > 0 ? shiftDayKeyIso(fullStart, -1) : fullStart.iso
        const hasWarmup = warmupCalendarDays > 0
        const showRecent = !stats.recentMatchesOos && stats.recentDays > 0
        const totalTimelineDays = Math.max(warmupCalendarDays + trainCalendarDays + oosCalendarDays, 1)
        const recentOverlayPercent =
            showRecent && oosCalendarDays > 0 ? Math.min((recentCalendarDays / oosCalendarDays) * 100, 100) : 0
        const fullHistoryStartPercent = totalTimelineDays > 0 ? (warmupCalendarDays / totalTimelineDays) * 100 : 0
        const oosStartPercent =
            totalTimelineDays > 0 ? ((warmupCalendarDays + trainCalendarDays) / totalTimelineDays) * 100 : 0
        const recentStartPercent =
            showRecent && totalTimelineDays > 0 ?
                ((warmupCalendarDays + trainCalendarDays + Math.max(oosCalendarDays - recentCalendarDays, 0)) / totalTimelineDays) * 100
            :   100
        const trainRulePercent = Math.max(0, 100 - stats.oosHistoryDaySharePercent)
        const activeSummary = (() => {
            switch (activeScope) {
                case 'train':
                    return t('predictionSliceTimeline.activeSummary.train', {
                        start: formatHumanDate(stats.trainStartDateUtc, locale),
                        end: formatHumanDate(stats.trainEndDateUtc, locale)
                    })
                case 'oos':
                    return t('predictionSliceTimeline.activeSummary.oos', {
                        start: formatHumanDate(stats.oosStartDateUtc, locale),
                        end: formatHumanDate(stats.oosEndDateUtc, locale)
                    })
                case 'recent':
                    return t('predictionSliceTimeline.activeSummary.recent', {
                        start: formatHumanDate(stats.recentStartDateUtc, locale),
                        end: formatHumanDate(stats.recentEndDateUtc, locale)
                    })
                case 'full':
                default:
                    return t('predictionSliceTimeline.activeSummary.full', {
                        start: formatHumanDate(stats.fullStartDateUtc, locale),
                        end: formatHumanDate(stats.fullEndDateUtc, locale)
                    })
            }
        })()

        const cards: SegmentCardView[] = [
            ...(hasWarmup ?
                [
                    {
                        key: 'warmup' as const,
                        title: t('predictionSliceTimeline.segments.warmup.title'),
                        startIso: stats.indicatorWarmupStartDateUtc,
                        endIso: warmupEndIso,
                        countLabel: formatCalendarDayCount(warmupCalendarDays, locale),
                        isActive: false
                    }
                ]
            :   []),
            {
                key: 'train',
                title: t('predictionSliceTimeline.segments.train.title'),
                startIso: stats.trainStartDateUtc,
                endIso: stats.trainEndDateUtc,
                countLabel: formatHistoryDayCount(stats.trainDays, locale),
                isActive: activeScope === 'train' || activeScope === 'full'
            },
            {
                key: 'oos',
                title: t('predictionSliceTimeline.segments.oos.title'),
                startIso: stats.oosStartDateUtc,
                endIso: stats.oosEndDateUtc,
                countLabel: formatHistoryDayCount(stats.oosDays, locale),
                isActive: activeScope === 'oos' || activeScope === 'full'
            },
            ...(showRecent ?
                [
                    {
                        key: 'recent' as const,
                        title: t('predictionSliceTimeline.segments.recent.title'),
                        startIso: stats.recentStartDateUtc,
                        endIso: stats.recentEndDateUtc,
                        countLabel: formatHistoryDayCount(stats.recentDays, locale),
                        isActive: activeScope === 'recent'
                    }
                ]
            :   [])
        ]

        const boundaryMarkers: BoundaryMarkerView[] = [
            {
                key: 'warmupStart',
                label: t('predictionSliceTimeline.boundaries.warmupStart'),
                percent: 0,
                align: 'start'
            },
            ...(hasWarmup ?
                [
                    {
                        key: 'featureReady' as const,
                        label: t('predictionSliceTimeline.boundaries.featureReady'),
                        percent: fullHistoryStartPercent,
                        align: 'center' as const
                    }
                ]
            :   []),
            {
                key: 'oosStart',
                label: t('predictionSliceTimeline.boundaries.oosStart'),
                percent: oosStartPercent,
                align: 'center'
            },
            {
                key: 'end',
                label: t('predictionSliceTimeline.boundaries.end'),
                percent: 100,
                align: 'end'
            }
        ]

        // Свежий хвост — вложенный поддиапазон внутри OOS, поэтому он идёт отдельной нижней
        // размерной линией, а основные срезы читаются на общем верхнем уровне.
        const dimensionLines: DimensionLineView[] = [
            ...(hasWarmup ?
                [
                    {
                        key: 'warmup' as const,
                        startPercent: 0,
                        endPercent: fullHistoryStartPercent,
                        label:
                            <TermTooltip
                                term={warmupTooltipLabel}
                                displayTerm={
                                    <span className={cls.warmupDisplayTerm}>
                                        <span className={cls.warmupDisplayTermLine}>{warmupTopLabel}</span>
                                        <span className={cls.warmupDisplayTermLine}>{warmupBottomLabel}</span>
                                    </span>
                                }
                                tooltipTitle={warmupTooltipLabel}
                                description={() =>
                                    renderRegisteredTermTooltipDescriptionById('history-warmup', warmupTooltipLabel)
                                }
                                type='span'
                            />,
                        toneClassName: cls.scaleDimensionWarmup,
                        labelAlignClassName: cls.scaleDimensionLabelStart,
                        laneClassName: cls.scaleDimensionPrimaryLane,
                        labelClassName: cls.scaleDimensionLabelWarmup
                    }
                ]
            :   []),
            {
                key: 'train',
                startPercent: fullHistoryStartPercent,
                endPercent: oosStartPercent,
                label: renderTermTooltipRichText(
                    t('predictionSliceTimeline.dimensions.train', {
                        percent: formatPercentLabel(trainRulePercent, locale)
                    })
                ),
                toneClassName: cls.scaleDimensionTrain,
                labelAlignClassName: cls.scaleDimensionLabelCenter,
                laneClassName: cls.scaleDimensionPrimaryLane
            },
            {
                key: 'oos',
                startPercent: oosStartPercent,
                endPercent: 100,
                label: renderTermTooltipRichText(
                    t('predictionSliceTimeline.dimensions.oos', {
                        percent: formatPercentLabel(stats.oosHistoryDaySharePercent, locale)
                    })
                ),
                toneClassName: cls.scaleDimensionOos,
                labelAlignClassName: cls.scaleDimensionLabelCenter,
                laneClassName: cls.scaleDimensionPrimaryLane
            },
            ...(showRecent ?
                [
                    {
                        key: 'recent' as const,
                        startPercent: recentStartPercent,
                        endPercent: 100,
                        label: renderTermTooltipRichText(
                            t('predictionSliceTimeline.dimensions.recent', {
                                percent: formatPercentLabel(stats.recentHistoryDaySharePercent, locale)
                            })
                        ),
                        toneClassName: cls.scaleDimensionRecent,
                        labelAlignClassName: cls.scaleDimensionLabelEnd,
                        laneClassName: cls.scaleDimensionNestedLane
                    }
                ]
            :   [])
        ]

        return {
            activeSummary,
            hasWarmup,
            showRecent,
            warmupCalendarDays,
            trainCalendarDays,
            oosCalendarDays,
            totalTimelineDays,
            recentOverlayPercent,
            cards,
            boundaryMarkers,
            dimensionLines,
            fullHistoryStartPercent,
            fullStartLabel: formatHumanDate(stats.fullStartDateUtc, locale),
            fullEndLabel: formatHumanDate(stats.fullEndDateUtc, locale),
            oosStartLabel: formatHumanDate(stats.oosStartDateUtc, locale),
            warmupStartLabel: formatHumanDate(stats.indicatorWarmupStartDateUtc, locale)
        }
    }, [activeScope, locale, stats, t])

    useLayoutEffect(() => {
        const container = scaleBoundariesRef.current
        if (!container) {
            return
        }

        const recalculateBoundaryLayout = () => {
            const containerWidth = container.clientWidth
            if (containerWidth <= 0) {
                return
            }

            const measuredMarkers = view.boundaryMarkers
                .map(marker => {
                    const markerNode = boundaryItemRefs.current[marker.key]
                    const markerWidth = Math.max(markerNode?.offsetWidth ?? 0, 1)
                    let leftPx = (containerWidth * marker.percent) / 100

                    if (marker.align === 'center') {
                        leftPx -= markerWidth / 2
                    } else if (marker.align === 'end') {
                        leftPx -= markerWidth
                    }

                    leftPx = Math.max(0, Math.min(leftPx, containerWidth - markerWidth))

                    return {
                        key: marker.key,
                        width: markerWidth,
                        leftPx,
                        rightPx: leftPx + markerWidth
                    }
                })
                .sort((left, right) => left.leftPx - right.leftPx)

            const rowRightEdges: number[] = []
            const nextLayoutByKey: Partial<Record<BoundaryMarkerView['key'], BoundaryMarkerLayout>> = {}

            measuredMarkers.forEach((marker, markerIndex) => {
                let nextLeftPx = marker.leftPx
                let rowIndex = rowRightEdges.findIndex(rightEdge => nextLeftPx >= rightEdge + SCALE_BOUNDARY_MIN_GAP_PX)

                const previousMarker = markerIndex > 0 ? measuredMarkers[markerIndex - 1] : null
                const shouldGlueTrainToWarmup =
                    marker.key === 'featureReady' && previousMarker?.key === 'warmupStart' && rowRightEdges.length > 0

                if (shouldGlueTrainToWarmup) {
                    rowIndex = 0
                    nextLeftPx = rowRightEdges[0]
                }

                if (rowIndex === -1) {
                    rowIndex = rowRightEdges.length
                    rowRightEdges.push(nextLeftPx + marker.width)
                } else {
                    rowRightEdges[rowIndex] = nextLeftPx + marker.width
                }

                nextLayoutByKey[marker.key] = {
                    leftPx: nextLeftPx,
                    row: rowIndex
                }
            })

            setBoundaryLayoutByKey(previousLayout => {
                const previousKeys = Object.keys(previousLayout)
                const nextKeys = Object.keys(nextLayoutByKey)
                const hasSameKeys =
                    previousKeys.length === nextKeys.length &&
                    nextKeys.every(key => Object.prototype.hasOwnProperty.call(previousLayout, key))

                if (hasSameKeys) {
                    const hasChanged = nextKeys.some(key => {
                        const typedKey = key as BoundaryMarkerView['key']
                        const previous = previousLayout[typedKey]
                        const next = nextLayoutByKey[typedKey]

                        return !previous || !next || previous.leftPx !== next.leftPx || previous.row !== next.row
                    })

                    if (!hasChanged) {
                        return previousLayout
                    }
                }

                return nextLayoutByKey
            })
            setBoundaryRowCount(Math.max(rowRightEdges.length, 1))
        }

        recalculateBoundaryLayout()

        const resizeObserver = new ResizeObserver(() => {
            recalculateBoundaryLayout()
        })

        resizeObserver.observe(container)

        return () => {
            resizeObserver.disconnect()
        }
    }, [view.boundaryMarkers])

    return (
        <section className={classNames(cls.PredictionSliceTimeline, {}, [className ?? ''])}>
            <div className={cls.header}>
                <Text type='h3' className={cls.title}>
                    {t('predictionSliceTimeline.title')}
                </Text>
                <Text type='p' className={cls.subtitle}>
                    {renderTermTooltipRichText(t('predictionSliceTimeline.subtitle'))}
                </Text>
                <Text type='p' className={cls.activeSummary}>
                    {renderTermTooltipRichText(view.activeSummary)}
                </Text>
            </div>

            <div className={cls.milestoneRail}>
                {view.hasWarmup && (
                    <>
                        <span className={cls.dateChip}>{view.warmupStartLabel}</span>
                        <span className={classNames(cls.segmentChip, {}, [cls.segmentChipWarmup])}>
                            {renderTermTooltipRichText(t('predictionSliceTimeline.segments.warmup.railLabel'))}
                        </span>
                    </>
                )}
                <span className={cls.dateChip}>{view.fullStartLabel}</span>
                <span
                    className={classNames(cls.segmentChip, {
                        [cls.segmentChipActive]: activeScope === 'train' || activeScope === 'full'
                    }, [cls.segmentChipTrain])}>
                    {renderTermTooltipRichText(t('predictionSliceTimeline.segments.train.railLabel'))}
                </span>
                <span className={cls.dateChip}>{view.oosStartLabel}</span>
                <span
                    className={classNames(cls.segmentChip, {
                        [cls.segmentChipActive]: activeScope === 'oos' || activeScope === 'recent' || activeScope === 'full'
                    }, [cls.segmentChipOos])}>
                    {renderTermTooltipRichText(t('predictionSliceTimeline.segments.oos.railLabel'))}
                </span>
                <span className={cls.dateChip}>{view.fullEndLabel}</span>
            </div>

            <div className={cls.scaleBlock}>
                <div className={cls.scaleBar} aria-hidden='true'>
                    {view.hasWarmup && (
                        <div
                            className={classNames(cls.scaleSegment, {}, [cls.scaleWarmup])}
                            style={{ flexGrow: view.warmupCalendarDays }}
                        />
                    )}
                    <div
                        className={classNames(cls.scaleSegment, {
                            [cls.scaleSegmentActive]: activeScope === 'train' || activeScope === 'full'
                        }, [cls.scaleTrain])}
                        style={{ flexGrow: view.trainCalendarDays }}
                    />
                    <div
                        className={classNames(cls.scaleSegment, {
                            [cls.scaleSegmentActive]: activeScope === 'oos' || activeScope === 'recent' || activeScope === 'full'
                        }, [cls.scaleOos])}
                        style={{ flexGrow: view.oosCalendarDays }}>
                        {view.showRecent && (
                            <div
                                className={classNames(cls.recentOverlay, {
                                    [cls.recentOverlayActive]: activeScope === 'recent'
                                })}
                                style={{ width: `${view.recentOverlayPercent}%` }}
                            />
                        )}
                    </div>
                </div>

                <div
                    ref={scaleBoundariesRef}
                    className={cls.scaleBoundaries}
                    style={{ minHeight: `${boundaryRowCount * SCALE_BOUNDARY_ROW_HEIGHT_PX}px` }}>
                    {view.boundaryMarkers.map(marker => {
                        const markerLayout = boundaryLayoutByKey[marker.key]

                        return (
                            <span
                                key={marker.key}
                                ref={node => {
                                    boundaryItemRefs.current[marker.key] = node
                                }}
                                className={cls.scaleBoundaryItem}
                                style={{
                                    left: `${markerLayout?.leftPx ?? 0}px`,
                                    top: `${(markerLayout?.row ?? 0) * SCALE_BOUNDARY_ROW_HEIGHT_PX}px`
                                }}>
                                {marker.label}
                            </span>
                        )
                    })}
                </div>

                <div className={cls.scaleDimensions}>
                    <div className={cls.scaleDimensionEndpoints} aria-hidden='true'>
                        <span
                            className={classNames(cls.scaleDimensionEndpoint, {
                                [cls.scaleDimensionEndpointPinnedStart]: view.fullHistoryStartPercent <= 0.5
                            }, [cls.scaleDimensionEndpointStart])}
                            style={{ left: `${view.fullHistoryStartPercent}%` }}>
                            0%
                        </span>
                        <span className={classNames(cls.scaleDimensionEndpoint, {}, [cls.scaleDimensionEndpointEnd])}>100%</span>
                    </div>

                    <div
                        className={cls.scaleDimensionCanvas}
                        style={{
                            minHeight: view.showRecent ? '68px' : '34px'
                        }}
                        aria-hidden='true'>
                        {view.dimensionLines.map(line => {
                            const leftPercent = Math.min(line.startPercent, line.endPercent)
                            const widthPercent = Math.max(line.endPercent - line.startPercent, 0)

                            return (
                                <div
                                    key={line.key}
                                    className={classNames(cls.scaleDimension, {}, [line.toneClassName, line.laneClassName])}
                                    style={{
                                        left: `${leftPercent}%`,
                                        width: `${widthPercent}%`
                                    }}>
                                    <span className={cls.scaleDimensionLine} />
                                    <span className={classNames(cls.scaleDimensionLabel, {}, [line.labelAlignClassName, line.labelClassName ?? ''])}>
                                        {line.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className={cls.cards}>
                {view.cards.map(card => (
                    <article
                        key={card.key}
                        className={classNames(cls.card, {
                            [cls.cardActive]: card.isActive
                        }, [cls[`card_${card.key}` as keyof typeof cls] ?? ''])}>
                        <Text type='p' className={cls.cardTitle}>
                            {renderTermTooltipRichText(card.title)}
                        </Text>
                        <Text type='p' className={cls.cardRange}>
                            {formatHumanDate(card.startIso, locale)} — {formatHumanDate(card.endIso, locale)}
                        </Text>
                        <Text type='p' className={cls.cardCount}>
                            {card.countLabel}
                        </Text>
                    </article>
                ))}
            </div>
        </section>
    )
}
