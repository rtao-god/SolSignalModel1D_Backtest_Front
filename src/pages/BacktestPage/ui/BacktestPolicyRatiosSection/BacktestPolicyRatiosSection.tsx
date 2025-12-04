import { useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { useGetBacktestPolicyRatiosQuery } from '@/shared/api/api'
import type { PolicyRatiosReportDto, PolicyRatiosPerPolicyDto } from '@/shared/types/policyRatios.types'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Cell } from 'recharts'
import cls from './BacktestPolicyRatiosSection.module.scss'

interface BacktestPolicyRatiosSectionProps {
    /** id профиля бэктеста; по умолчанию "baseline". */
    profileId?: string
    /** Заголовок секции. */
    title?: string
}

/** Доступные метрики для графика и таблицы. */
type MetricKey = 'totalPnlPct' | 'sharpe' | 'sortino' | 'calmar' | 'winRatePct'

/**
 * Конфигурация метрик:
 * - label используется в селекте и легенде графика,
 * - isPercent определяет форматирование оси и tooltip.
 */
const metricOptions: { key: MetricKey; label: string; isPercent?: boolean }[] = [
    { key: 'totalPnlPct', label: 'PnL %', isPercent: true },
    { key: 'sharpe', label: 'Sharpe' },
    { key: 'sortino', label: 'Sortino' },
    { key: 'calmar', label: 'Calmar' },
    { key: 'winRatePct', label: 'WinRate %', isPercent: true }
]

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
    const [metricKey, setMetricKey] = useState<MetricKey>('totalPnlPct')

    const currentMetric = metricOptions.find(m => m.key === metricKey) ?? metricOptions[0]
    const isPercentMetric = Boolean(currentMetric.isPercent)

    /**
     * Унифицированный доступ к значениям метрик.
     * Здесь только извлечение значения, без форматирования и без фильтрации NaN/Infinity.
     */
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

    /**
     * Данные для графика:
     * - приводим значения к числу или null (если NaN/Infinity),
     * - график не будет ломаться на проблемных значениях (например, Sharpe при отсутствии сделок).
     */
    const chartData = useMemo(
        () =>
            (data?.policies ?? []).map(row => {
                const raw = selectMetric(row, metricKey)
                const value = Number.isFinite(raw) ? raw : null

                return {
                    policyName: row.policyName,
                    value
                }
            }),
        [data, metricKey]
    )

    const hasValidChartValues = chartData.some(d => d.value !== null)

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
                    {hasValidChartValues ?
                        <ResponsiveContainer width='100%' height='100%'>
                            <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 40 }}>
                                <CartesianGrid strokeDasharray='3 3' vertical={false} />

                                <XAxis
                                    dataKey='policyName'
                                    tick={{ fill: 'rgba(255, 255, 255, 0.85)', fontSize: 11 }}
                                    angle={-35}
                                    textAnchor='end'
                                    height={50}
                                />

                                <YAxis
                                    tick={{ fill: 'rgba(255, 255, 255, 0.85)', fontSize: 11 }}
                                    width={60}
                                    tickFormatter={value => {
                                        if (typeof value !== 'number') {
                                            return value
                                        }

                                        if (isPercentMetric) {
                                            // Для процентов на оси достаточно целых значений (0%, 10%, 20%, ...)
                                            return `${value.toFixed(0)}%`
                                        }

                                        // Для коэффициентов показываем целые значения на оси,
                                        // детализация уходит в tooltip.
                                        return value.toFixed(0)
                                    }}
                                />

                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                        borderRadius: 8,
                                        border: '1px solid rgba(255, 255, 255, 0.16)',
                                        padding: '8px 10px',
                                        fontSize: 12
                                    }}
                                    labelStyle={{
                                        fontWeight: 500,
                                        marginBottom: 4
                                    }}
                                    formatter={(value: any) => {
                                        if (typeof value !== 'number') {
                                            return value
                                        }

                                        const formatted = isPercentMetric ? `${value.toFixed(2)} %` : value.toFixed(2)

                                        return [formatted, currentMetric.label]
                                    }}
                                    labelFormatter={label => `Политика: ${label}`}
                                />

                                {/* Линия нулевого уровня — визуальное разделение "плюс/минус" */}
                                <ReferenceLine y={0} stroke='rgba(255, 255, 255, 0.4)' strokeDasharray='3 3' />

                                <Bar dataKey='value' name={currentMetric.label} radius={[4, 4, 0, 0]} barSize={28}>
                                    {chartData.map(entry => (
                                        <Cell
                                            key={entry.policyName}
                                            fill={
                                                entry.value == null ? 'rgba(255, 255, 255, 0.3)'
                                                : entry.value >= 0 ?
                                                    '#4caf50'
                                                :   '#ff6b6b'
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    :   <div className={cls.chartEmptyState}>
                            <Text type='p'>
                                Нет валидных значений для выбранной метрики. Попробуйте выбрать другую метрику или
                                изменить окно бэктеста.
                            </Text>
                        </div>
                    }
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
