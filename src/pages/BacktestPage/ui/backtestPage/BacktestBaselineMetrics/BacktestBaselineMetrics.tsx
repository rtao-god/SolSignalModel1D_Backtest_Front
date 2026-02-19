import type { BacktestSummaryDto } from '@/shared/types/backtest.types'
import { Text } from '@/shared/ui'
import { getMetricValue } from '@/shared/utils/backtestMetrics'
import cls from './BacktestBaselineMetrics.module.scss'
interface BacktestBaselineMetricsProps {
    baselineSummary: BacktestSummaryDto | null
    previewSummary: BacktestSummaryDto | null
}

export function BacktestBaselineMetrics({ baselineSummary, previewSummary }: BacktestBaselineMetricsProps) {
    const baselineBestPnl = getMetricValue(baselineSummary, 'BestTotalPnlPct')
    const previewBestPnl = getMetricValue(previewSummary, 'BestTotalPnlPct')
    const deltaPnl = baselineBestPnl !== null && previewBestPnl !== null ? previewBestPnl - baselineBestPnl : null
    const deltaClassName =
        deltaPnl === null ? ''
        : deltaPnl >= 0 ?
            cls.metricDeltaPositive
        :   cls.metricDeltaNegative

    return (
        <section id='baseline' className={cls.metricsRow}>
            <Text type='h2'>Итог по лучшей политике (baseline vs what-if)</Text>
            <div className={cls.metricsValues}>
                <div className={cls.metricBadge}>
                    <Text className={cls.metricLabel}>Baseline</Text>
                    <Text className={cls.metricValue}>
                        {baselineBestPnl !== null ? `${baselineBestPnl.toFixed(2)} %` : 'n/a'}
                    </Text>
                </div>
                <div className={cls.metricBadge}>
                    <Text className={cls.metricLabel}>What-if</Text>
                    <Text className={cls.metricValue}>{previewBestPnl !== null ? `${previewBestPnl.toFixed(2)} %` : 'n/a'}</Text>
                </div>
                <div className={cls.metricBadge}>
                    <Text className={cls.metricLabel}>Дельта</Text>
                    <Text className={`${cls.metricValue} ${deltaClassName}`}>
                        {deltaPnl !== null ? `${deltaPnl >= 0 ? '+' : ''}${deltaPnl.toFixed(2)} %` : 'n/a'}
                    </Text>
                </div>
            </div>
        </section>
    )
}
