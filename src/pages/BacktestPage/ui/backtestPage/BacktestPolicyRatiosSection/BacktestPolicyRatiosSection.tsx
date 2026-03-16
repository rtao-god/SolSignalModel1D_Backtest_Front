import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, ReportMetricBarChart, type ReportMetricBarDatum, Text } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { useGetBacktestPolicyRatiosQuery } from '@/shared/api/api'
import type { PolicyRatiosReportDto, PolicyRatiosPerPolicyDto } from '@/shared/types/policyRatios.types'
import { useTranslation } from 'react-i18next'
import cls from './BacktestPolicyRatiosSection.module.scss'
import { resolveAppError } from '@/shared/lib/errors/resolveAppError'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { useLocale } from '@/shared/lib/i18n'
import { resolveCommonReportColumnTooltipOrNull } from '@/shared/terms/common'

interface BacktestPolicyRatiosSectionProps {
    profileId?: string
    report?: PolicyRatiosReportDto | null
    isLoadingExternal?: boolean
    externalError?: string | null
    title?: string
    subtitle?: string
}

type MetricKey = 'totalPnlPct' | 'sharpe' | 'sortino' | 'calmar' | 'winRatePct'
type PolicyRatioChartDatum = ReportMetricBarDatum & {
    bucket: string
    tradesCount: number
    maxDdPct: number
    winRatePct: number
    hadLiquidation: boolean
}

const metricOptions: { key: MetricKey; labelKey: string; defaultLabel: string; isPercent?: boolean }[] = [
    {
        key: 'totalPnlPct',
        labelKey: 'backtestFull.policyRatios.metrics.totalPnlPct',
        defaultLabel: 'PnL %',
        isPercent: true
    },
    { key: 'sharpe', labelKey: 'backtestFull.policyRatios.metrics.sharpe', defaultLabel: 'Sharpe' },
    { key: 'sortino', labelKey: 'backtestFull.policyRatios.metrics.sortino', defaultLabel: 'Sortino' },
    { key: 'calmar', labelKey: 'backtestFull.policyRatios.metrics.calmar', defaultLabel: 'Calmar' },
    {
        key: 'winRatePct',
        labelKey: 'backtestFull.policyRatios.metrics.winRatePct',
        defaultLabel: 'WinRate %',
        isPercent: true
    }
]

interface RatioColumnDefinition {
    id:
        | 'policy'
        | 'bucket'
        | 'trades'
        | 'pnl'
        | 'maxDd'
        | 'sharpe'
        | 'sortino'
        | 'calmar'
        | 'winRate'
        | 'withdrawn'
        | 'liq'
    defaultLabel: string
    defaultTooltip: string
}

const RATIO_COLUMN_DEFINITIONS: readonly RatioColumnDefinition[] = [
    { id: 'policy', defaultLabel: 'Policy', defaultTooltip: 'Trading policy name.' },
    { id: 'bucket', defaultLabel: 'Bucket', defaultTooltip: 'Capital bucket: daily, intraday, delayed, or total.' },
    { id: 'trades', defaultLabel: 'Trades', defaultTooltip: 'Number of trades in selected bucket.' },
    { id: 'pnl', defaultLabel: 'PnL %', defaultTooltip: 'Total policy return in selected bucket, %.' },
    { id: 'maxDd', defaultLabel: 'MaxDD %', defaultTooltip: 'Maximum equity drawdown, %.' },
    { id: 'sharpe', defaultLabel: 'Sharpe', defaultTooltip: 'Return normalized by total volatility.' },
    { id: 'sortino', defaultLabel: 'Sortino', defaultTooltip: 'Return normalized by downside volatility.' },
    { id: 'calmar', defaultLabel: 'Calmar', defaultTooltip: 'Return-to-drawdown ratio.' },
    { id: 'winRate', defaultLabel: 'WinRate %', defaultTooltip: 'Share of profitable trades, %.' },
    { id: 'withdrawn', defaultLabel: 'Withdrawn $', defaultTooltip: 'Withdrawn profit amount, USD.' },
    { id: 'liq', defaultLabel: 'Liq?', defaultTooltip: 'Liquidation occurred in selected bucket.' }
]

function selectMetric(row: PolicyRatiosPerPolicyDto, key: MetricKey): number {
    switch (key) {
        case 'totalPnlPct':
            return row.totalPnlPct
        case 'sharpe':
            return row.sharpe
        case 'sortino':
            return row.sortino
        case 'calmar':
            return row.calmar
        case 'winRatePct':
            return row.winRatePct
        default:
            throw new Error(`Unsupported metric key: ${key}`)
    }
}

