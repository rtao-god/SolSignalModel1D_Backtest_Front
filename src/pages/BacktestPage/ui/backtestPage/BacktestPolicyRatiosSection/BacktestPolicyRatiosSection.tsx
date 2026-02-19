import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { useGetBacktestPolicyRatiosQuery } from '@/shared/api/api'
import type { PolicyRatiosReportDto, PolicyRatiosPerPolicyDto } from '@/shared/types/policyRatios.types'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Cell } from 'recharts'
import cls from './BacktestPolicyRatiosSection.module.scss'
import { resolveAppError } from '@/shared/lib/errors/resolveAppError'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'

interface BacktestPolicyRatiosSectionProps {
    profileId?: string
    report?: PolicyRatiosReportDto | null
    isLoadingExternal?: boolean
    externalError?: string | null
    title?: string
    subtitle?: string
}

type MetricKey = 'totalPnlPct' | 'sharpe' | 'sortino' | 'calmar' | 'winRatePct'

const metricOptions: { key: MetricKey; label: string; isPercent?: boolean }[] = [
    { key: 'totalPnlPct', label: 'PnL %', isPercent: true },
    { key: 'sharpe', label: 'Sharpe' },
    { key: 'sortino', label: 'Sortino' },
    { key: 'calmar', label: 'Calmar' },
    { key: 'winRatePct', label: 'WinRate %', isPercent: true }
]

const RATIO_COLUMN_TOOLTIPS: Record<string, string> = {
    Политика: 'Имя торговой политики (стратегии).',
    Бакет: 'Капитальный бакет расчёта: daily, intraday или delayed.',
    Сделок: 'Количество сделок по политике в выбранном бакете.',
    'PnL %': 'Суммарная доходность по политике в процентах за выбранный бакет.',
    'MaxDD %': 'Максимальная просадка капитала в процентах.',
    Sharpe: 'Доходность, нормированная на общую волатильность.',
    Sortino: 'Доходность, нормированная на downside-волатильность.',
    Calmar: 'Отношение доходности к максимальной просадке.',
    'WinRate %': 'Доля прибыльных сделок, %.',
    'Withdrawn $': 'Сумма выведенной прибыли (если применимо).',
    'Liq?': 'Была ли ликвидация в выбранном бакете.'
}

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

