import { useMemo, useState } from 'react'
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

/*
	BacktestPolicyRatiosSection — секция метрик политик.

	Зачем:
		- Показывает метрики политик в виде графика и таблицы.
		- Даёт быстрый обзор качества через переключаемую метрику.

	Источники данных и сайд-эффекты:
		- useGetBacktestPolicyRatiosQuery() (RTK Query).

	Контракты:
		- profileId должен соответствовать существующему профилю на бэкенде.
*/

// Пропсы секции метрик политик.
interface BacktestPolicyRatiosSectionProps {
    profileId?: string
    title?: string
}

// Поддерживаемые ключи метрик для графика.
type MetricKey = 'totalPnlPct' | 'sharpe' | 'sortino' | 'calmar' | 'winRatePct'

// Опции для селектора метрик.
const metricOptions: { key: MetricKey; label: string; isPercent?: boolean }[] = [
    { key: 'totalPnlPct', label: 'PnL %', isPercent: true },
    { key: 'sharpe', label: 'Sharpe' },
    { key: 'sortino', label: 'Sortino' },
    { key: 'calmar', label: 'Calmar' },
    { key: 'winRatePct', label: 'WinRate %', isPercent: true }
]

const RATIO_COLUMN_TOOLTIPS: Record<string, string> = {
    Политика: 'Имя торговой политики (стратегии), для которой считаются метрики.',
    Сделок: 'Количество сделок по политике за период. Чем больше, тем устойчивее статистика.',
    'PnL %': 'Суммарная доходность по политике в процентах за окно бэктеста.',
    'MaxDD %': 'Максимальная просадка капитала в процентах — ключевой риск‑показатель.',
    Sharpe: 'Sharpe‑ratio: доходность, нормированная на общую волатильность. Чем выше, тем лучше.',
    Sortino: 'Sortino‑ratio: доходность, нормированная только на отрицательную волатильность.',
    Calmar: 'Calmar‑ratio: отношение доходности к максимальной просадке.',
    'WinRate %': 'Доля прибыльных сделок, %.',
    'Withdrawn $': 'Сколько прибыли было выведено из капитала (если применимо).',
    'Liq?': 'Были ли ликвидации у политики (YES/no).'
}

export function BacktestPolicyRatiosSection({
    profileId = 'baseline',
    title = 'Метрики политик (Sharpe / Sortino / PnL)'
}: BacktestPolicyRatiosSectionProps) {
    const { data, isLoading, isError, error } = useGetBacktestPolicyRatiosQuery(profileId)

    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
    const [metricKey, setMetricKey] = useState<MetricKey>('totalPnlPct')

    const currentMetric = metricOptions.find(m => m.key === metricKey) ?? metricOptions[0]
    const isPercentMetric = Boolean(currentMetric.isPercent)

    // Выбор значения метрики из строки отчёта.
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

    // Подготовка данных графика для текущей метрики.
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
                <Text>Загружаю метрики политик...</Text>
            </section>
        )
    }

    if (isError) {
        const resolved = resolveAppError(error)

        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{title}</Text>
                <ErrorBlock
                    code={resolved.code}
                    title={resolved.title}
                    description={resolved.description}
                    details={resolved.rawMessage}
                    compact
                />
            </section>
        )
    }

    if (!data || !data.policies || data.policies.length === 0) {
        return (
            <section className={cls.PolicyRatiosSection}>
                <Text type='h3'>{title}</Text>
                <Text>Пока нет сохранённого отчёта с метриками политик.</Text>
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
                    <Text className={cls.headerSubtitle}>
                        Сравнение политик по risk‑adjusted метрикам (Sharpe/Sortino/Calmar), доходности и просадкам.
                        Переключайте метрику или вид, чтобы оценить устойчивость стратегии.
                    </Text>
                    {report.fromDateUtc && report.toDateUtc && (
                        <Text>
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
                        <Btn
                            className={classNames(cls.toggleBtn, {
                                [cls.toggleBtnActive]: viewMode === 'chart'
                            })}
                            onClick={() => handleViewModeChange('chart')}>
                            График
                        </Btn>
                        <Btn
                            className={classNames(cls.toggleBtn, {
                                [cls.toggleBtnActive]: viewMode === 'table'
                            })}
                            onClick={() => handleViewModeChange('table')}>
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
                        description='При отрисовке блока метрик политик произошла ошибка на клиенте. Остальная часть страницы продолжает работать.'
                        details={sectionError.message}
                        onRetry={reset}
                        compact
                    />
                )}>
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
                                                return `${value.toFixed(0)}%`
                                            }

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

                                            const formatted =
                                                isPercentMetric ? `${value.toFixed(2)} %` : value.toFixed(2)

                                            return [formatted, currentMetric.label]
                                        }}
                                        labelFormatter={label => `Политика: ${label}`}
                                    />

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
                                <Text>
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
                                    <th>{renderTermTooltipTitle('Политика', RATIO_COLUMN_TOOLTIPS.Политика)}</th>
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
            </SectionErrorBoundary>
        </section>
    )
}