function resolveBuckets(report: PolicyRatiosReportDto): string[] {
    const bucketSet = new Set<string>()

    for (const row of report.policies) {
        const bucket = row.bucket?.trim().toLowerCase()
        if (!bucket) {
            throw new Error(`Policy '${row.policyName}' has empty bucket in policy-ratios report.`)
        }
        bucketSet.add(bucket)
    }

    if (bucketSet.size === 0) {
        throw new Error('Policy-ratios report has no buckets.')
    }

    return Array.from(bucketSet).sort((a, b) => a.localeCompare(b))
}

function resolvePolicyEvaluationTone(row: PolicyRatiosPerPolicyDto): ReportMetricBarDatum['tone'] {
    if (!row.evaluation) {
        return 'neutral'
    }

    if (row.evaluation.status === 'good') return 'positive'
    if (row.evaluation.status === 'caution') return 'warning'
    if (row.evaluation.status === 'bad') return 'negative'
    return 'neutral'
}

function resolvePolicyEvaluationRowClass(row: PolicyRatiosPerPolicyDto): string | undefined {
    if (!row.evaluation) {
        return undefined
    }

    if (row.evaluation.status === 'good') return cls.rowGood
    if (row.evaluation.status === 'caution') return cls.rowCaution
    if (row.evaluation.status === 'bad') return cls.rowBad
    return cls.rowUnknown
}

function resolvePolicyEvaluationRowTitle(row: PolicyRatiosPerPolicyDto): string | undefined {
    const reasons = row.evaluation?.reasons?.map(reason => reason.message).filter(Boolean) ?? []
    if (reasons.length === 0) {
        return undefined
    }

    return reasons.join(' | ')
}

