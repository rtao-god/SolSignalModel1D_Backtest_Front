import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import {
    ReportMetricBarChart,
    ReportMetricScatterChart,
    ReportTableCard,
    ReportViewControls,
    Text,
    type ReportMetricBarDatum,
    type ReportMetricChartTone,
    type ReportMetricScatterDatum,
    type ReportViewControlGroup
} from '@/shared/ui'
import { PageDataState } from '@/shared/ui/errors/PageDataState'
import type { TableRow } from '@/shared/ui/SortableTable'
import {
    type CurrentPredictionOosPresetAnalysis,
    type CurrentPredictionOosPresetAnalysisMode,
    type CurrentPredictionOosPresetAnalysisRow,
    useCurrentPredictionOosPresetAnalysisQuery
} from '@/shared/api/tanstackQueries/currentPrediction'
import { buildPolicyDisplayLabel } from '@/shared/utils/reportPolicyMarginMode'
import cls from './CurrentPredictionOosPresetsPage.module.scss'
import type { CurrentPredictionOosPresetsPageProps } from './types'

type RankingMetricKey = 'balancedScore' | 'accuracyPct' | 'bestPolicyTotalPnlPct' | 'bestPolicyTrades'

interface RankingMetricDescriptor {
    key: RankingMetricKey
    label: string
    tooltip: string
    valueLabel: string
    getValue: (row: CurrentPredictionOosPresetAnalysisRow) => number | null
    format: (value: number, locale: string) => string
}

interface PresetBarDatum extends ReportMetricBarDatum {
    row: CurrentPredictionOosPresetAnalysisRow
}

interface PresetScatterDatum extends ReportMetricScatterDatum {
    row: CurrentPredictionOosPresetAnalysisRow
}

function formatInt(value: number, locale: string): string {
    return value.toLocaleString(locale)
}

