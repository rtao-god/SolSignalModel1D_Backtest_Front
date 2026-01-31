import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { useAggregationMetricsQuery, useAggregationProbsQuery } from '@/shared/api/tanstackQueries/aggregation'
import type { AggregationStatsPageProps } from './aggregationStatsTypes'
import { AggregationStatsPageInner } from './AggregationStatsPageInner'

/*
	AggregationStatsPage — контейнер страницы агрегации прогнозов.

	Зачем:
		- Загружает агрегацию вероятностей и метрик.
		- Показывает единый PageDataBoundary для двух запросов.

	Источники данных и сайд-эффекты:
		- useAggregationProbsQuery() и useAggregationMetricsQuery() (tanstack query).

	Контракты:
		- Внутренний UI получает оба снапшота одновременно.
*/
export default function AggregationStatsPage({ className }: AggregationStatsPageProps) {
    const probsQuery = useAggregationProbsQuery()
    const metricsQuery = useAggregationMetricsQuery()

    const hasData = Boolean(probsQuery.data) && Boolean(metricsQuery.data)
    const isError = Boolean(probsQuery.isError || metricsQuery.isError)
    const error = probsQuery.error ?? metricsQuery.error

    const handleRetry = () => {
        probsQuery.refetch()
        metricsQuery.refetch()
    }

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={hasData}
            onRetry={handleRetry}
            errorTitle='Не удалось загрузить агрегацию прогнозов'>
            {hasData && probsQuery.data && metricsQuery.data && (
                <AggregationStatsPageInner className={className} probs={probsQuery.data} metrics={metricsQuery.data} />
            )}
        </PageDataBoundary>
    )
}
