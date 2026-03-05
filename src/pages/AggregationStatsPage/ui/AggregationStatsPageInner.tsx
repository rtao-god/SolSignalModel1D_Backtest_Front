import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import type {
    AggregationMetricsSegmentSnapshotDto,
    AggregationProbsDebugRowDto,
    AggregationProbsSegmentSnapshotDto,
    LayerMetricsSnapshotDto
} from '@/shared/types/aggregation.types'
import cls from './AggregationStatsPage.module.scss'
import type { AggregationStatsPageInnerProps } from './types'
import {
    formatCount,
    formatDayDirectionPositionLabel,
    formatNumber,
    formatPercent,
    formatProb3,
    formatRange,
    formatUtcDayKey,
    formatUtcDayKeyHuman
} from './aggregationStatsUtils'

const renderTooltip = (term: string, description?: string) => {
    if (!description) return term
    return <TermTooltip term={term} description={enrichTermTooltipDescription(description, { term })} type='span' />
}

export function AggregationStatsPageInner({ className, probs, metrics }: AggregationStatsPageInnerProps) {
    const { t } = useTranslation('reports')
    const rootClassName = classNames(cls.AggregationStatsPage, {}, [className ?? ''])

    const sections = useMemo(
        () => [
            { id: 'agg-probs', label: t('aggregation.inner.sections.probs'), anchor: 'agg-probs' },
            { id: 'agg-metrics', label: t('aggregation.inner.sections.metrics'), anchor: 'agg-metrics' },
            { id: 'agg-debug', label: t('aggregation.inner.sections.debug'), anchor: 'agg-debug' }
        ],
        [t]
    )

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={rootClassName}>
            <header className={cls.headerRow}>
                <div className={cls.headerMain}>
                    <Text type='h2'>{t('aggregation.inner.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('aggregation.inner.header.subtitle')}</Text>
                </div>

                <div className={cls.metaGrid}>
                    <div className={cls.metaCard}>
                        <div className={cls.metaTitle}>{t('aggregation.inner.meta.dateRange')}</div>
                        <div className={cls.metaValue}>{formatRange(probs.MinDateUtc, probs.MaxDateUtc)}</div>
                    </div>
                    <div className={cls.metaCard}>
                        <div className={cls.metaTitle}>{t('aggregation.inner.meta.totalInput')}</div>
                        <div className={cls.metaValue}>{formatCount(probs.TotalInputRecords)}</div>
                    </div>
                    <div className={cls.metaCard}>
                        <div className={cls.metaTitle}>{t('aggregation.inner.meta.excluded')}</div>
                        <div className={cls.metaValue}>{formatCount(probs.ExcludedCount)}</div>
                    </div>
                    <div className={cls.metaCard}>
                        <div className={cls.metaTitle}>{t('aggregation.inner.meta.segmentsAndDebug')}</div>
                        <div className={cls.metaValue}>
                            {probs.Segments.length} / {probs.DebugLastDays.length}
                        </div>
                    </div>
                </div>
            </header>

            <section id='agg-probs' className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('aggregation.inner.probs.title')}
                    </Text>
                    <Text className={cls.sectionHint}>{t('aggregation.inner.probs.hint')}</Text>
                </div>

                <div className={cls.segmentsGrid}>
                    {probs.Segments.map(segment => (
                        <ProbSegmentCard key={segment.SegmentName} segment={segment} />
                    ))}
                </div>
            </section>

            <section id='agg-metrics' className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('aggregation.inner.metrics.title')}
                    </Text>
                    <Text className={cls.sectionHint}>{t('aggregation.inner.metrics.hint')}</Text>
                </div>

                <div className={cls.segmentsGrid}>
                    {metrics.Segments.map(segment => (
                        <MetricsSegmentCard key={segment.SegmentName} segment={segment} />
                    ))}
                </div>
            </section>

            <section id='agg-debug' className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('aggregation.inner.debug.title')}
                    </Text>
                    <Text className={cls.sectionHint}>{t('aggregation.inner.debug.hint')}</Text>
                </div>

                {probs.DebugLastDays.length === 0 ?
                    <Text>{t('aggregation.inner.debug.empty')}</Text>
                :   <>
                        <Text className={cls.tableHint}>{t('aggregation.inner.debug.tableHint')}</Text>
                        <div className={cls.tableScroll}>
                            <table className={cls.table}>
                                <thead>
                                    <tr>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.dateUtc.label'),
                                                t('aggregation.inner.tooltips.debug.dateUtc')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.true.label'),
                                                t('aggregation.inner.tooltips.debug.true')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.day.label'),
                                                t('aggregation.inner.tooltips.debug.day')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.dayMicro.label'),
                                                t('aggregation.inner.tooltips.debug.dayMicro')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.total.label'),
                                                t('aggregation.inner.tooltips.debug.total')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.pDay.label'),
                                                t('aggregation.inner.tooltips.debug.pDay')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.pDayMicro.label'),
                                                t('aggregation.inner.tooltips.debug.pDayMicro')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.pTotal.label'),
                                                t('aggregation.inner.tooltips.debug.pTotal')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.microUsed.label'),
                                                t('aggregation.inner.tooltips.debug.microUsed')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.slUsed.label'),
                                                t('aggregation.inner.tooltips.debug.slUsed')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.microAgree.label'),
                                                t('aggregation.inner.tooltips.debug.microAgree')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.slPenLong.label'),
                                                t('aggregation.inner.tooltips.debug.slPenLong')
                                            )}
                                        </th>
                                        <th>
                                            {renderTooltip(
                                                t('aggregation.inner.debug.columns.slPenShort.label'),
                                                t('aggregation.inner.tooltips.debug.slPenShort')
                                            )}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {probs.DebugLastDays.map(row => (
                                        <DebugRow key={formatUtcDayKey(row.DateUtc)} row={row} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                }
            </section>

            <SectionPager
                sections={sections}
                currentIndex={currentIndex}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={handlePrev}
                onNext={handleNext}
            />
        </div>
    )
}

