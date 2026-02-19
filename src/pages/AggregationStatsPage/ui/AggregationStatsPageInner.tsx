import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import { useMemo } from 'react'
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

const PROB_TABLE_TOOLTIPS: Record<string, string> = {
    'Слой': 'Какая стадия агрегации используется: Day (базовая модель), Day+Micro (с учётом микро‑оверлея) и Total (с учётом SL‑оверлея).',
    'P_up': 'Средняя вероятность роста (Up) по выбранному слою и сегменту.',
    'P_flat': 'Средняя вероятность боковика (Flat) по выбранному слою и сегменту.',
    'P_down': 'Средняя вероятность падения (Down) по выбранному слою и сегменту.',
    Sum: 'Средняя сумма вероятностей P_up+P_flat+P_down. В норме близка к 1 — сильный уход указывает на проблемы нормализации.'
}

const PILL_TOOLTIPS: Record<string, string> = {
    'Conf Day':
        'Средняя «уверенность» базового дневного слоя. Это отдельный сигнал (не сумма вероятностей), полезный для sanity‑check.',
    'Conf Micro':
        'Средняя «уверенность» микро‑слоя, применяемого внутри боковика. Отдельный сигнал, не равный вероятностям.',
    'SL-score дней':
        'Сколько дней в сегменте имели ненулевой SL‑score. Показывает, как часто SL‑модель вообще влияла на поток.'
}

const METRICS_TOOLTIPS: Record<string, string> = {
    Accuracy: 'Доля правильных предсказаний: Correct / N. Чем выше, тем лучше.',
    'Micro-F1':
        'Micro‑F1 для 3‑классовой задачи. В текущей реализации совпадает с Accuracy, но оставлен как отдельная метрика.',
    LogLoss:
        'Средний log‑loss по вероятностям истинного класса. Чем меньше, тем лучше. Используются только валидные записи.',
    'N / Correct': 'N — всего записей в сегменте, Correct — сколько предсказаний совпало с истинной меткой.',
    'Valid / Invalid log-loss':
        'Сколько записей использовано для log‑loss. Invalid > 0 означает невалидные вероятности (в идеале 0).'
}

const CONFUSION_TOOLTIPS: Record<string, string> = {
    'True → Pred':
        'Матрица ошибок: строки — истинные метки, столбцы — предсказанные. Значения — количество дней.',
    Падение: 'Класс DOWN: фактическое падение дня.',
    Боковик: 'Класс FLAT: боковой день без выраженного тренда.',
    Рост: 'Класс UP: фактический рост дня.'
}

const DEBUG_TOOLTIPS: Record<string, string> = {
    'Дата (UTC)': 'Дата торгового дня (UTC), к которому относится строка.',
    True: 'Истинный класс дня (факт): UP / FLAT / DOWN.',
    Day: 'Предсказание базовой дневной модели (до micro/SL).',
    'Day+Micro': 'Предсказание после применения микро‑оверлея.',
    Total: 'Финальное предсказание после SL‑оверлея (Day+Micro+SL).',
    'P_day (U/F/D)': 'Тройка вероятностей Up/Flat/Down для базовой модели Day.',
    'P_day+micro (U/F/D)': 'Тройка вероятностей Up/Flat/Down после микро‑оверлея.',
    'P_total (U/F/D)': 'Финальные вероятности Up/Flat/Down после SL‑оверлея.',
    'Micro used': 'Флаг, что микро‑оверлей реально изменил прогноз (Day → Day+Micro).',
    'SL used': 'Флаг, что SL‑оверлей реально повлиял на итог (Day+Micro → Total).',
    'Micro agree': 'Совпали ли метки Day и Day+Micro (true = не изменилось).',
    'SL pen long': 'SL‑оверлей уменьшил вероятность long (penalty по P_up).',
    'SL pen short': 'SL‑оверлей уменьшил вероятность short (penalty по P_down).'
}

const renderTooltip = (term: string, description?: string) => {
    if (!description) return term
    return <TermTooltip term={term} description={description} type='span' />
}

