import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { AggregationMetricsSnapshotDto, AggregationProbsSnapshotDto } from '@/shared/types/aggregation.types'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'

const { aggregationProbs, aggregationMetrics } = API_ROUTES.backtest
const AGGREGATION_PROBS_QUERY_KEY = ['aggregation', 'probs'] as const
const AGGREGATION_METRICS_QUERY_KEY = ['aggregation', 'metrics'] as const

async function fetchAggregationProbs(): Promise<AggregationProbsSnapshotDto> {
    const resp = await fetch(`${API_BASE_URL}${aggregationProbs.path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load aggregation probs', resp, text))
    }

    return (await resp.json()) as AggregationProbsSnapshotDto
}

async function fetchAggregationMetrics(): Promise<AggregationMetricsSnapshotDto> {
    const resp = await fetch(`${API_BASE_URL}${aggregationMetrics.path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load aggregation metrics', resp, text))
    }

    return (await resp.json()) as AggregationMetricsSnapshotDto
}
export function useAggregationProbsQuery(): UseQueryResult<AggregationProbsSnapshotDto, Error> {
    return useQuery({
        queryKey: AGGREGATION_PROBS_QUERY_KEY,
        queryFn: fetchAggregationProbs,
        retry: false
    })
}
export function useAggregationMetricsQuery(): UseQueryResult<AggregationMetricsSnapshotDto, Error> {
    return useQuery({
        queryKey: AGGREGATION_METRICS_QUERY_KEY,
        queryFn: fetchAggregationMetrics,
        retry: false
    })
}

export async function prefetchAggregationStats(queryClient: QueryClient): Promise<void> {
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: AGGREGATION_PROBS_QUERY_KEY,
            queryFn: fetchAggregationProbs,
            retry: false
        }),
        queryClient.prefetchQuery({
            queryKey: AGGREGATION_METRICS_QUERY_KEY,
            queryFn: fetchAggregationMetrics,
            retry: false
        })
    ])
}