function ProbSegmentCard({ segment }: { segment: AggregationProbsSegmentSnapshotDto }) {
    const { t } = useTranslation('reports')
    const rangeText = formatRange(segment.FromDateUtc, segment.ToDateUtc)
    const recordsText = formatCount(segment.RecordsCount)
    const slRatio = `${formatCount(segment.RecordsWithSlScore)}/${formatCount(segment.RecordsCount)}`

    return (
        <div className={cls.segmentCard}>
            <div className={cls.segmentHeader}>
                <Text className={cls.segmentTitle}>{segment.SegmentLabel || segment.SegmentName}</Text>
                <Text className={cls.segmentMeta}>
                    {t('aggregation.inner.segment.rangePrefix')} {rangeText}
                </Text>
                <Text className={cls.segmentMeta}>
                    {t('aggregation.inner.segment.recordsPrefix')} {recordsText}
                </Text>
            </div>

            <div className={cls.segmentPills}>
                <span className={cls.pill}>
                    {renderTooltip(
                        t('aggregation.inner.pills.confDay.label'),
                        t('aggregation.inner.tooltips.pills.confDay')
                    )}
                    : {formatPercent(segment.AvgConfDay)}
                </span>
                <span className={cls.pill}>
                    {renderTooltip(
                        t('aggregation.inner.pills.confMicro.label'),
                        t('aggregation.inner.tooltips.pills.confMicro')
                    )}
                    : {formatPercent(segment.AvgConfMicro)}
                </span>
                <span className={cls.pill}>
                    {renderTooltip(
                        t('aggregation.inner.pills.slScoreDays.label'),
                        t('aggregation.inner.tooltips.pills.slScoreDays')
                    )}
                    : {slRatio}
                </span>
            </div>

            <Text className={cls.segmentHint}>{t('aggregation.inner.segment.hint')}</Text>

            <div className={cls.tableScroll}>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            <th>
                                {renderTooltip(
                                    t('aggregation.inner.probColumns.layer.label'),
                                    t('aggregation.inner.tooltips.probTable.layer')
                                )}
                            </th>
                            <th>{renderTooltip('P_up', t('aggregation.inner.tooltips.probTable.pUp'))}</th>
                            <th>{renderTooltip('P_flat', t('aggregation.inner.tooltips.probTable.pFlat'))}</th>
                            <th>{renderTooltip('P_down', t('aggregation.inner.tooltips.probTable.pDown'))}</th>
                            <th>{renderTooltip('Sum', t('aggregation.inner.tooltips.probTable.sum'))}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <LayerAvgRow name='Day' layer={segment.Day} />
                        <LayerAvgRow name='Day+Micro' layer={segment.DayMicro} />
                        <LayerAvgRow name='Total' layer={segment.Total} />
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function LayerAvgRow({
    name,
    layer
}: {
    name: string
    layer: { PUp: number; PFlat: number; PDown: number; Sum: number }
}) {
    return (
        <tr>
            <td>{name}</td>
            <td>{formatPercent(layer.PUp)}</td>
            <td>{formatPercent(layer.PFlat)}</td>
            <td>{formatPercent(layer.PDown)}</td>
            <td>{formatPercent(layer.Sum)}</td>
        </tr>
    )
}

function MetricsSegmentCard({ segment }: { segment: AggregationMetricsSegmentSnapshotDto }) {
    const { t } = useTranslation('reports')
    const rangeText = formatRange(segment.FromDateUtc, segment.ToDateUtc)
    const recordsText = formatCount(segment.RecordsCount)

    return (
        <div className={cls.segmentCard}>
            <div className={cls.segmentHeader}>
                <Text className={cls.segmentTitle}>{segment.SegmentLabel || segment.SegmentName}</Text>
                <Text className={cls.segmentMeta}>
                    {t('aggregation.inner.segment.rangePrefix')} {rangeText}
                </Text>
                <Text className={cls.segmentMeta}>
                    {t('aggregation.inner.segment.recordsPrefix')} {recordsText}
                </Text>
            </div>

            <div className={cls.metricsGrid}>
                <LayerMetricsCard layer={segment.Day} />
                <LayerMetricsCard layer={segment.DayMicro} />
                <LayerMetricsCard layer={segment.Total} />
            </div>
        </div>
    )
}

function LayerMetricsCard({ layer }: { layer: LayerMetricsSnapshotDto }) {
    const { t } = useTranslation('reports')
    const accuracy = formatPercent(layer.Accuracy)
    const microF1 = formatPercent(layer.MicroF1)
    const logLoss = formatNumber(layer.LogLoss, 4)

    return (
        <div className={cls.layerCard}>
            <Text className={cls.layerTitle}>{layer.LayerName}</Text>

            <Text className={cls.metricsHint}>{t('aggregation.inner.metrics.layerHint')}</Text>

            <div className={cls.metricsList}>
                <span className={cls.metricsLabel}>
                    {renderTooltip('Accuracy', t('aggregation.inner.tooltips.metrics.accuracy'))}
                </span>
                <span>{accuracy}</span>
                <span className={cls.metricsLabel}>
                    {renderTooltip('Micro-F1', t('aggregation.inner.tooltips.metrics.microF1'))}
                </span>
                <span>{microF1}</span>
                <span className={cls.metricsLabel}>
                    {renderTooltip('LogLoss', t('aggregation.inner.tooltips.metrics.logLoss'))}
                </span>
                <span>{logLoss}</span>
                <span className={cls.metricsLabel}>
                    {renderTooltip('N / Correct', t('aggregation.inner.tooltips.metrics.nCorrect'))}
                </span>
                <span>
                    {formatCount(layer.N)} / {formatCount(layer.Correct)}
                </span>
                <span className={cls.metricsLabel}>
                    {renderTooltip(
                        'Valid / Invalid log-loss',
                        t('aggregation.inner.tooltips.metrics.validInvalidLogLoss')
                    )}
                </span>
                <span>
                    {formatCount(layer.ValidForLogLoss)} / {formatCount(layer.InvalidForLogLoss)}
                </span>
            </div>

            <Text className={cls.confusionHint}>{t('aggregation.inner.metrics.confusionHint')}</Text>

            <ConfusionMatrixTable layer={layer} />
        </div>
    )
}

function ConfusionMatrixTable({ layer }: { layer: LayerMetricsSnapshotDto }) {
    const { t } = useTranslation('reports')
    const labels = [
        { id: 'down', label: t('aggregation.inner.confusion.labels.down') },
        { id: 'flat', label: t('aggregation.inner.confusion.labels.flat') },
        { id: 'up', label: t('aggregation.inner.confusion.labels.up') }
    ]

    return (
        <table className={cls.confusionTable}>
            <thead>
                <tr>
                    <th className={cls.confusionHeader}>
                        {renderTooltip(
                            t('aggregation.inner.confusion.truePredLabel'),
                            t('aggregation.inner.tooltips.confusion.truePred')
                        )}
                    </th>
                    {labels.map(item => (
                        <th key={item.id} className={cls.confusionHeader}>
                            {renderTooltip(item.label, t(`aggregation.inner.tooltips.confusion.labels.${item.id}`))}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {labels.map((item, rowIdx) => (
                    <tr key={item.id}>
                        <th className={cls.confusionHeader}>
                            {renderTooltip(item.label, t(`aggregation.inner.tooltips.confusion.labels.${item.id}`))}
                        </th>
                        {labels.map((_, colIdx) => {
                            const value = layer.Confusion?.[rowIdx]?.[colIdx]
                            return (
                                <td key={`${rowIdx}-${colIdx}`}>
                                    {formatCount(value, `${layer.LayerName}.Confusion[${rowIdx}][${colIdx}]`)}
                                </td>
                            )
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function DebugRow({ row }: { row: AggregationProbsDebugRowDto }) {
    const { t } = useTranslation('reports')
    const dayKeyLabel = formatUtcDayKey(row.DateUtc)
    const yes = t('aggregation.inner.bool.yes')
    const no = t('aggregation.inner.bool.no')

    return (
        <tr>
            <td>{formatUtcDayKeyHuman(row.DateUtc)}</td>
            <td>{formatDayDirectionPositionLabel(row.TrueLabel)}</td>
            <td>{formatDayDirectionPositionLabel(row.PredDay)}</td>
            <td>{formatDayDirectionPositionLabel(row.PredDayMicro)}</td>
            <td>{formatDayDirectionPositionLabel(row.PredTotal)}</td>
            <td>{formatProb3(row.PDay, `DebugLastDays[${dayKeyLabel}].PDay`)}</td>
            <td>{formatProb3(row.PDayMicro, `DebugLastDays[${dayKeyLabel}].PDayMicro`)}</td>
            <td>{formatProb3(row.PTotal, `DebugLastDays[${dayKeyLabel}].PTotal`)}</td>
            <td>{row.MicroUsed ? yes : no}</td>
            <td>{row.SlUsed ? yes : no}</td>
            <td>{row.MicroAgree ? yes : no}</td>
            <td>{row.SlPenLong ? yes : no}</td>
            <td>{row.SlPenShort ? yes : no}</td>
        </tr>
    )
}
