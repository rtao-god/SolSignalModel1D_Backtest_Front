import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/shared/lib/i18n'
import classNames from '@/shared/lib/helpers/classNames'
import {
    Btn,
    Input,
    ReportMetricBarChart,
    ReportMetricScatterChart,
    ReportViewControls,
    Text,
    type ReportMetricBarDatum,
    type ReportMetricChartTone,
    type ReportMetricScatterDatum
} from '@/shared/ui'
import { renderTermTooltipRichText, renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { getPolicyBranchMegaTerm, type PolicyBranchMegaTermLocale } from '@/shared/utils/policyBranchMegaTerms'
import type {
    PolicyBranchMegaChartMetricDescriptor,
    PolicyBranchMegaChartModel,
    PolicyBranchMegaChartRiskState,
    PolicyBranchMegaChartRow
} from '../model/policyBranchMegaChartModel'
import {
    formatPolicyBranchMegaChartMetricValue,
    resolvePolicyBranchMegaChartMetric,
    resolvePolicyBranchMegaChartPart,
    resolvePreferredPolicyBranchMegaMetricKey
} from '../model/policyBranchMegaChartModel'
import cls from './PolicyBranchMegaChartExplorer.module.scss'

type ChartFilterValue = 'all'
type RankingSortMode = 'metric-desc' | 'metric-asc' | 'policy-asc'
type RankingLimitMode = '8' | '12' | '20' | 'all'
type ChartPresetKey =
    | 'pnl-vs-drawdown'
    | 'trade-vs-return'
    | 'recovery-vs-drawdown'
    | 'ruin-vs-liquidation'
    | 'liquidation-vs-recovery'
    | 'recovery-days-vs-gain'
    | 'avgday-vs-total-pnl'
    | 'long-vs-short-cash'
    | 'long-vs-total-pnl'
    | 'short-vs-total-pnl'
    | 'eod-vs-trade-rate'
    | 'custom'

interface PolicyBranchMegaChartExplorerProps {
    model: PolicyBranchMegaChartModel
    termsLocale: PolicyBranchMegaTermLocale
    translate: (key: string, options?: Record<string, unknown>) => string
}

interface PolicyBranchMegaRankingDatum extends ReportMetricBarDatum {
    row: PolicyBranchMegaChartRow
}

interface PolicyBranchMegaScatterDatum extends ReportMetricScatterDatum {
    row: PolicyBranchMegaChartRow
}

interface PolicyBranchMegaPolicyDatum extends ReportMetricBarDatum {
    row: PolicyBranchMegaChartRow
}

interface PolicyBranchMegaChartPresetDescriptor {
    key: Exclude<ChartPresetKey, 'custom'>
    part: number
    rankingMetricKey: string
    scatterXMetricKey: string
    scatterYMetricKey: string
    labelKey: string
    defaultLabel: string
}

const DEFAULT_CHART_PRESET_KEY: Exclude<ChartPresetKey, 'custom'> = 'pnl-vs-drawdown'
// Preset синхронно настраивает левый рейтинг и правый scatter,
// чтобы пользователь переключал готовую diagnostic pair, а не разрозненные оси.
const CHART_PRESETS: readonly PolicyBranchMegaChartPresetDescriptor[] = [
    {
        key: 'pnl-vs-drawdown',
        part: 1,
        rankingMetricKey: 'TotalPnl%',
        scatterXMetricKey: 'MaxDD%',
        scatterYMetricKey: 'TotalPnl%',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.pnlVsDrawdown',
        defaultLabel: 'Total PnL vs MaxDD'
    },
    {
        key: 'trade-vs-return',
        part: 1,
        rankingMetricKey: 'Trade%',
        scatterXMetricKey: 'Trade%',
        scatterYMetricKey: 'TotalPnl%',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.tradeVsReturn',
        defaultLabel: 'Trade rate vs Total PnL'
    },
    {
        key: 'recovery-vs-drawdown',
        part: 2,
        rankingMetricKey: 'ReqGain%',
        scatterXMetricKey: 'MaxDD%',
        scatterYMetricKey: 'ReqGain%',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.recoveryVsDrawdown',
        defaultLabel: 'Recovery load vs MaxDD'
    },
    {
        key: 'ruin-vs-liquidation',
        part: 2,
        rankingMetricKey: 'AccRuin',
        scatterXMetricKey: 'HadLiq',
        scatterYMetricKey: 'AccRuin',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.ruinVsLiquidation',
        defaultLabel: 'Account ruin vs Liquidation'
    },
    {
        key: 'liquidation-vs-recovery',
        part: 2,
        rankingMetricKey: 'HadLiq',
        scatterXMetricKey: 'RecovDays',
        scatterYMetricKey: 'HadLiq',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.liquidationVsRecovery',
        defaultLabel: 'Liquidation vs Recovery days'
    },
    {
        key: 'recovery-days-vs-gain',
        part: 2,
        rankingMetricKey: 'RecovDays',
        scatterXMetricKey: 'RecovDays',
        scatterYMetricKey: 'ReqGain%',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.recoveryDaysVsGain',
        defaultLabel: 'Recovery days vs Required gain'
    },
    {
        key: 'avgday-vs-total-pnl',
        part: 3,
        rankingMetricKey: 'AvgDay%',
        scatterXMetricKey: 'AvgDay%',
        scatterYMetricKey: 'TotalPnl%',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.avgDayVsTotalPnl',
        defaultLabel: 'Average day vs Total PnL'
    },
    {
        key: 'long-vs-short-cash',
        part: 3,
        rankingMetricKey: 'Long $',
        scatterXMetricKey: 'Long $',
        scatterYMetricKey: 'Short $',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.longVsShortCash',
        defaultLabel: 'Long cash vs Short cash'
    },
    {
        key: 'long-vs-total-pnl',
        part: 3,
        rankingMetricKey: 'Long $',
        scatterXMetricKey: 'Long $',
        scatterYMetricKey: 'TotalPnl%',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.longVsTotalPnl',
        defaultLabel: 'Long cash vs Total PnL'
    },
    {
        key: 'short-vs-total-pnl',
        part: 3,
        rankingMetricKey: 'Short $',
        scatterXMetricKey: 'Short $',
        scatterYMetricKey: 'TotalPnl%',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.shortVsTotalPnl',
        defaultLabel: 'Short cash vs Total PnL'
    },
    {
        key: 'eod-vs-trade-rate',
        part: 3,
        rankingMetricKey: 'EODExit%',
        scatterXMetricKey: 'Trade%',
        scatterYMetricKey: 'EODExit%',
        labelKey: 'policyBranchMega.page.chart.controls.preset.options.eodVsTradeRate',
        defaultLabel: 'EndOfDay exit vs Trade rate'
    }
] as const

function resolveMetricTone(riskState: PolicyBranchMegaChartRiskState, value: number): ReportMetricChartTone {
    if (riskState === 'ruin') return 'danger'
    if (riskState === 'liquidation') return 'warning'
    if (value < 0) return 'negative'
    return 'positive'
}

function resolveRiskLabel(
    translate: PolicyBranchMegaChartExplorerProps['translate'],
    riskState: PolicyBranchMegaChartRiskState
): string {
    if (riskState === 'ruin') {
        return translate('policyBranchMega.page.chart.detail.risk.ruin', {
            defaultValue: 'AccRuin > 0'
        })
    }

    if (riskState === 'liquidation') {
        return translate('policyBranchMega.page.chart.detail.risk.liquidation', {
            defaultValue: 'Есть ликвидация'
        })
    }

    if (riskState === 'negative') {
        return translate('policyBranchMega.page.chart.detail.risk.negative', {
            defaultValue: 'PnL ниже 0'
        })
    }

    return translate('policyBranchMega.page.chart.detail.risk.safe', {
        defaultValue: 'Аварийных событий нет'
    })
}

function resolveRiskTagClass(riskState: PolicyBranchMegaChartRiskState): string {
    if (riskState === 'ruin') return cls.detailTagDanger
    if (riskState === 'liquidation') return cls.detailTagWarning
    return cls.detailTagPositive
}

function resolveRowMetricValueOrNull(row: PolicyBranchMegaChartRow, metricKey: string): number | null {
    const value = row.numericValues[metricKey]
    return typeof value === 'number' ? value : null
}

function resolveMetricLabel(metric: PolicyBranchMegaChartMetricDescriptor): string {
    return `PART ${metric.part} · ${metric.title}`
}

function renderMetricTitle(title: string, sourceColumn: string, locale: PolicyBranchMegaTermLocale) {
    try {
        const term = getPolicyBranchMegaTerm(sourceColumn, { locale })

        return renderTermTooltipTitle(title, () => renderTermTooltipRichText(term.description))
    } catch {
        return title
    }
}

function pickInitialScatterMetricKey(
    model: PolicyBranchMegaChartModel,
    preferredKeys: readonly string[],
    fallbackIndex: number
): string {
    for (const preferredKey of preferredKeys) {
        if (model.metrics.some(metric => metric.key === preferredKey)) {
            return preferredKey
        }
    }

    const fallbackMetric = model.metrics[fallbackIndex] ?? model.metrics[0]
    if (!fallbackMetric) {
        throw new Error('[policy-branch-mega] chart explorer cannot resolve scatter metric from empty model.')
    }

    return fallbackMetric.key
}

function modelHasMetric(model: PolicyBranchMegaChartModel, key: string): boolean {
    return model.metrics.some(metric => metric.key === key)
}

function partHasMetric(model: PolicyBranchMegaChartModel, part: number, key: string): boolean {
    return model.parts.some(
        partDescriptor => partDescriptor.part === part && partDescriptor.metrics.some(metric => metric.key === key)
    )
}

function isChartPresetAvailable(
    model: PolicyBranchMegaChartModel,
    preset: PolicyBranchMegaChartPresetDescriptor
): boolean {
    return (
        partHasMetric(model, preset.part, preset.rankingMetricKey) &&
        modelHasMetric(model, preset.scatterXMetricKey) &&
        modelHasMetric(model, preset.scatterYMetricKey)
    )
}

function resolveRankingLimit(limitMode: RankingLimitMode): number | null {
    return limitMode === 'all' ? null : Number(limitMode)
}

/**
 * Chart explorer для mega-таблицы.
 * Держит отдельный слой чтения поверх raw-таблицы: рейтинг, scatter и
 * detail-view выбранной Policy и её Branch / SL Mode конфигурации без изменения backend-контракта.
 */
export default function PolicyBranchMegaChartExplorer({
    model,
    termsLocale,
    translate
}: PolicyBranchMegaChartExplorerProps) {
    const { formatNumber } = useLocale()
    const partsCount = model.parts.length
    const [chartPresetKey, setChartPresetKey] = useState<ChartPresetKey>(DEFAULT_CHART_PRESET_KEY)
    const [selectedPart, setSelectedPart] = useState<number>(() => CHART_PRESETS[0]?.part ?? model.parts[0]?.part ?? 1)
    const [branchFilter, setBranchFilter] = useState<string | ChartFilterValue>('all')
    const [rowSlModeFilter, setRowSlModeFilter] = useState<string | ChartFilterValue>('all')
    const [sortMode, setSortMode] = useState<RankingSortMode>('metric-desc')
    const [limitMode, setLimitMode] = useState<RankingLimitMode>('12')
    const [policySearch, setPolicySearch] = useState('')
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
    const [rankingMetricKey, setRankingMetricKey] = useState<string>(
        () => CHART_PRESETS[0]?.rankingMetricKey ?? resolvePreferredPolicyBranchMegaMetricKey(model.parts[0]!)
    )
    const [scatterXMetricKey, setScatterXMetricKey] = useState<string>(
        () =>
            CHART_PRESETS[0]?.scatterXMetricKey ??
            pickInitialScatterMetricKey(model, ['MaxDD%', 'ReqGain%', 'Trade%'], 0)
    )
    const [scatterYMetricKey, setScatterYMetricKey] = useState<string>(
        () =>
            CHART_PRESETS[0]?.scatterYMetricKey ??
            pickInitialScatterMetricKey(model, ['TotalPnl%', 'Wealth%', 'AvgDay%'], 1)
    )

    const deferredSearch = useDeferredValue(policySearch.trim().toLowerCase())
    const availableChartPresets = useMemo(
        () => CHART_PRESETS.filter(preset => isChartPresetAvailable(model, preset)),
        [model]
    )

    const selectedPartDescriptor = useMemo(
        () => resolvePolicyBranchMegaChartPart(model, selectedPart),
        [model, selectedPart]
    )
    const rankingMetric = useMemo(
        () => resolvePolicyBranchMegaChartMetric(model, rankingMetricKey),
        [model, rankingMetricKey]
    )
    const scatterXMetric = useMemo(
        () => resolvePolicyBranchMegaChartMetric(model, scatterXMetricKey),
        [model, scatterXMetricKey]
    )
    const scatterYMetric = useMemo(
        () => resolvePolicyBranchMegaChartMetric(model, scatterYMetricKey),
        [model, scatterYMetricKey]
    )
    const selectedChartPreset = useMemo(
        () => availableChartPresets.find(preset => preset.key === chartPresetKey) ?? null,
        [availableChartPresets, chartPresetKey]
    )

    const applyChartPreset = (nextPresetKey: Exclude<ChartPresetKey, 'custom'>) => {
        const nextPreset = availableChartPresets.find(preset => preset.key === nextPresetKey)
        if (!nextPreset) {
            throw new Error(
                `[policy-branch-mega] chart preset is unavailable for current model. preset=${nextPresetKey}.`
            )
        }

        setChartPresetKey(nextPresetKey)
        setSelectedPart(nextPreset.part)
        setRankingMetricKey(nextPreset.rankingMetricKey)
        setScatterXMetricKey(nextPreset.scatterXMetricKey)
        setScatterYMetricKey(nextPreset.scatterYMetricKey)
    }

    useEffect(() => {
        if (model.parts.some(part => part.part === selectedPart)) return
        setSelectedPart(model.parts[0]?.part ?? 1)
    }, [model.parts, selectedPart])

    useEffect(() => {
        if (chartPresetKey === 'custom') return
        if (selectedChartPreset) return

        const fallbackPreset = availableChartPresets[0]
        if (!fallbackPreset) {
            return
        }

        setChartPresetKey(fallbackPreset.key)
        setSelectedPart(fallbackPreset.part)
        setRankingMetricKey(fallbackPreset.rankingMetricKey)
        setScatterXMetricKey(fallbackPreset.scatterXMetricKey)
        setScatterYMetricKey(fallbackPreset.scatterYMetricKey)
    }, [availableChartPresets, chartPresetKey, selectedChartPreset])

    useEffect(() => {
        if (selectedPartDescriptor.metrics.some(metric => metric.key === rankingMetricKey)) return
        setRankingMetricKey(resolvePreferredPolicyBranchMegaMetricKey(selectedPartDescriptor))
    }, [rankingMetricKey, selectedPartDescriptor])

    useEffect(() => {
        if (model.metrics.some(metric => metric.key === scatterXMetricKey)) return
        setScatterXMetricKey(pickInitialScatterMetricKey(model, ['MaxDD%', 'ReqGain%', 'Trade%'], 0))
    }, [model, scatterXMetricKey])

    useEffect(() => {
        if (model.metrics.some(metric => metric.key === scatterYMetricKey)) return
        setScatterYMetricKey(pickInitialScatterMetricKey(model, ['TotalPnl%', 'Wealth%', 'AvgDay%'], 1))
    }, [model, scatterYMetricKey])

    const filteredRows = useMemo(
        () =>
            model.rows.filter(row => {
                if (branchFilter !== 'all' && row.branch !== branchFilter) return false
                if (rowSlModeFilter !== 'all' && row.slMode !== rowSlModeFilter) return false
                if (!deferredSearch) return true
                return row.searchText.includes(deferredSearch)
            }),
        [branchFilter, deferredSearch, model.rows, rowSlModeFilter]
    )

    const rankingRowsWithMetric = useMemo(() => {
        const rowsWithMetric = filteredRows.filter(row => resolveRowMetricValueOrNull(row, rankingMetric.key) !== null)

        const sortedRows = [...rowsWithMetric].sort((left, right) => {
            if (sortMode === 'policy-asc') {
                return left.label.localeCompare(right.label)
            }

            const leftValue = resolveRowMetricValueOrNull(left, rankingMetric.key) ?? 0
            const rightValue = resolveRowMetricValueOrNull(right, rankingMetric.key) ?? 0

            return sortMode === 'metric-asc' ? leftValue - rightValue : rightValue - leftValue
        })

        const limit = resolveRankingLimit(limitMode)
        return limit === null ? sortedRows : sortedRows.slice(0, limit)
    }, [filteredRows, limitMode, rankingMetric.key, sortMode])

    useEffect(() => {
        if (filteredRows.some(row => row.id === selectedRowId)) return
        const fallbackRow = rankingRowsWithMetric[0] ?? filteredRows[0] ?? null
        setSelectedRowId(fallbackRow?.id ?? null)
    }, [filteredRows, rankingRowsWithMetric, selectedRowId])

    const selectedRow = useMemo(
        () => model.rows.find(row => row.id === selectedRowId) ?? null,
        [model.rows, selectedRowId]
    )

    const rankingAvailableCount = filteredRows.filter(
        row => resolveRowMetricValueOrNull(row, rankingMetric.key) !== null
    ).length
    const rankingMissingCount = filteredRows.length - rankingAvailableCount

    const rankingData = useMemo(
        () =>
            rankingRowsWithMetric.map<PolicyBranchMegaRankingDatum>(row => {
                const value = resolveRowMetricValueOrNull(row, rankingMetric.key)
                if (value === null) {
                    throw new Error(`[policy-branch-mega] ranking row is missing selected metric=${rankingMetric.key}.`)
                }

                return {
                    id: row.id,
                    label: row.label,
                    value,
                    tone: resolveMetricTone(row.riskState, value),
                    row
                }
            }),
        [rankingMetric.key, rankingRowsWithMetric]
    )

    const scatterData = useMemo(
        () =>
            filteredRows
                .map<PolicyBranchMegaScatterDatum | null>(row => {
                    const x = resolveRowMetricValueOrNull(row, scatterXMetric.key)
                    const y = resolveRowMetricValueOrNull(row, scatterYMetric.key)
                    if (x === null || y === null) return null

                    return {
                        id: row.id,
                        label: row.label,
                        x,
                        y,
                        tone: resolveMetricTone(row.riskState, y),
                        row
                    }
                })
                .filter((row): row is PolicyBranchMegaScatterDatum => row !== null),
        [filteredRows, scatterXMetric.key, scatterYMetric.key]
    )

    const selectedPolicyRows = useMemo(() => {
        if (!selectedRow) return []
        return model.rows.filter(row => row.policy === selectedRow.policy)
    }, [model.rows, selectedRow])

    const selectedPolicyMetricData = useMemo(
        () =>
            selectedPolicyRows
                .map<PolicyBranchMegaPolicyDatum | null>(row => {
                    const value = resolveRowMetricValueOrNull(row, rankingMetric.key)
                    if (value === null) return null

                    return {
                        id: row.id,
                        label: row.slMode ? `${row.branch} · ${row.slMode}` : row.branch,
                        value,
                        tone: resolveMetricTone(row.riskState, value),
                        row
                    }
                })
                .filter((row): row is PolicyBranchMegaPolicyDatum => row !== null),
        [rankingMetric.key, selectedPolicyRows]
    )

    const topLevelControls = useMemo(
        () =>
            [
                {
                    key: 'mega-chart-part',
                    label: translate('policyBranchMega.page.chart.controls.partLabel', {
                        defaultValue: 'Часть отчёта'
                    }),
                    value: String(selectedPart),
                    options: model.parts.map(part => ({
                        value: String(part.part),
                        label: `PART ${part.part}/${partsCount}`
                    })),
                    onChange: (next: string) => {
                        setChartPresetKey('custom')
                        setSelectedPart(Number(next))
                    }
                },
                {
                    key: 'mega-chart-branch',
                    label: translate('policyBranchMega.page.chart.controls.branchLabel', {
                        defaultValue: 'Branch'
                    }),
                    value: branchFilter,
                    options: [
                        {
                            value: 'all',
                            label: translate('policyBranchMega.page.chart.controls.allRows', {
                                defaultValue: 'Все'
                            })
                        },
                        ...model.branchOptions.map(branch => ({
                            value: branch,
                            label: branch
                        }))
                    ],
                    onChange: (next: string) => setBranchFilter(next)
                },
                {
                    key: 'mega-chart-slmode',
                    label: translate('policyBranchMega.page.chart.controls.rowSlModeLabel', {
                        defaultValue: 'SL Mode Policy'
                    }),
                    value: rowSlModeFilter,
                    options: [
                        {
                            value: 'all',
                            label: translate('policyBranchMega.page.chart.controls.allRows', {
                                defaultValue: 'Все'
                            })
                        },
                        ...model.slModeOptions.map(mode => ({
                            value: mode,
                            label: mode
                        }))
                    ],
                    onChange: (next: string) => setRowSlModeFilter(next)
                },
                {
                    key: 'mega-chart-sort',
                    label: translate('policyBranchMega.page.chart.controls.sortLabel', {
                        defaultValue: 'Сортировка'
                    }),
                    value: sortMode,
                    options: [
                        {
                            value: 'metric-desc',
                            label: translate('policyBranchMega.page.chart.controls.sort.metricDesc', {
                                defaultValue: 'Метрика ↓'
                            })
                        },
                        {
                            value: 'metric-asc',
                            label: translate('policyBranchMega.page.chart.controls.sort.metricAsc', {
                                defaultValue: 'Метрика ↑'
                            })
                        },
                        {
                            value: 'policy-asc',
                            label: translate('policyBranchMega.page.chart.controls.sort.policyAsc', {
                                defaultValue: 'Policy A-Z'
                            })
                        }
                    ],
                    onChange: (next: RankingSortMode) => setSortMode(next)
                },
                {
                    key: 'mega-chart-limit',
                    label: translate('policyBranchMega.page.chart.controls.limitLabel', {
                        defaultValue: 'Сколько Policy'
                    }),
                    value: limitMode,
                    options: [
                        { value: '8', label: '8' },
                        { value: '12', label: '12' },
                        { value: '20', label: '20' },
                        {
                            value: 'all',
                            label: translate('policyBranchMega.page.chart.controls.limit.all', {
                                defaultValue: 'Все'
                            })
                        }
                    ],
                    onChange: (next: RankingLimitMode) => setLimitMode(next)
                }
            ] as const,
        [
            branchFilter,
            limitMode,
            model.branchOptions,
            model.parts,
            model.slModeOptions,
            partsCount,
            rowSlModeFilter,
            selectedPart,
            sortMode,
            translate
        ]
    )

    return (
        <section className={cls.root}>
            <div className={cls.header}>
                <div className={cls.headerText}>
                    <Text type='h3' className={cls.title}>
                        {translate('policyBranchMega.page.chart.title', {
                            defaultValue: 'Графический explorer по mega-таблице'
                        })}
                    </Text>
                    <Text className={cls.subtitle}>
                        {translate('policyBranchMega.page.chart.subtitle', {
                            defaultValue:
                                'Графики не заменяют таблицу исходных значений. Этот режим даёт первичное чтение: рейтинг, risk/return scatter и детализацию выбранной Policy.'
                        })}
                    </Text>
                </div>

                <div className={cls.summaryPills}>
                    <span className={cls.summaryPill}>
                        {translate('policyBranchMega.page.chart.summary.totalRows', {
                            defaultValue: 'Всего Policy-конфигураций: {{value}}',
                            value: model.rows.length
                        })}
                    </span>
                    <span className={classNames(cls.summaryPill, {}, [cls.summaryPillMuted])}>
                        {translate('policyBranchMega.page.chart.summary.filteredRows', {
                            defaultValue: 'После фильтров: {{value}}',
                            value: filteredRows.length
                        })}
                    </span>
                    <span className={classNames(cls.summaryPill, {}, [cls.summaryPillMuted])}>
                        {translate('policyBranchMega.page.chart.summary.missingMetric', {
                            defaultValue: 'Без выбранной метрики: {{value}}',
                            value: rankingMissingCount
                        })}
                    </span>
                </div>
            </div>

            <div className={cls.filterBlock}>
                <ReportViewControls groups={topLevelControls} />

                <div className={cls.selectGrid}>
                    <label className={cls.controlLabel}>
                        <span>
                            {translate('policyBranchMega.page.chart.controls.presetLabel', {
                                defaultValue: 'Связка графиков'
                            })}
                        </span>
                        <select
                            className={cls.controlSelect}
                            value={chartPresetKey}
                            onChange={event => {
                                const nextPresetKey = event.target.value as ChartPresetKey
                                if (nextPresetKey === 'custom') {
                                    setChartPresetKey('custom')
                                    return
                                }

                                applyChartPreset(nextPresetKey)
                            }}>
                            {availableChartPresets.map(preset => (
                                <option key={preset.key} value={preset.key}>
                                    {translate(preset.labelKey, {
                                        defaultValue: preset.defaultLabel
                                    })}
                                </option>
                            ))}
                            <option value='custom'>
                                {translate('policyBranchMega.page.chart.controls.preset.options.custom', {
                                    defaultValue: 'Связка вручную'
                                })}
                            </option>
                        </select>
                    </label>

                    <label className={cls.controlLabel}>
                        <span>
                            {translate('policyBranchMega.page.chart.controls.rankingMetricLabel', {
                                defaultValue: 'Метрика рейтинга'
                            })}
                        </span>
                        <select
                            className={cls.controlSelect}
                            value={rankingMetricKey}
                            onChange={event => {
                                setChartPresetKey('custom')
                                setRankingMetricKey(event.target.value)
                            }}>
                            {selectedPartDescriptor.metrics.map(metric => (
                                <option key={metric.key} value={metric.key}>
                                    {metric.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={cls.controlLabel}>
                        <span>
                            {translate('policyBranchMega.page.chart.controls.scatterXLabel', {
                                defaultValue: 'Scatter: ось X'
                            })}
                        </span>
                        <select
                            className={cls.controlSelect}
                            value={scatterXMetricKey}
                            onChange={event => {
                                setChartPresetKey('custom')
                                setScatterXMetricKey(event.target.value)
                            }}>
                            {model.metrics.map(metric => (
                                <option key={metric.key} value={metric.key}>
                                    {resolveMetricLabel(metric)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={cls.controlLabel}>
                        <span>
                            {translate('policyBranchMega.page.chart.controls.scatterYLabel', {
                                defaultValue: 'Scatter: ось Y'
                            })}
                        </span>
                        <select
                            className={cls.controlSelect}
                            value={scatterYMetricKey}
                            onChange={event => {
                                setChartPresetKey('custom')
                                setScatterYMetricKey(event.target.value)
                            }}>
                            {model.metrics.map(metric => (
                                <option key={metric.key} value={metric.key}>
                                    {resolveMetricLabel(metric)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={cls.controlLabel}>
                        <span>
                            {translate('policyBranchMega.page.chart.controls.policySearchLabel', {
                                defaultValue: 'Поиск Policy / Branch'
                            })}
                        </span>
                        <Input
                            className={cls.searchInput}
                            value={policySearch}
                            onChange={event => setPolicySearch(event.target.value)}
                            placeholder={translate('policyBranchMega.page.chart.controls.policySearchPlaceholder', {
                                defaultValue: 'Например: UltraSafe или ANTI-D'
                            })}
                            bgcolor='rgba(2, 6, 23, 0.78)'
                            border='1px solid rgba(148, 163, 184, 0.24)'
                            padding='8px 12px'
                            borderRadius='12px'
                            fz='13px'
                        />
                    </label>
                </div>

                <Text className={cls.metricHint}>
                    {selectedChartPreset ?
                        translate('policyBranchMega.page.chart.controls.presetSummary', {
                            defaultValue: 'Слева: {{ranking}}. Справа: {{x}} vs {{y}}.',
                            ranking: rankingMetric.title,
                            x: scatterXMetric.title,
                            y: scatterYMetric.title
                        })
                    :   translate('policyBranchMega.page.chart.controls.presetSummaryCustom', {
                            defaultValue: 'Ручная связка: слева {{ranking}}, справа {{x}} vs {{y}}.',
                            ranking: rankingMetric.title,
                            x: scatterXMetric.title,
                            y: scatterYMetric.title
                        })
                    }
                </Text>

                <Text className={cls.metricHint}>
                    {translate('policyBranchMega.page.chart.metricSource', {
                        defaultValue: 'Сейчас рейтинг строится по {{metric}}, источник: {{source}}.',
                        metric: rankingMetric.title,
                        source: rankingMetric.sourceColumn
                    })}
                </Text>
            </div>

            <div className={cls.chartGrid}>
                <article className={cls.chartCard}>
                    <div className={cls.cardHeader}>
                        <div>
                            <Text className={cls.cardTitle}>
                                {translate('policyBranchMega.page.chart.ranking.title', {
                                    defaultValue: 'Рейтинг Policy-конфигураций по выбранной метрике'
                                })}
                            </Text>
                            <Text className={cls.cardSubtitle}>
                                {translate('policyBranchMega.page.chart.ranking.subtitle', {
                                    defaultValue:
                                        'Выбор столбца рейтинга открывает выбранную Policy для детального просмотра и сравнения её Branch / SL Mode конфигураций.'
                                })}
                            </Text>
                        </div>

                        <div className={cls.chartMeta}>
                            <span className={cls.chartMetaItem}>
                                {translate('policyBranchMega.page.chart.ranking.part', {
                                    defaultValue: 'PART {{part}}/{{total}}',
                                    part: selectedPart,
                                    total: partsCount
                                })}
                            </span>
                            <span className={cls.chartMetaItem}>
                                {translate('policyBranchMega.page.chart.ranking.shown', {
                                    defaultValue: 'Показано {{value}}',
                                    value: rankingData.length
                                })}
                            </span>
                            <span className={cls.chartMetaItem}>
                                {translate('policyBranchMega.page.chart.ranking.available', {
                                    defaultValue: 'Policy-конфигураций с метрикой: {{value}}',
                                    value: rankingAvailableCount
                                })}
                            </span>
                        </div>
                    </div>

                    <Text className={cls.metricHint}>
                        {renderMetricTitle(rankingMetric.title, rankingMetric.sourceColumn, termsLocale)}
                    </Text>

                    <ReportMetricBarChart
                        data={rankingData}
                        selectedId={selectedRowId}
                        onSelect={datum => setSelectedRowId(datum.row.id)}
                        valueLabel={rankingMetric.title}
                        emptyTitle={translate('policyBranchMega.page.chart.ranking.emptyTitle', {
                            defaultValue: 'Нет Policy-конфигураций с выбранной метрикой'
                        })}
                        emptyDescription={translate('policyBranchMega.page.chart.ranking.emptyDescription', {
                            defaultValue:
                                'После branch/SL/search фильтров не осталось ни одной Policy-конфигурации, где выбранная метрика имеет числовое значение.'
                        })}
                        valueFormatter={value =>
                            formatPolicyBranchMegaChartMetricValue(rankingMetric, value, formatNumber)
                        }
                        getTooltipTitle={datum => datum.row.label}
                        getTooltipRows={datum => [
                            {
                                label: rankingMetric.title,
                                value: formatPolicyBranchMegaChartMetricValue(rankingMetric, datum.value, formatNumber)
                            },
                            { label: 'Branch', value: datum.row.branch },
                            ...(datum.row.slMode ? [{ label: 'SL Mode', value: datum.row.slMode }] : []),
                            {
                                label: translate('policyBranchMega.page.chart.detail.riskLabel', {
                                    defaultValue: 'Риск'
                                }),
                                value: resolveRiskLabel(translate, datum.row.riskState)
                            }
                        ]}
                    />
                </article>

                <article className={cls.chartCard}>
                    <div className={cls.cardHeader}>
                        <div>
                            <Text className={cls.cardTitle}>
                                {translate('policyBranchMega.page.chart.scatter.title', {
                                    defaultValue: 'Risk / return scatter'
                                })}
                            </Text>
                            <Text className={cls.cardSubtitle}>
                                {translate('policyBranchMega.page.chart.scatter.subtitle', {
                                    defaultValue:
                                        'Ось X и Y выбираются отдельно, поэтому можно сравнить доходность, просадку, recovery и темпы роста в одном поле.'
                                })}
                            </Text>
                        </div>

                        <div className={cls.chartMeta}>
                            <span className={cls.chartMetaItem}>
                                {translate('policyBranchMega.page.chart.scatter.points', {
                                    defaultValue: 'Точек: {{value}}',
                                    value: scatterData.length
                                })}
                            </span>
                        </div>
                    </div>

                    <Text className={cls.metricHint}>
                        {renderMetricTitle(scatterXMetric.title, scatterXMetric.sourceColumn, termsLocale)} ·{' '}
                        {renderMetricTitle(scatterYMetric.title, scatterYMetric.sourceColumn, termsLocale)}
                    </Text>

                    <ReportMetricScatterChart
                        data={scatterData}
                        selectedId={selectedRowId}
                        onSelect={datum => setSelectedRowId(datum.row.id)}
                        xLabel={scatterXMetric.title}
                        yLabel={scatterYMetric.title}
                        emptyTitle={translate('policyBranchMega.page.chart.scatter.emptyTitle', {
                            defaultValue: 'Scatter нечего строить'
                        })}
                        emptyDescription={translate('policyBranchMega.page.chart.scatter.emptyDescription', {
                            defaultValue:
                                'После текущих фильтров нет Policy-конфигураций, где обе выбранные метрики присутствуют одновременно.'
                        })}
                        xValueFormatter={value =>
                            formatPolicyBranchMegaChartMetricValue(scatterXMetric, value, formatNumber)
                        }
                        yValueFormatter={value =>
                            formatPolicyBranchMegaChartMetricValue(scatterYMetric, value, formatNumber)
                        }
                        getTooltipTitle={datum => datum.row.label}
                        getTooltipRows={datum => [
                            {
                                label: scatterXMetric.title,
                                value: formatPolicyBranchMegaChartMetricValue(scatterXMetric, datum.x, formatNumber)
                            },
                            {
                                label: scatterYMetric.title,
                                value: formatPolicyBranchMegaChartMetricValue(scatterYMetric, datum.y, formatNumber)
                            },
                            {
                                label: translate('policyBranchMega.page.chart.detail.riskLabel', {
                                    defaultValue: 'Риск'
                                }),
                                value: resolveRiskLabel(translate, datum.row.riskState)
                            }
                        ]}
                    />
                </article>
            </div>

            <article className={cls.detailCard}>
                {selectedRow ?
                    <>
                        <div className={cls.detailHeader}>
                            <div className={cls.detailIdentity}>
                                <Text className={cls.detailTitle}>{selectedRow.policy}</Text>
                                <Text className={cls.detailSubTitle}>
                                    {translate('policyBranchMega.page.chart.detail.subtitle', {
                                        defaultValue:
                                            'Выбрана Policy из графика. Ниже показаны значения выбранной Branch / SL Mode конфигурации и сравнение этой же Policy по другим вариантам исполнения.'
                                    })}
                                </Text>

                                <div className={cls.detailTags}>
                                    <span className={cls.detailTag}>{selectedRow.branch}</span>
                                    {selectedRow.slMode && <span className={cls.detailTag}>{selectedRow.slMode}</span>}
                                    <span
                                        className={classNames(cls.detailTag, {}, [
                                            resolveRiskTagClass(selectedRow.riskState)
                                        ])}>
                                        {resolveRiskLabel(translate, selectedRow.riskState)}
                                    </span>
                                </div>
                            </div>

                            <Btn
                                className={cls.clearButton}
                                variant='ghost'
                                size='sm'
                                onClick={() => setSelectedRowId(null)}>
                                {translate('policyBranchMega.page.chart.detail.clearSelection', {
                                    defaultValue: 'Сбросить выбор'
                                })}
                            </Btn>
                        </div>

                        <div className={cls.policyCompare}>
                            <Text className={cls.cardTitle}>
                                {translate('policyBranchMega.page.chart.detail.policyCompareTitle', {
                                    defaultValue: 'Сравнение конфигураций внутри этой Policy'
                                })}
                            </Text>
                            <Text className={cls.cardSubtitle}>
                                {translate('policyBranchMega.page.chart.detail.policyCompareSubtitle', {
                                    defaultValue:
                                        'Этот bar chart использует ту же ranking-метрику и показывает, как выбранная Policy меняется между Branch и SL Mode конфигурациями.'
                                })}
                            </Text>

                            <ReportMetricBarChart
                                data={selectedPolicyMetricData}
                                selectedId={selectedRow.id}
                                onSelect={datum => setSelectedRowId(datum.row.id)}
                                valueLabel={rankingMetric.title}
                                emptyTitle={translate('policyBranchMega.page.chart.detail.policyCompareEmptyTitle', {
                                    defaultValue: 'Для выбранной Policy нет чисел по ranking-метрике'
                                })}
                                emptyDescription={translate(
                                    'policyBranchMega.page.chart.detail.policyCompareEmptyDescription',
                                    {
                                        defaultValue:
                                            'У этой Policy есть другие Branch / SL Mode конфигурации, но у них отсутствует выбранная ranking-метрика.'
                                    }
                                )}
                                valueFormatter={value =>
                                    formatPolicyBranchMegaChartMetricValue(rankingMetric, value, formatNumber)
                                }
                                getTooltipTitle={datum => `${selectedRow.policy} · ${datum.row.branch}`}
                                getTooltipRows={datum => [
                                    {
                                        label: rankingMetric.title,
                                        value: formatPolicyBranchMegaChartMetricValue(
                                            rankingMetric,
                                            datum.value,
                                            formatNumber
                                        )
                                    },
                                    ...(datum.row.slMode ? [{ label: 'SL Mode', value: datum.row.slMode }] : []),
                                    {
                                        label: translate('policyBranchMega.page.chart.detail.riskLabel', {
                                            defaultValue: 'Риск'
                                        }),
                                        value: resolveRiskLabel(translate, datum.row.riskState)
                                    }
                                ]}
                            />
                        </div>

                        <div className={cls.detailSections}>
                            {model.parts.map(part => {
                                const detailItems = part.columns
                                    .filter(
                                        column => column !== 'Policy' && column !== 'Branch' && column !== 'SL Mode'
                                    )
                                    .map(column => ({
                                        key: column,
                                        title: column,
                                        value: selectedRow.values[column]
                                    }))
                                    .filter(item => typeof item.value === 'string' && item.value.length > 0)

                                if (detailItems.length === 0) return null

                                return (
                                    <section key={part.part} className={cls.detailSection}>
                                        <Text className={cls.detailSectionTitle}>
                                            {translate('policyBranchMega.page.chart.detail.partTitle', {
                                                defaultValue: 'PART {{part}}/{{total}}',
                                                part: part.part,
                                                total: partsCount
                                            })}
                                        </Text>

                                        <div className={cls.detailGrid}>
                                            {detailItems.map(item => (
                                                <div key={`${part.part}-${item.key}`} className={cls.detailItem}>
                                                    <Text className={cls.detailItemLabel}>
                                                        {renderMetricTitle(item.title, item.key, termsLocale)}
                                                    </Text>
                                                    <Text className={cls.detailItemValue}>{item.value}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )
                            })}
                        </div>
                    </>
                :   <div className={cls.emptyDetail}>
                        {translate('policyBranchMega.page.chart.detail.empty', {
                            defaultValue:
                                'После выбора столбца рейтинга или точки scatter-графика здесь открывается выбранная Policy и значения её текущей Branch / SL Mode конфигурации.'
                        })}
                    </div>
                }
            </article>
        </section>
    )
}