export function AggregationStatsPageInner({ className, probs, metrics }: AggregationStatsPageInnerProps) {
    const rootClassName = classNames(cls.AggregationStatsPage, {}, [className ?? ''])

    const sections = useMemo(
        () => [
            { id: 'agg-probs', label: 'Вероятности', anchor: 'agg-probs' },
            { id: 'agg-metrics', label: 'Метрики', anchor: 'agg-metrics' },
            { id: 'agg-debug', label: 'Debug последних дней', anchor: 'agg-debug' }
        ],
        []
    )

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
                        <div className={cls.metaValue}>{formatCount(probs.TotalInputRecords)}</div>
                    </div>
                    <div className={cls.metaCard}>
                        <div className={cls.metaTitle}>Исключено из агрегации</div>
                        <div className={cls.metaValue}>{formatCount(probs.ExcludedCount)}</div>
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
                    <Text className={cls.sectionHint}>
                        Усреднённые вероятности классов по сегментам. Это проверка калибровки и дрейфа, а не доля
                        правильных прогнозов.
                    </Text>
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
                    <Text className={cls.sectionHint}>
                        Accuracy/Micro‑F1/LogLoss по каждому слою. Дополнительно — матрицы ошибок, чтобы видеть, какие
                        классы путаются.
                    </Text>
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
                    <Text className={cls.sectionHint}>
                        Последние N дней с фактом и прогнозами. Флаги показывают, где micro/SL реально меняли итоговый
                        класс или вероятности.
                    </Text>
                </div>

                {probs.DebugLastDays.length === 0 ? (
                    <Text>Debug-строк нет. Проверь корректность генерации агрегации.</Text>
                ) : (
                    <>
                        <Text className={cls.tableHint}>
                            Таблица помогает быстро увидеть, в какие дни micro/SL меняли результат. В колонках —
                            истинная метка, прогнозы слоёв и флаги влияния оверлеев.
                        </Text>
                        <div className={cls.tableScroll}>
                            <table className={cls.table}>
                                <thead>
                                    <tr>
                                        <th>{renderTooltip('Дата (UTC)', DEBUG_TOOLTIPS['Дата (UTC)'])}</th>
                                        <th>{renderTooltip('True', DEBUG_TOOLTIPS.True)}</th>
                                        <th>{renderTooltip('Day', DEBUG_TOOLTIPS.Day)}</th>
                                        <th>{renderTooltip('Day+Micro', DEBUG_TOOLTIPS['Day+Micro'])}</th>
                                        <th>{renderTooltip('Total', DEBUG_TOOLTIPS.Total)}</th>
                                        <th>{renderTooltip('P_day (U/F/D)', DEBUG_TOOLTIPS['P_day (U/F/D)'])}</th>
                                        <th>
                                            {renderTooltip('P_day+micro (U/F/D)', DEBUG_TOOLTIPS['P_day+micro (U/F/D)'])}
                                        </th>
                                        <th>{renderTooltip('P_total (U/F/D)', DEBUG_TOOLTIPS['P_total (U/F/D)'])}</th>
                                        <th>{renderTooltip('Micro used', DEBUG_TOOLTIPS['Micro used'])}</th>
                                        <th>{renderTooltip('SL used', DEBUG_TOOLTIPS['SL used'])}</th>
                                        <th>{renderTooltip('Micro agree', DEBUG_TOOLTIPS['Micro agree'])}</th>
                                        <th>{renderTooltip('SL pen long', DEBUG_TOOLTIPS['SL pen long'])}</th>
                                        <th>{renderTooltip('SL pen short', DEBUG_TOOLTIPS['SL pen short'])}</th>
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
function ProbSegmentCard({ segment }: { segment: AggregationProbsSegmentSnapshotDto }) {
    const rangeText = formatRange(segment.FromDateUtc, segment.ToDateUtc)
    const recordsText = formatCount(segment.RecordsCount)
    const slRatio = `${formatCount(segment.RecordsWithSlScore)}/${formatCount(segment.RecordsCount)}`

    return (
        <div className={cls.segmentCard}>
            <div className={cls.segmentHeader}>
                <Text className={cls.segmentTitle}>{segment.SegmentLabel || segment.SegmentName}</Text>
                <Text className={cls.segmentMeta}>Диапазон: {rangeText}</Text>
                <Text className={cls.segmentMeta}>Записей: {recordsText}</Text>
            </div>

            <div className={cls.segmentPills}>
                <span className={cls.pill}>
                    {renderTooltip('Conf Day', PILL_TOOLTIPS['Conf Day'])}: {formatPercent(segment.AvgConfDay)}
                </span>
                <span className={cls.pill}>
                    {renderTooltip('Conf Micro', PILL_TOOLTIPS['Conf Micro'])}: {formatPercent(segment.AvgConfMicro)}
                </span>
                <span className={cls.pill}>
                    {renderTooltip('SL-score дней', PILL_TOOLTIPS['SL-score дней'])}: {slRatio}
                </span>
            </div>

            <Text className={cls.segmentHint}>
                Таблица ниже показывает средние вероятности классов для этого сегмента данных. Сравнивайте слои (Day /
                Day+Micro / Total), чтобы увидеть вклад оверлеев.
            </Text>

            <div className={cls.tableScroll}>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            <th>{renderTooltip('Слой', PROB_TABLE_TOOLTIPS['Слой'])}</th>
                            <th>{renderTooltip('P_up', PROB_TABLE_TOOLTIPS['P_up'])}</th>
                            <th>{renderTooltip('P_flat', PROB_TABLE_TOOLTIPS['P_flat'])}</th>
                            <th>{renderTooltip('P_down', PROB_TABLE_TOOLTIPS['P_down'])}</th>
                            <th>{renderTooltip('Sum', PROB_TABLE_TOOLTIPS.Sum)}</th>
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
    const rangeText = formatRange(segment.FromDateUtc, segment.ToDateUtc)
    const recordsText = formatCount(segment.RecordsCount)

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
function LayerMetricsCard({ layer }: { layer: LayerMetricsSnapshotDto }) {
    const accuracy = formatPercent(layer.Accuracy)
    const microF1 = formatPercent(layer.MicroF1)
    const logLoss = formatNumber(layer.LogLoss, 4)

    return (
        <div className={cls.layerCard}>
            <Text className={cls.layerTitle}>{layer.LayerName}</Text>

            <Text className={cls.metricsHint}>
                Ключевые метрики качества слоя: точность, log‑loss и объём данных. Наведите на метрики для пояснений.
            </Text>

            <div className={cls.metricsList}>
                <span className={cls.metricsLabel}>{renderTooltip('Accuracy', METRICS_TOOLTIPS.Accuracy)}</span>
                <span>{accuracy}</span>
                <span className={cls.metricsLabel}>{renderTooltip('Micro-F1', METRICS_TOOLTIPS['Micro-F1'])}</span>
                <span>{microF1}</span>
                <span className={cls.metricsLabel}>{renderTooltip('LogLoss', METRICS_TOOLTIPS.LogLoss)}</span>
                <span>{logLoss}</span>
                <span className={cls.metricsLabel}>{renderTooltip('N / Correct', METRICS_TOOLTIPS['N / Correct'])}</span>
                <span>
                    {formatCount(layer.N)} / {formatCount(layer.Correct)}
                </span>
                <span className={cls.metricsLabel}>
                    {renderTooltip('Valid / Invalid log-loss', METRICS_TOOLTIPS['Valid / Invalid log-loss'])}
                </span>
                <span>
                    {formatCount(layer.ValidForLogLoss)} / {formatCount(layer.InvalidForLogLoss)}
                </span>
            </div>

            <Text className={cls.confusionHint}>
                Матрица ошибок показывает, как часто слой путает классы. Строки — истинные метки, столбцы —
                предсказанные.
            </Text>

            <ConfusionMatrixTable layer={layer} />
        </div>
    )
}
function ConfusionMatrixTable({ layer }: { layer: LayerMetricsSnapshotDto }) {
    const labels = ['Падение', 'Боковик', 'Рост']

    return (
        <table className={cls.confusionTable}>
            <thead>
                <tr>
                    <th className={cls.confusionHeader}>
                        {renderTooltip('True → Pred', CONFUSION_TOOLTIPS['True → Pred'])}
                    </th>
                    {labels.map(label => (
                        <th key={label} className={cls.confusionHeader}>
                            {renderTooltip(label, CONFUSION_TOOLTIPS[label])}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {labels.map((label, rowIdx) => (
                    <tr key={label}>
                        <th className={cls.confusionHeader}>{renderTooltip(label, CONFUSION_TOOLTIPS[label])}</th>
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
    const dayKeyLabel = formatUtcDayKey(row.DateUtc)
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
            <td>{row.MicroUsed ? 'да' : 'нет'}</td>
            <td>{row.SlUsed ? 'да' : 'нет'}</td>
            <td>{row.MicroAgree ? 'да' : 'нет'}</td>
            <td>{row.SlPenLong ? 'да' : 'нет'}</td>
            <td>{row.SlPenShort ? 'да' : 'нет'}</td>
        </tr>
    )
}