function resolveBucketsOrThrow(report: PolicyRatiosReportDto): string[] {
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

export function BacktestPolicyRatiosSection({
    profileId = 'baseline',
    report,
    isLoadingExternal = false,
    externalError = null,
    title = 'Метрики политик (Sharpe / Sortino / PnL)',
    subtitle
}: BacktestPolicyRatiosSectionProps) {
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
    const isPercentMetric = Boolean(currentMetric.isPercent)

    const bucketOptions = useMemo(() => {
        if (!activeReport) return []
        return resolveBucketsOrThrow(activeReport)
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
                    policyName: row.policyName,
                    value: rawValue
                }
            }),
        [filteredPolicies, metricKey]
    )

    if (isLoading) {
        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{title}</Text>
                <Text>Загружаю метрики политик...</Text>
            </section>
        )
    }

    if (isError) {
        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{title}</Text>
                <ErrorBlock
                    code='DATA'
                    title='Не удалось получить policy-ratios'
                    description='Секция метрик политик недоступна из-за ошибки данных.'
                    details={resolvedError ?? 'Unknown policy-ratios error.'}
                    compact
                />
            </section>
        )
    }

    if (!activeReport || !activeReport.policies || activeReport.policies.length === 0) {
        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{title}</Text>
                <Text>Пока нет сохранённого отчёта с метриками политик.</Text>
            </section>
        )
    }

    if (filteredPolicies.length === 0) {
        throw new Error(`No policy-ratios rows found for bucket '${selectedBucket}'.`)
    }

    const defaultSubtitle =
        'Сравнение политик внутри выбранного бакета капитала. Для полного покрытия проверяйте daily/intraday/delayed.'

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
                    <Text type='h3'>{title}</Text>
                    <Text className={cls.headerSubtitle}>{subtitle ?? defaultSubtitle}</Text>
                    {activeReport.fromDateUtc && activeReport.toDateUtc && (
                        <Text>
                            Окно бэктеста: {new Date(activeReport.fromDateUtc).toLocaleDateString()} —{' '}
                            {new Date(activeReport.toDateUtc).toLocaleDateString()}
                        </Text>
                    )}
                </div>

                <div className={cls.controls}>
                    <label className={cls.metricLabel}>
                        <span>Бакет:</span>
                        <select className={cls.metricSelect} value={selectedBucket} onChange={handleBucketChange}>
                            {bucketOptions.map(bucket => (
                                <option key={bucket} value={bucket}>
                                    {bucket}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className={cls.metricLabel}>
                        <span>Метрика:</span>
                        <select className={cls.metricSelect} value={metricKey} onChange={handleMetricChange}>
                            {metricOptions.map(opt => (
                                <option key={opt.key} value={opt.key}>
                                    {opt.label}
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
                            График
                        </Btn>
                        <Btn
                            className={classNames(cls.toggleBtn, {
                                [cls.toggleBtnActive]: viewMode === 'table'
                            })}
                            onClick={() => setViewMode('table')}>
                            Таблица
                        </Btn>
                    </div>
                </div>
            </div>

            <SectionErrorBoundary
                name='BacktestPolicyRatiosContent'
                fallback={({ error: sectionError, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title='Ошибка в секции метрик политик'
                        description='При отрисовке блока метрик политик произошла ошибка на клиенте.'
                        details={sectionError.message}
                        onRetry={reset}
                        compact
                    />
                )}>
                {viewMode === 'chart' ?
                    <div className={cls.chartContainer}>
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 42 }}>
                                <CartesianGrid strokeDasharray='3 3' vertical={false} />
                                <XAxis
                                    dataKey='policyName'
                                    tick={{ fill: 'rgba(255, 255, 255, 0.85)', fontSize: 11 }}
                                    angle={-30}
                                    textAnchor='end'
                                    height={56}
                                />
                                <YAxis
                                    tick={{ fill: 'rgba(255, 255, 255, 0.85)', fontSize: 11 }}
                                    width={62}
                                    tickFormatter={value => {
                                        if (typeof value !== 'number') return value
                                        return isPercentMetric ? `${value.toFixed(0)}%` : value.toFixed(1)
                                    }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(5, 8, 14, 0.96)',
                                        borderRadius: 8,
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        padding: '8px 10px',
                                        fontSize: 12
                                    }}
                                    formatter={(value: unknown) => {
                                        if (typeof value !== 'number') return String(value)
                                        const formatted = isPercentMetric ? `${value.toFixed(2)} %` : value.toFixed(3)
                                        return [formatted, currentMetric.label]
                                    }}
                                    labelFormatter={label => `Политика: ${label}`}
                                />
                                <ReferenceLine y={0} stroke='rgba(255, 255, 255, 0.4)' strokeDasharray='3 3' />
                                <Bar dataKey='value' name={currentMetric.label} radius={[4, 4, 0, 0]} barSize={26}>
                                    {chartData.map(entry => (
                                        <Cell
                                            key={entry.key}
                                            fill={entry.value >= 0 ? 'rgba(74, 222, 128, 0.95)' : 'rgba(248, 113, 113, 0.95)'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                :   <div className={cls.tableWrapper}>
                        <table className={cls.table}>
                            <thead>
                                <tr>
                                    <th>{renderTermTooltipTitle('Политика', RATIO_COLUMN_TOOLTIPS.Политика)}</th>
                                    <th>{renderTermTooltipTitle('Бакет', RATIO_COLUMN_TOOLTIPS.Бакет)}</th>
                                    <th>{renderTermTooltipTitle('Сделок', RATIO_COLUMN_TOOLTIPS.Сделок)}</th>
                                    <th>{renderTermTooltipTitle('PnL %', RATIO_COLUMN_TOOLTIPS['PnL %'])}</th>
                                    <th>{renderTermTooltipTitle('MaxDD %', RATIO_COLUMN_TOOLTIPS['MaxDD %'])}</th>
                                    <th>{renderTermTooltipTitle('Sharpe', RATIO_COLUMN_TOOLTIPS.Sharpe)}</th>
                                    <th>{renderTermTooltipTitle('Sortino', RATIO_COLUMN_TOOLTIPS.Sortino)}</th>
                                    <th>{renderTermTooltipTitle('Calmar', RATIO_COLUMN_TOOLTIPS.Calmar)}</th>
                                    <th>{renderTermTooltipTitle('WinRate %', RATIO_COLUMN_TOOLTIPS['WinRate %'])}</th>
                                    <th>{renderTermTooltipTitle('Withdrawn $', RATIO_COLUMN_TOOLTIPS['Withdrawn $'])}</th>
                                    <th>{renderTermTooltipTitle('Liq?', RATIO_COLUMN_TOOLTIPS['Liq?'])}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPolicies.map(row => (
                                    <tr key={`${row.policyName}::${row.bucket}`}>
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
                                            {row.hadLiquidation ? 'YES' : 'no'}
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