function formatPct(value: number, locale: string): string {
    return `${value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function formatSignedPct(value: number, locale: string): string {
    return `${value > 0 ? '+' : ''}${formatPct(value, locale)}`
}

function formatShare(value: number, locale: string): string {
    return `${(value * 100).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function presetLabel(row: CurrentPredictionOosPresetAnalysisRow): string {
    return `Проверка ${row.requestedDaySharePercent}%`
}

function splitLabel(row: CurrentPredictionOosPresetAnalysisRow, locale: string): string {
    const trainPct = 100 - row.requestedDaySharePercent
    return `Обучение ${trainPct}% (${formatInt(row.trainDays, locale)} дней) · Проверка ${row.requestedDaySharePercent}% (${formatInt(row.selectedDays, locale)} дней, ${formatInt(row.selectedTradeCount, locale)} сделок)`
}

function bestPolicyLabel(row: CurrentPredictionOosPresetAnalysisRow): string {
    if (!row.bestPolicyName) return 'Нет готового торгового режима'
    return (
        buildPolicyDisplayLabel({
            policyName: row.bestPolicyName,
            branch: row.bestPolicyBranch,
            marginMode: row.bestPolicyMarginMode
        }) ?? 'Нет готового торгового режима'
    )
}

function readBestPolicyMetricNumber(
    row: CurrentPredictionOosPresetAnalysisRow,
    field: keyof NonNullable<CurrentPredictionOosPresetAnalysisRow['bestPolicyMetrics']>
): number | null {
    const value = row.bestPolicyMetrics?.[field]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function rowTone(row: CurrentPredictionOosPresetAnalysisRow): ReportMetricChartTone {
    switch (row.bestPolicyEvaluation?.status) {
        case 'good':
            return 'positive'
        case 'caution':
            return 'warning'
        case 'bad':
            return 'danger'
        default:
            return 'neutral'
    }
}

function resolveRecommendedRow(
    rows: CurrentPredictionOosPresetAnalysisRow[],
    recommendedKey: string | null | undefined,
    selector: (row: CurrentPredictionOosPresetAnalysisRow) => number | null
): CurrentPredictionOosPresetAnalysisRow | null {
    if (recommendedKey) {
        const recommendedRow = rows.find(row => row.key === recommendedKey) ?? null
        if (recommendedRow) {
            return recommendedRow
        }
    }

    return bestRow(rows, selector)
}

function bestRow(
    rows: CurrentPredictionOosPresetAnalysisRow[],
    selector: (row: CurrentPredictionOosPresetAnalysisRow) => number | null
): CurrentPredictionOosPresetAnalysisRow | null {
    let best: CurrentPredictionOosPresetAnalysisRow | null = null
    let score = Number.NEGATIVE_INFINITY
    for (const row of rows) {
        const value = selector(row)
        if (value === null || !Number.isFinite(value)) continue
        if (best === null || value > score) {
            best = row
            score = value
        }
    }
    return best
}

function resolveCorrectWrongSortStats(row: CurrentPredictionOosPresetAnalysisRow): {
    errorShare: number
    predictionCount: number
} {
    const total = row.correctPredictions + row.wrongPredictions

    return {
        errorShare: total > 0 ? row.wrongPredictions / total : Number.POSITIVE_INFINITY,
        predictionCount: total
    }
}

function compareCorrectWrongQuality(
    left: CurrentPredictionOosPresetAnalysisRow,
    right: CurrentPredictionOosPresetAnalysisRow
): number {
    const leftStats = resolveCorrectWrongSortStats(left)
    const rightStats = resolveCorrectWrongSortStats(right)

    if (leftStats.errorShare !== rightStats.errorShare) {
        return leftStats.errorShare - rightStats.errorShare
    }

    if (leftStats.predictionCount !== rightStats.predictionCount) {
        return rightStats.predictionCount - leftStats.predictionCount
    }

    return 0
}

function tableRows(rows: CurrentPredictionOosPresetAnalysisRow[], locale: string): TableRow[] {
    return rows.map(row => [
        presetLabel(row),
        splitLabel(row, locale),
        formatPct(row.accuracyPct, locale),
        `${formatInt(row.correctPredictions, locale)} / ${formatInt(row.wrongPredictions, locale)}`,
        bestPolicyLabel(row),
        readBestPolicyMetricNumber(row, 'tradesCount') === null ? '—' : formatInt(readBestPolicyMetricNumber(row, 'tradesCount')!, locale),
        readBestPolicyMetricNumber(row, 'totalPnlPct') === null ? '—' : formatSignedPct(readBestPolicyMetricNumber(row, 'totalPnlPct')!, locale),
        readBestPolicyMetricNumber(row, 'maxDdPct') === null ? '—' : formatPct(readBestPolicyMetricNumber(row, 'maxDdPct')!, locale),
        `с ${row.startPredictionDateUtc} по ${row.endPredictionDateUtc}`
    ])
}

function buildBarData(
    rows: CurrentPredictionOosPresetAnalysisRow[],
    metric: RankingMetricDescriptor
): PresetBarDatum[] {
    const result: PresetBarDatum[] = []
    for (const row of rows) {
        const value = metric.getValue(row)
        if (value === null || !Number.isFinite(value)) {
            continue
        }

        result.push({
            id: row.key,
            label: presetLabel(row),
            value,
            tone: rowTone(row),
            row
        })
    }

    result.sort((left, right) => right.value - left.value)
    return result
}

function buildScatterData(rows: CurrentPredictionOosPresetAnalysisRow[]): PresetScatterDatum[] {
    const result: PresetScatterDatum[] = []
    for (const row of rows) {
        const bestPolicyMaxDdPct = readBestPolicyMetricNumber(row, 'maxDdPct')
        const bestPolicyTotalPnlPct = readBestPolicyMetricNumber(row, 'totalPnlPct')
        if (bestPolicyMaxDdPct === null || bestPolicyTotalPnlPct === null) {
            continue
        }

        result.push({
            id: row.key,
            label: presetLabel(row),
            x: bestPolicyMaxDdPct,
            y: bestPolicyTotalPnlPct,
            tone: rowTone(row),
            row
        })
    }

    return result
}

export default function CurrentPredictionOosPresetsPage({ className }: CurrentPredictionOosPresetsPageProps) {
    const { t, i18n } = useTranslation('reports')
    const [mode, setMode] = useState<CurrentPredictionOosPresetAnalysisMode>('base')
    const [metricKey, setMetricKey] = useState<RankingMetricKey>('balancedScore')
    const [selectedKey, setSelectedKey] = useState<string | null>(null)

    const baseQuery = useCurrentPredictionOosPresetAnalysisQuery('base')
    const extendedQuery = useCurrentPredictionOosPresetAnalysisQuery('extended', { enabled: mode === 'extended' })

    const analysis: CurrentPredictionOosPresetAnalysis | null =
        mode === 'extended' ? extendedQuery.data ?? baseQuery.data ?? null : baseQuery.data ?? null
    const rows = useMemo(
        () =>
            mode === 'extended' ?
                [...(baseQuery.data?.rows ?? []), ...(extendedQuery.data?.rows ?? [])]
            :   baseQuery.data?.rows ?? [],
        [baseQuery.data?.rows, extendedQuery.data?.rows, mode]
    )
    const error = baseQuery.error ?? (mode === 'extended' ? extendedQuery.error : null)

    const metrics = useMemo<Record<RankingMetricKey, RankingMetricDescriptor>>(
        () => ({
            balancedScore: {
                key: 'balancedScore',
                label: 'Сбалансированный рейтинг',
                tooltip: 'Сравнивает варианты по общему балансу между качеством прогноза, результатом и штрафом за риск.',
                valueLabel: 'Сбалансированный рейтинг',
                getValue: row => row.balancedScore,
                format: (value, locale) => value.toLocaleString(locale, { maximumFractionDigits: 1 })
            },
            accuracyPct: {
                key: 'accuracyPct',
                label: 'Точность прогноза',
                tooltip: 'Показывает, как часто прогноз совпал с фактическим движением дня.',
                valueLabel: 'Точность',
                getValue: row => row.accuracyPct,
                format: (value, locale) => formatPct(value, locale)
            },
            bestPolicyTotalPnlPct: {
                key: 'bestPolicyTotalPnlPct',
                label: 'Результат лучшего режима',
                tooltip: 'Показывает итог лучшего торгового режима внутри этого варианта проверки.',
                valueLabel: 'Результат',
                getValue: row => readBestPolicyMetricNumber(row, 'totalPnlPct'),
                format: (value, locale) => formatSignedPct(value, locale)
            },
            bestPolicyTrades: {
                key: 'bestPolicyTrades',
                label: 'Сделок у лучшего режима',
                tooltip: 'Показывает, сколько сделок сделал лучший торговый режим внутри этого варианта проверки.',
                valueLabel: 'Сделок',
                getValue: row => readBestPolicyMetricNumber(row, 'tradesCount'),
                format: (value, locale) => formatInt(value, locale)
            }
        }),
        []
    )
    const metric = metrics[metricKey]

    const balanced = useMemo(
        () => resolveRecommendedRow(rows, analysis?.balancedRecommendationKey, row => row.balancedScore),
        [analysis?.balancedRecommendationKey, rows]
    )
    const conservative = useMemo(
        () => resolveRecommendedRow(rows, analysis?.conservativeRecommendationKey, row => row.conservativeScore),
        [analysis?.conservativeRecommendationKey, rows]
    )
    const aggressive = useMemo(
        () => resolveRecommendedRow(rows, analysis?.aggressiveRecommendationKey, row => row.aggressiveScore),
        [analysis?.aggressiveRecommendationKey, rows]
    )
    const selected = useMemo(() => rows.find(row => row.key === selectedKey) ?? null, [rows, selectedKey])

    useEffect(() => {
        if (rows.length === 0) {
            if (selectedKey !== null) setSelectedKey(null)
            return
        }
        if (selectedKey && rows.some(row => row.key === selectedKey)) return
        setSelectedKey(balanced?.key ?? rows[0].key)
    }, [balanced?.key, rows, selectedKey])

    const controls = useMemo<ReportViewControlGroup[]>(
        () => [
            {
                key: 'mode',
                label: 'Состав страницы',
                infoTooltip:
                    'Обычный режим показывает варианты проверки от 10% до 70%. Расширенный режим отдельным запросом добавляет варианты от 75% до 90%.',
                value: mode,
                options: [
                    { value: 'base', label: 'Обычный', tooltip: 'Основные варианты проверки от 10% до 70%.' },
                    { value: 'extended', label: 'Расширенный', tooltip: 'Добавляет варианты от 75% до 90% отдельным запросом.' }
                ],
                onChange: value => setMode(value as CurrentPredictionOosPresetAnalysisMode)
            },
            {
                key: 'metric',
                label: 'Главный график',
                infoTooltip: 'Меняет верхний график сравнения пресетов.',
                value: metricKey,
                options: Object.values(metrics).map(item => ({
                    value: item.key,
                    label: item.label,
                    tooltip: item.tooltip
                })),
                onChange: value => setMetricKey(value as RankingMetricKey)
            }
        ],
        [metricKey, metrics, mode]
    )

    const bars = useMemo<PresetBarDatum[]>(
        () => buildBarData(rows, metric),
        [metric, rows]
    )

    const points = useMemo<PresetScatterDatum[]>(() => buildScatterData(rows), [rows])

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            <PageDataState
                shell={
                    <>
                        <section className={cls.hero}>
                            <Text type='h1' className={cls.heroTitle}>
                                {t('currentPredictionOosPresets.page.title', {
                                    defaultValue: 'Сравнение OOS и TRAIN по доле последних дней'
                                })}
                            </Text>
                            <Text className={cls.heroSubtitle}>
                                {t('currentPredictionOosPresets.page.subtitle', {
                                    defaultValue:
                                        'Страница сравнивает, как меняется качество модели при разном размере OOS: OOS получает последние дни для отдельной проверки, а TRAIN получает остальную историю для обучения.'
                                })}
                            </Text>
                        </section>

                        <section className={cls.controls}>
                            <ReportViewControls groups={controls} />
                            <Text className={cls.controlHint}>
                                {t('currentPredictionOosPresets.page.controlHint', {
                                    defaultValue:
                                        'Экран открывает уже готовые сравнения. При открытии страницы ничего заново не пересчитывается.'
                                })}
                            </Text>
                        </section>
                    </>
                }
                hasData={Boolean(analysis)}
                isLoading={baseQuery.isLoading && !baseQuery.data}
                isError={Boolean(error)}
                error={error}
                loadingText='Загружаю сравнение вариантов проверки'
                title='Не удалось загрузить сравнение вариантов проверки'
                description='Проверь готовый опубликованный отчёт сравнения.'
                onRetry={() => {
                    void baseQuery.refetch()
                    if (mode === 'extended') void extendedQuery.refetch()
                }}>
                {analysis && (
                    <>
                        <section className={cls.summaryGrid}>
                            <article className={cls.summaryCard}>
                                <span className={cls.summaryLabel}>Вся история</span>
                                <span className={cls.summaryValue}>{formatInt(analysis.historyTotalDays, i18n.language)}</span>
                                <span className={cls.summaryHint}>
                                    {`С ${analysis.historyStartDateUtc} по ${analysis.historyEndDateUtc}. ${formatInt(analysis.historyTotalTrades, i18n.language)} сделок.`}
                                </span>
                            </article>
                            {balanced && (
                                <article className={cls.summaryCard}>
                                    <span className={cls.summaryLabel}>Лучший баланс</span>
                                    <span className={cls.summaryValue}>{presetLabel(balanced)}</span>
                                    <span className={cls.summaryHint}>
                                        {`${splitLabel(balanced, i18n.language)}. Точность ${formatPct(balanced.accuracyPct, i18n.language)}.`}
                                    </span>
                                </article>
                            )}
                            {conservative && (
                                <article className={cls.summaryCard}>
                                    <span className={cls.summaryLabel}>Самый осторожный</span>
                                    <span className={cls.summaryValue}>{presetLabel(conservative)}</span>
                                    <span className={cls.summaryHint}>
                                        {`Просадка ${readBestPolicyMetricNumber(conservative, 'maxDdPct') === null ? '—' : formatPct(readBestPolicyMetricNumber(conservative, 'maxDdPct')!, i18n.language)}.`}
                                    </span>
                                </article>
                            )}
                            {aggressive && (
                                <article className={cls.summaryCard}>
                                    <span className={cls.summaryLabel}>Самый доходный</span>
                                    <span className={cls.summaryValue}>{presetLabel(aggressive)}</span>
                                    <span className={cls.summaryHint}>
                                        {`Результат ${readBestPolicyMetricNumber(aggressive, 'totalPnlPct') === null ? '—' : formatSignedPct(readBestPolicyMetricNumber(aggressive, 'totalPnlPct')!, i18n.language)}.`}
                                    </span>
                                </article>
                            )}
                        </section>

                        <section className={cls.chartGrid}>
                            <article className={cls.chartCard}>
                                <div className={cls.cardHeader}>
                                    <div>
                                        <Text className={cls.cardTitle}>Главное сравнение пресетов</Text>
                                        <Text className={cls.cardSubtitle}>Нажми на столбец, чтобы открыть детали выбранного варианта ниже.</Text>
                                    </div>
                                </div>
                                <Text className={cls.metricHint}>{metric.label}</Text>
                                <ReportMetricBarChart
                                    data={bars}
                                    orientation='horizontal'
                                    height={360}
                                    maxHeight={520}
                                    selectedId={selected?.key ?? null}
                                    onSelect={datum => setSelectedKey(datum.row.key)}
                                    valueLabel={metric.valueLabel}
                                    emptyTitle='Для выбранной метрики нет данных'
                                    emptyDescription='Попробуй другой режим верхнего графика.'
                                    valueFormatter={value => metric.format(value, i18n.language)}
                                    getTooltipTitle={datum => presetLabel(datum.row)}
                                    getTooltipRows={datum => [
                                        { label: metric.valueLabel, value: metric.format(datum.value, i18n.language) },
                                        { label: 'Разделение истории', value: splitLabel(datum.row, i18n.language) },
                                        { label: 'Точность', value: formatPct(datum.row.accuracyPct, i18n.language) }
                                    ]}
                                />
                            </article>

                            <article className={cls.chartCard}>
                                <div className={cls.cardHeader}>
                                    <div>
                                        <Text className={cls.cardTitle}>Риск и результат лучшего режима</Text>
                                        <Text className={cls.cardSubtitle}>Каждая точка показывает один вариант проверки.</Text>
                                    </div>
                                </div>
                                <Text className={cls.metricHint}>По горизонтали максимальная просадка, по вертикали итоговый результат.</Text>
                                <ReportMetricScatterChart
                                    data={points}
                                    height={360}
                                    selectedId={selected?.key ?? null}
                                    onSelect={datum => setSelectedKey(datum.row.key)}
                                    xLabel='Максимальная просадка'
                                    yLabel='Итоговый результат'
                                    emptyTitle='Для risk / return графика нет данных'
                                    emptyDescription='График появится, когда у пресета есть и результат, и просадка.'
                                    xValueFormatter={value => formatPct(value, i18n.language)}
                                    yValueFormatter={value => formatSignedPct(value, i18n.language)}
                                    getTooltipTitle={datum => presetLabel(datum.row)}
                                    getTooltipRows={datum => [
                                        { label: 'Просадка', value: formatPct(datum.x, i18n.language) },
                                        { label: 'Результат', value: formatSignedPct(datum.y, i18n.language) },
                                        { label: 'Лучший режим', value: bestPolicyLabel(datum.row) }
                                    ]}
                                />
                            </article>
                        </section>

                        <section className={cls.tableSection}>
                            {mode === 'extended' && extendedQuery.isLoading && !extendedQuery.data && (
                                <Text className={cls.loadingNote}>Догружаю варианты от 75% до 90% отдельным запросом.</Text>
                            )}
                            <ReportTableCard
                                title='Честное сравнение вариантов проверки'
                                description='Каждая строка получена отдельным обучением и отдельной проверкой для этой доли последних дней.'
                                columns={['Вариант', 'Обучение / проверка', 'Точность', 'Верно / ошибка', 'Лучший режим', 'Сделок', 'Результат', 'Просадка', 'Период']}
                                rows={tableRows(rows, i18n.language)}
                                getSortComparatorOverride={(left, right, colIdx) => {
                                    if (colIdx !== 3) {
                                        return null
                                    }

                                    const leftRow = rows[left.rowIndex]
                                    const rightRow = rows[right.rowIndex]
                                    if (!leftRow || !rightRow) {
                                        return null
                                    }

                                    // В колонке "Верно / ошибка" сначала важна доля ошибок,
                                    // а при равенстве коэффициента сильнее вариант с большей выборкой.
                                    return compareCorrectWrongQuality(leftRow, rightRow)
                                }}
                                domId='current-prediction-oos-presets-table'
                            />
                        </section>

                        {selected && (
                            <section className={cls.detailCard}>
                                <div className={cls.detailGrid}>
                                    <article className={cls.detailItem}>
                                        <span className={cls.detailLabel}>Выбранный вариант</span>
                                        <span className={cls.detailValue}>{presetLabel(selected)}</span>
                                        <span className={cls.detailHint}>{splitLabel(selected, i18n.language)}</span>
                                    </article>
                                    <article className={cls.detailItem}>
                                        <span className={cls.detailLabel}>Качество прогноза</span>
                                        <span className={cls.detailValue}>{formatPct(selected.accuracyPct, i18n.language)}</span>
                                        <span className={cls.detailHint}>
                                            {`${formatInt(selected.correctPredictions, i18n.language)} верно / ${formatInt(selected.wrongPredictions, i18n.language)} ошибок. Средняя уверенность ${formatPct(selected.averageConfidencePct, i18n.language)}.`}
                                        </span>
                                    </article>
                                    <article className={cls.detailItem}>
                                        <span className={cls.detailLabel}>Лучший торговый режим</span>
                                        <span className={cls.detailValue}>{bestPolicyLabel(selected)}</span>
                                        <span className={cls.detailHint}>
                                            {`Сделок ${readBestPolicyMetricNumber(selected, 'tradesCount') === null ? '—' : formatInt(readBestPolicyMetricNumber(selected, 'tradesCount')!, i18n.language)}, результат ${readBestPolicyMetricNumber(selected, 'totalPnlPct') === null ? '—' : formatSignedPct(readBestPolicyMetricNumber(selected, 'totalPnlPct')!, i18n.language)}, просадка ${readBestPolicyMetricNumber(selected, 'maxDdPct') === null ? '—' : formatPct(readBestPolicyMetricNumber(selected, 'maxDdPct')!, i18n.language)}.`}
                                        </span>
                                    </article>
                                    <article className={cls.detailItem}>
                                        <span className={cls.detailLabel}>Внутренний рейтинг</span>
                                        <span className={cls.detailValue}>
                                            {`Баланс ${selected.balancedScore.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} · Осторожный ${selected.conservativeScore.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} · Доходный ${selected.aggressiveScore.toLocaleString(i18n.language, { maximumFractionDigits: 1 })}`}
                                        </span>
                                        <span className={cls.detailHint}>
                                            {`Во всём хвосте ${formatInt(selected.selectedTradeCount, i18n.language)} сделок (${formatShare(selected.selectedTradeShare, i18n.language)} от полной истории).`}
                                        </span>
                                    </article>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </PageDataState>
        </div>
    )
}
