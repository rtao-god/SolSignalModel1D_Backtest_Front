import type {
    AggregationMetricsSnapshotDto,
    AggregationProbsSnapshotDto
} from '@/shared/types/aggregation.types'
import type { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

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
