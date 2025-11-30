import { useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { useGetBacktestPolicyRatiosQuery } from '@/shared/api/api'
import type { PolicyRatiosReportDto, PolicyRatiosPerPolicyDto } from '@/shared/types/policyRatios.types'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import cls from './BacktestPolicyRatiosSection.module.scss'

interface BacktestPolicyRatiosSectionProps {
    /** id профиля бэктеста; по умолчанию "baseline". */
    profileId?: string
    /** Заголовок секции. */
    title?: string
}

/**
 * Секция метрик политик:
 * - по умолчанию показывает график (bar chart) по выбранной метрике;
 * - по клику можно переключиться на табличное представление.
 *
 * Один и тот же DTO PolicyRatiosReportDto используется и для графика, и для таблицы,
 * поэтому лишних запросов на бэкенд не делается — меняется только способ отображения.
 */
export function BacktestPolicyRatiosSection({
    profileId = 'baseline',
    title = 'Метрики политик (Sharpe / Sortino / PnL)'
}: BacktestPolicyRatiosSectionProps) {
    const { data, isLoading, isError, error } = useGetBacktestPolicyRatiosQuery(profileId)

    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

    type MetricKey = 'totalPnlPct' | 'sharpe' | 'sortino' | 'calmar' | 'winRatePct'

    const [metricKey, setMetricKey] = useState<MetricKey>('totalPnlPct')

    const metricOptions: { key: MetricKey; label: string }[] = [
        { key: 'totalPnlPct', label: 'PnL %' },
        { key: 'sharpe', label: 'Sharpe' },
        { key: 'sortino', label: 'Sortino' },
        { key: 'calmar', label: 'Calmar' },
        { key: 'winRatePct', label: 'WinRate %' }
    ]

    const currentMetric = metricOptions.find(m => m.key === metricKey) ?? metricOptions[0]

    const selectMetric = (row: PolicyRatiosPerPolicyDto, key: MetricKey): number => {
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
                return 0
        }
    }

    const chartData = useMemo(
        () =>
            (data?.policies ?? []).map(row => ({
                policyName: row.policyName,
                value: selectMetric(row, metricKey)
            })),
        [data, metricKey]
    )

    if (isLoading) {
        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{title}</Text>
                <Text type='p'>Загружаю метрики политик...</Text>
            </section>
        )
    }

    if (isError) {
        const message =
            (error as any)?.data?.message ??
            (error as any)?.error ??
            'Не удалось загрузить метрики политик (policy_ratios).'

        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{title}</Text>
                <Text type='p'>{String(message)}</Text>
            </section>
        )
    }

    if (!data || !data.policies || data.policies.length === 0) {
        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{title}</Text>
                <Text type='p'>Пока нет сохранённого отчёта с метриками политик.</Text>
            </section>
        )
    }

    const handleViewModeChange = (mode: 'chart' | 'table') => {
        setViewMode(mode)
    }

    const handleMetricChange: React.ChangeEventHandler<HTMLSelectElement> = e => {
        setMetricKey(e.target.value as MetricKey)
    }

    const report: PolicyRatiosReportDto = data

    return (
        <section className={cls.PolicyRatiosSection}>
            <div className={cls.headerRow}>
                <div className={cls.headerText}>
                    <Text type='h3'>{title}</Text>
                    {report.fromDateUtc && report.toDateUtc && (
                        <Text type='p'>
                            Окно бэктеста: {new Date(report.fromDateUtc).toLocaleDateString()} —{' '}
                            {new Date(report.toDateUtc).toLocaleDateString()}
                        </Text>
                    )}
                </div>

                <div className={cls.controls}>
                    <div className={cls.metricSelectWrapper}>
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
                    </div>

                    <div className={cls.toggleGroup}>
                        <button
                            type='button'
                            className={classNames(cls.toggleBtn, {
                                [cls.toggleBtnActive]: viewMode === 'chart'
                            })}
                            onClick={() => handleViewModeChange('chart')}>
                            График
                        </button>
                        <button
                            type='button'
                            className={classNames(cls.toggleBtn, {
                                [cls.toggleBtnActive]: viewMode === 'table'
                            })}
                            onClick={() => handleViewModeChange('table')}>
                            Таблица
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'chart' ?
                <div className={cls.chartContainer}>
                    <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='policyName' />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey='value' name={currentMetric.label} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            :   <div className={cls.tableWrapper}>
                    <table className={cls.table}>
                        <thead>
                            <tr>
                                <th>Политика</th>
                                <th>Сделок</th>
                                <th>PnL %</th>
                                <th>MaxDD %</th>
                                <th>Sharpe</th>
                                <th>Sortino</th>
                                <th>Calmar</th>
                                <th>WinRate %</th>
                                <th>Withdrawn $</th>
                                <th>Liq?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.policies.map(row => (
                                <tr key={row.policyName}>
                                    <td>{row.policyName}</td>
                                    <td>{row.tradesCount}</td>
                                    <td>{row.totalPnlPct.toFixed(2)}</td>
                                    <td>{row.maxDdPct.toFixed(2)}</td>
                                    <td>{Number.isFinite(row.sharpe) ? row.sharpe.toFixed(2) : '—'}</td>
                                    <td>{Number.isFinite(row.sortino) ? row.sortino.toFixed(2) : '—'}</td>
                                    <td>{Number.isFinite(row.calmar) ? row.calmar.toFixed(2) : '—'}</td>
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
        </section>
    )
}
