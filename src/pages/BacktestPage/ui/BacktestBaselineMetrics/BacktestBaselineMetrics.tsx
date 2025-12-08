import type { BacktestSummaryDto } from '@/shared/types/backtest.types'
import { Text } from '@/shared/ui'
import { getMetricValue } from '@/shared/utils/backtestMetrics'
import cls from './BacktestBaselineMetrics.module.scss'

interface BacktestBaselineMetricsProps {
    baselineSummary: BacktestSummaryDto
    previewSummary: BacktestSummaryDto | null
}

/**
 * Быстрая метрика сравнения по лучшей политике baseline vs preview формы.
 */
export function BacktestBaselineMetrics({ baselineSummary, previewSummary }: BacktestBaselineMetricsProps) {
    const baselineBestPnl = getMetricValue(baselineSummary, 'BestTotalPnlPct')
    const previewBestPnl = getMetricValue(previewSummary, 'BestTotalPnlPct')
    const deltaPnl = baselineBestPnl !== null && previewBestPnl !== null ? previewBestPnl - baselineBestPnl : null

    return (
        <section id='baseline' className={cls.metricsRow}>
            <Text type='h2'>Итог по лучшей политике (BestTotalPnlPct)</Text>
            <div className={cls.metricsValues}>
                <Text>Baseline: {baselineBestPnl !== null ? `${baselineBestPnl.toFixed(2)} %` : '—'}</Text>
                <Text>Preview: {previewBestPnl !== null ? `${previewBestPnl.toFixed(2)} %` : '—'}</Text>
                <Text>Δ: {deltaPnl !== null ? `${deltaPnl >= 0 ? '+' : ''}${deltaPnl.toFixed(2)} %` : '—'}</Text>
            </div>
        </section>
    )
}
