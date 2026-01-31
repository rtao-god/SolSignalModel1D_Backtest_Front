import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import type {
    AggregationMetricsSegmentSnapshotDto,
    AggregationProbsDebugRowDto,
    AggregationProbsSegmentSnapshotDto,
    LayerMetricsSnapshotDto
} from '@/shared/types/aggregation.types'
import cls from './AggregationStatsPage.module.scss'
import type { AggregationStatsPageInnerProps } from './aggregationStatsTypes'
import {
    formatDayDirectionLabel,
    formatNumber,
    formatPercent,
    formatProb3,
    formatRange,
    formatUtcDayKey
} from './aggregationStatsUtils'

/*
	AggregationStatsPageInner — UI отчёта по агрегации вероятностей и метрик.

	Зачем:
		- Показывает агрегированные вероятности по сегментам (Day / Day+Micro / Total).
		- Дает метрики качества и матрицы ошибок по тем же сегментам.
		- Добавляет debug-таблицу последних дней для диагностики overlay-слоёв.

	Источники данных и сайд-эффекты:
		- Данные приходят через props (готовые снапшоты).
		- useSectionPager синхронизирует hash и скролл по секциям.

	Контракты:
		- Сегменты приходят уже отсортированными бэкендом.
		- DebugLastDays может быть пустым (UI это допускает).
*/
export function AggregationStatsPageInner({ className, probs, metrics }: AggregationStatsPageInnerProps) {
    const rootClassName = classNames(cls.AggregationStatsPage, {}, [className ?? ''])

    const sections = [
        { id: 'agg-probs', label: 'Вероятности', anchor: 'agg-probs' },
        { id: 'agg-metrics', label: 'Метрики', anchor: 'agg-metrics' },
        { id: 'agg-debug', label: 'Debug последних дней', anchor: 'agg-debug' }
    ]

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={rootClassName}>
            <header className={cls.headerRow}>
                <div className={cls.headerMain}>
                    <Text type='h2'>Агрегация прогнозов</Text>
                    <Text className={cls.subtitle}>
                        Сводка вероятностей и метрик по основному и overlay-слоям (Day / Day+Micro / Total). Сегменты
                        отражают Train / OOS / Recent / Full, ниже — детальная статистика и debug по последним дням.
                    </Text>
                </div>

                <div className={cls.metaGrid}>
                    <div className={cls.metaCard}>
                        <div className={cls.metaTitle}>Диапазон дат</div>
                        <div className={cls.metaValue}>{formatRange(probs.MinDateUtc, probs.MaxDateUtc)}</div>
                    </div>
                    <div className={cls.metaCard}>
                        <div className={cls.metaTitle}>Всего входных записей</div>
                        <div className={cls.metaValue}>{probs.TotalInputRecords.toLocaleString('ru-RU')}</div>
                    </div>
                    <div className={cls.metaCard}>
                        <div className={cls.metaTitle}>Исключено из агрегации</div>
                        <div className={cls.metaValue}>{probs.ExcludedCount.toLocaleString('ru-RU')}</div>
                    </div>
                    <div className={cls.metaCard}>
                        <div className={cls.metaTitle}>Сегментов / Debug дней</div>
                        <div className={cls.metaValue}>
                            {probs.Segments.length} / {probs.DebugLastDays.length}
                        </div>
                    </div>
                </div>
            </header>

            <section id='agg-probs' className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Агрегированные вероятности
                    </Text>
                    <Text className={cls.sectionHint}>Средние P_up / P_flat / P_down по сегментам</Text>
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
                        Метрики качества
                    </Text>
                    <Text className={cls.sectionHint}>Accuracy, micro-F1 и log-loss по каждому слою</Text>
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
                        Debug последних дней
                    </Text>
                    <Text className={cls.sectionHint}>Проверяем, где micro/SL реально повлияли на итог</Text>
                </div>

                {probs.DebugLastDays.length === 0 ? (
                    <Text>Debug-строк нет. Проверь корректность генерации агрегации.</Text>
                ) : (
                    <div className={cls.tableScroll}>
                        <table className={cls.table}>
                            <thead>
                                <tr>
                                    <th>Дата (UTC)</th>
                                    <th>True</th>
                                    <th>Day</th>
                                    <th>Day+Micro</th>
                                    <th>Total</th>
                                    <th>P_day (U/F/D)</th>
                                    <th>P_day+micro (U/F/D)</th>
                                    <th>P_total (U/F/D)</th>
                                    <th>Micro used</th>
                                    <th>SL used</th>
                                    <th>Micro agree</th>
                                    <th>SL pen long</th>
                                    <th>SL pen short</th>
                                </tr>
                            </thead>
                            <tbody>
                                {probs.DebugLastDays.map(row => (
                                    <DebugRow key={formatUtcDayKey(row.DateUtc)} row={row} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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

// Карточка одного сегмента для вероятностей.
function ProbSegmentCard({ segment }: { segment: AggregationProbsSegmentSnapshotDto }) {
    const rangeText = formatRange(segment.FromDateUtc, segment.ToDateUtc)
    const recordsText = segment.RecordsCount.toLocaleString('ru-RU')
    const slRatio = segment.RecordsCount > 0 ? `${segment.RecordsWithSlScore}/${segment.RecordsCount}` : '—'

    return (
        <div className={cls.segmentCard}>
            <div className={cls.segmentHeader}>
                <Text className={cls.segmentTitle}>{segment.SegmentLabel || segment.SegmentName}</Text>
                <Text className={cls.segmentMeta}>Диапазон: {rangeText}</Text>
                <Text className={cls.segmentMeta}>Записей: {recordsText}</Text>
            </div>

            <div className={cls.segmentPills}>
                <span className={cls.pill}>Conf Day: {formatPercent(segment.AvgConfDay)}</span>
                <span className={cls.pill}>Conf Micro: {formatPercent(segment.AvgConfMicro)}</span>
                <span className={cls.pill}>SL-score дней: {slRatio}</span>
            </div>

            <div className={cls.tableScroll}>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            <th>Слой</th>
                            <th>P_up</th>
                            <th>P_flat</th>
                            <th>P_down</th>
                            <th>Sum</th>
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

// Строка таблицы средних вероятностей.
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

// Карточка сегмента с метриками качества.
function MetricsSegmentCard({ segment }: { segment: AggregationMetricsSegmentSnapshotDto }) {
    const rangeText = formatRange(segment.FromDateUtc, segment.ToDateUtc)
    const recordsText = segment.RecordsCount.toLocaleString('ru-RU')

    return (
        <div className={cls.segmentCard}>
            <div className={cls.segmentHeader}>
                <Text className={cls.segmentTitle}>{segment.SegmentLabel || segment.SegmentName}</Text>
                <Text className={cls.segmentMeta}>Диапазон: {rangeText}</Text>
                <Text className={cls.segmentMeta}>Записей: {recordsText}</Text>
            </div>

            <div className={cls.metricsGrid}>
                <LayerMetricsCard layer={segment.Day} />
                <LayerMetricsCard layer={segment.DayMicro} />
                <LayerMetricsCard layer={segment.Total} />
            </div>
        </div>
    )
}

// Карточка метрик одного слоя.
function LayerMetricsCard({ layer }: { layer: LayerMetricsSnapshotDto }) {
    const accuracy = formatPercent(layer.Accuracy)
    const microF1 = formatPercent(layer.MicroF1)
    const logLoss = formatNumber(layer.LogLoss, 4)

    return (
        <div className={cls.layerCard}>
            <Text className={cls.layerTitle}>{layer.LayerName}</Text>

            <div className={cls.metricsList}>
                <span className={cls.metricsLabel}>Accuracy</span>
                <span>{accuracy}</span>
                <span className={cls.metricsLabel}>Micro-F1</span>
                <span>{microF1}</span>
                <span className={cls.metricsLabel}>LogLoss</span>
                <span>{logLoss}</span>
                <span className={cls.metricsLabel}>N / Correct</span>
                <span>
                    {layer.N.toLocaleString('ru-RU')} / {layer.Correct.toLocaleString('ru-RU')}
                </span>
                <span className={cls.metricsLabel}>Valid / Invalid log-loss</span>
                <span>
                    {layer.ValidForLogLoss.toLocaleString('ru-RU')} /{' '}
                    {layer.InvalidForLogLoss.toLocaleString('ru-RU')}
                </span>
            </div>

            <ConfusionMatrixTable layer={layer} />
        </div>
    )
}

// Таблица confusion matrix (true vs predicted).
function ConfusionMatrixTable({ layer }: { layer: LayerMetricsSnapshotDto }) {
    const labels = ['Падение', 'Боковик', 'Рост']

    return (
        <table className={cls.confusionTable}>
            <thead>
                <tr>
                    <th className={cls.confusionHeader}>True → Pred</th>
                    {labels.map(label => (
                        <th key={label} className={cls.confusionHeader}>
                            {label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {labels.map((label, rowIdx) => (
                    <tr key={label}>
                        <th className={cls.confusionHeader}>{label}</th>
                        {labels.map((_, colIdx) => {
                            const value = layer.Confusion?.[rowIdx]?.[colIdx]
                            return <td key={`${rowIdx}-${colIdx}`}>{Number.isFinite(value) ? value : '—'}</td>
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// Debug-строка последнего дня.
function DebugRow({ row }: { row: AggregationProbsDebugRowDto }) {
    return (
        <tr>
            <td>{formatUtcDayKey(row.DateUtc)}</td>
            <td>{formatDayDirectionLabel(row.TrueLabel)}</td>
            <td>{formatDayDirectionLabel(row.PredDay)}</td>
            <td>{formatDayDirectionLabel(row.PredDayMicro)}</td>
            <td>{formatDayDirectionLabel(row.PredTotal)}</td>
            <td>{formatProb3(row.PDay)}</td>
            <td>{formatProb3(row.PDayMicro)}</td>
            <td>{formatProb3(row.PTotal)}</td>
            <td>{row.MicroUsed ? 'да' : 'нет'}</td>
            <td>{row.SlUsed ? 'да' : 'нет'}</td>
            <td>{row.MicroAgree ? 'да' : 'нет'}</td>
            <td>{row.SlPenLong ? 'да' : 'нет'}</td>
            <td>{row.SlPenShort ? 'да' : 'нет'}</td>
        </tr>
    )
}
