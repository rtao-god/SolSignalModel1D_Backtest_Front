import type {
    AggregationMetricsSnapshotDto,
    AggregationProbsSnapshotDto
} from '@/shared/types/aggregation.types'
import type { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

/*
	aggregationEndpoints — endpoints API.

	Зачем:
		- Даёт доступ к агрегированным вероятностям и метрикам.
*/

/*
	Эндпоинты агрегации прогнозов.

	- /backtest/aggregation/probs
	- /backtest/aggregation/metrics
*/
export const aggregationEndpoints = (builder: ApiEndpointBuilder) => {
    const { aggregationProbs, aggregationMetrics } = API_ROUTES.backtest

    return {
        getAggregationProbs: builder.query<AggregationProbsSnapshotDto, void>({
            query: () => ({
                url: aggregationProbs.path,
                method: aggregationProbs.method
            })
        }),
        getAggregationMetrics: builder.query<AggregationMetricsSnapshotDto, void>({
            query: () => ({
                url: aggregationMetrics.path,
                method: aggregationMetrics.method
            })
        })
    }
}