export function BacktestPolicyRatiosSection({
    profileId = 'baseline',
    report,
    isLoadingExternal = false,
    externalError = null,
    title,
    subtitle
}: BacktestPolicyRatiosSectionProps) {
    const { t, i18n } = useTranslation('reports')
    const { formatDate } = useLocale()
    const tooltipLocale = (i18n.resolvedLanguage ?? i18n.language).startsWith('ru') ? 'ru' : 'en'
    const resolveSharedReportTooltip = (title: string): string => {
        const description = resolveCommonReportColumnTooltipOrNull(title, tooltipLocale)
        if (!description) {
            throw new Error(`Missing shared report tooltip for '${title}' in BacktestPolicyRatiosSection.`)
        }

        return description
    }

    const resolvedTitle =
        title ??
        t('backtestFull.policyRatios.title', {
            defaultValue: 'Policy metrics (Sharpe / Sortino / PnL)'
        })

    const shouldUseExternal = typeof report !== 'undefined' || isLoadingExternal || externalError !== null

    const {
        data: fetchedReport,
        isLoading: isFetchedLoading,
        isError: isFetchedError,
        error: fetchedError
    } = useGetBacktestPolicyRatiosQuery(profileId, { skip: shouldUseExternal })

    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
    const [metricKey, setMetricKey] = useState<MetricKey>('totalPnlPct')
    const [selectedBucket, setSelectedBucket] = useState<string>('daily')

    const activeReport = report ?? fetchedReport ?? null
    const isLoading = shouldUseExternal ? isLoadingExternal : isFetchedLoading
    const isError = shouldUseExternal ? Boolean(externalError) : isFetchedError
    const resolvedError = shouldUseExternal ? externalError : resolveAppError(fetchedError).rawMessage

    const currentMetric = metricOptions.find(m => m.key === metricKey) ?? metricOptions[0]
    const currentMetricLabel = t(currentMetric.labelKey, { defaultValue: currentMetric.defaultLabel })
    const isPercentMetric = Boolean(currentMetric.isPercent)

    const bucketOptions = useMemo(() => {
        if (!activeReport) return []
        return resolveBuckets(activeReport)
    }, [activeReport])

    useEffect(() => {
        if (bucketOptions.length === 0) return
        if (bucketOptions.includes(selectedBucket)) return

        const preferred = bucketOptions.includes('daily') ? 'daily' : bucketOptions[0]
        setSelectedBucket(preferred)
    }, [bucketOptions, selectedBucket])

    const filteredPolicies = useMemo(() => {
        if (!activeReport) return []
        return activeReport.policies.filter(row => row.bucket.toLowerCase() === selectedBucket)
    }, [activeReport, selectedBucket])

    const chartData = useMemo(
        () =>
            filteredPolicies.map(row => {
                const rawValue = selectMetric(row, metricKey)
                if (!Number.isFinite(rawValue)) {
                    throw new Error(
                        `Metric '${metricKey}' is not finite for policy '${row.policyName}' in bucket '${row.bucket}'.`
                    )
                }

                return {
                    key: `${row.policyName}::${row.bucket}`,
                    id: `${row.policyName}::${row.bucket}`,
                    policyName: row.policyName,
                    label: row.policyName,
                    value: rawValue,
                    tone: resolvePolicyEvaluationTone(row),
                    bucket: row.bucket,
                    tradesCount: row.tradesCount,
                    maxDdPct: row.maxDdPct,
                    winRatePct: row.winRatePct,
                    hadLiquidation: row.hadLiquidation
                }
            }),
        [filteredPolicies, metricKey]
    ) as PolicyRatioChartDatum[]

    if (isLoading) {
        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{resolvedTitle}</Text>
                <Text>{t('backtestFull.policyRatios.loading', { defaultValue: 'Loading policy metrics...' })}</Text>
            </section>
        )
    }

    if (isError) {
        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{resolvedTitle}</Text>
                <ErrorBlock
                    code='DATA'
                    title={t('backtestFull.policyRatios.errors.dataTitle', {
                        defaultValue: 'Failed to load policy ratios'
                    })}
                    description={t('backtestFull.policyRatios.errors.dataDescription', {
                        defaultValue: 'Policy metrics section is unavailable due to data error.'
                    })}
                    details={resolvedError ?? 'Unknown policy-ratios error.'}
                    compact
                />
            </section>
        )
    }

    if (!activeReport || !activeReport.policies || activeReport.policies.length === 0) {
        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{resolvedTitle}</Text>
                <Text>
                    {t('backtestFull.policyRatios.empty', {
                        defaultValue: 'No saved policy-ratios report yet.'
                    })}
                </Text>
            </section>
        )
    }

    if (filteredPolicies.length === 0) {
        throw new Error(`No policy-ratios rows found for bucket '${selectedBucket}'.`)
    }

    const defaultSubtitle = t('backtestFull.policyRatios.subtitle', {
        defaultValue:
            'Policy comparison inside selected capital bucket. Full coverage requires checking daily/intraday/delayed.'
    })

    const handleMetricChange: React.ChangeEventHandler<HTMLSelectElement> = e => {
        setMetricKey(e.target.value as MetricKey)
    }

    const handleBucketChange: React.ChangeEventHandler<HTMLSelectElement> = e => {
        setSelectedBucket(e.target.value)
    }

    return (
        <section className={cls.PolicyRatiosSection}>
            <div className={cls.headerRow}>
                <div className={cls.headerText}>
                    <Text type='h3'>{resolvedTitle}</Text>
                    <Text className={cls.headerSubtitle}>{subtitle ?? defaultSubtitle}</Text>
                    {activeReport.fromDateUtc && activeReport.toDateUtc && (
                        <Text>
                            {t('backtestFull.policyRatios.windowLabel', {
                                defaultValue: 'Backtest window'
                            })}
                            : {formatDate(activeReport.fromDateUtc)} - {formatDate(activeReport.toDateUtc)}
                        </Text>
                    )}
                </div>

                <div className={cls.controls}>
                    <label className={cls.metricLabel}>
                        <span>{t('backtestFull.policyRatios.controls.bucket', { defaultValue: 'Bucket' })}:</span>
                        <select className={cls.metricSelect} value={selectedBucket} onChange={handleBucketChange}>
                            {bucketOptions.map(bucket => (
                                <option key={bucket} value={bucket}>
                                    {bucket}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={cls.metricLabel}>
                        <span>{t('backtestFull.policyRatios.controls.metric', { defaultValue: 'Metric' })}:</span>
                        <select className={cls.metricSelect} value={metricKey} onChange={handleMetricChange}>
                            {metricOptions.map(opt => (
                                <option key={opt.key} value={opt.key}>
                                    {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className={cls.toggleGroup}>
                        <Btn
                            className={classNames(cls.toggleBtn, {
                                [cls.toggleBtnActive]: viewMode === 'chart'
                            })}
                            onClick={() => setViewMode('chart')}>
                            {t('backtestFull.policyRatios.viewMode.chart', { defaultValue: 'Chart' })}
                        </Btn>
                        <Btn
                            className={classNames(cls.toggleBtn, {
                                [cls.toggleBtnActive]: viewMode === 'table'
                            })}
                            onClick={() => setViewMode('table')}>
                            {t('backtestFull.policyRatios.viewMode.table', { defaultValue: 'Table' })}
                        </Btn>
                    </div>
                </div>
            </div>

            <SectionErrorBoundary
                name='BacktestPolicyRatiosContent'
                fallback={({ error: sectionError, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title={t('backtestFull.policyRatios.errors.clientTitle', {
                            defaultValue: 'Policy metrics section failed'
                        })}
                        description={t('backtestFull.policyRatios.errors.clientDescription', {
                            defaultValue: 'Client-side error while rendering policy metrics block.'
                        })}
                        details={sectionError.message}
                        onRetry={reset}
                        compact
                    />
                )}>
                {viewMode === 'chart' ?
                    <div className={cls.chartContainer}>
                        <ReportMetricBarChart
                            data={chartData}
                            height={300}
                            valueLabel={currentMetricLabel}
                            emptyTitle={t('backtestFull.policyRatios.chart.emptyTitle', {
                                defaultValue: 'Нет строк для графика'
                            })}
                            emptyDescription={t('backtestFull.policyRatios.chart.emptyDescription', {
                                defaultValue: 'Для выбранного бакета не удалось построить chart dataset.'
                            })}
                            valueFormatter={value => (isPercentMetric ? `${value.toFixed(2)} %` : value.toFixed(3))}
                            getTooltipTitle={datum =>
                                t('backtestFull.policyRatios.chart.policyLabel', {
                                    label: datum.label,
                                    defaultValue: 'Policy: {{label}}'
                                })
                            }
                            getTooltipRows={datum => [
                                {
                                    label: currentMetricLabel,
                                    value: isPercentMetric ? `${datum.value.toFixed(2)} %` : datum.value.toFixed(3)
                                },
                                {
                                    label: t('backtestFull.policyRatios.controls.bucket', { defaultValue: 'Bucket' }),
                                    value: datum.bucket
                                },
                                {
                                    label: t('backtestFull.policyRatios.columns.trades.label', {
                                        defaultValue: 'Trades'
                                    }),
                                    value: String(datum.tradesCount)
                                },
                                {
                                    label: t('backtestFull.policyRatios.columns.maxDd.label', {
                                        defaultValue: 'MaxDD %'
                                    }),
                                    value: `${datum.maxDdPct.toFixed(2)}`
                                },
                                {
                                    label: t('backtestFull.policyRatios.columns.winRate.label', {
                                        defaultValue: 'WinRate %'
                                    }),
                                    value: `${datum.winRatePct.toFixed(1)}`
                                },
                                {
                                    label: t('backtestFull.policyRatios.columns.liq.label', { defaultValue: 'Liq?' }),
                                    value:
                                        datum.hadLiquidation ?
                                            t('backtestFull.policyRatios.rows.liqYes', { defaultValue: 'YES' })
                                        :   t('backtestFull.policyRatios.rows.liqNo', { defaultValue: 'no' })
                                }
                            ]}
                        />
                    </div>
                :   <div className={cls.tableWrapper}>
                        <table className={cls.table}>
                            <thead>
                                <tr>
                                    {RATIO_COLUMN_DEFINITIONS.map(column => {
                                        const label = t(`backtestFull.policyRatios.columns.${column.id}.label`, {
                                            defaultValue: column.defaultLabel
                                        })
                                        const tooltip = t(`backtestFull.policyRatios.columns.${column.id}.tooltip`, {
                                            defaultValue: column.defaultTooltip
                                        })
                                        const resolvedTooltip =
                                            resolveCommonReportColumnTooltipOrNull(label, tooltipLocale)
                                            ?? (column.id === 'policy' ? resolveSharedReportTooltip('Policy')
                                            : column.id === 'bucket' ? resolveSharedReportTooltip('Bucket')
                                            : tooltip)

                                        return <th key={column.id}>{renderTermTooltipTitle(label, resolvedTooltip)}</th>
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPolicies.map(row => (
                                    <tr
                                        key={`${row.policyName}::${row.bucket}`}
                                        className={resolvePolicyEvaluationRowClass(row)}
                                        title={resolvePolicyEvaluationRowTitle(row)}>
                                        <td>{row.policyName}</td>
                                        <td>{row.bucket}</td>
                                        <td>{row.tradesCount}</td>
                                        <td>{row.totalPnlPct.toFixed(2)}</td>
                                        <td>{row.maxDdPct.toFixed(2)}</td>
                                        <td>{row.sharpe.toFixed(2)}</td>
                                        <td>{row.sortino.toFixed(2)}</td>
                                        <td>{row.calmar.toFixed(2)}</td>
                                        <td>{row.winRatePct.toFixed(1)}</td>
                                        <td>{row.withdrawnUsd.toFixed(0)}</td>
                                        <td className={row.hadLiquidation ? cls.badLiq : undefined}>
                                            {row.hadLiquidation ?
                                                t('backtestFull.policyRatios.rows.liqYes', { defaultValue: 'YES' })
                                            :   t('backtestFull.policyRatios.rows.liqNo', { defaultValue: 'no' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                }
            </SectionErrorBoundary>
        </section>
    )
}
