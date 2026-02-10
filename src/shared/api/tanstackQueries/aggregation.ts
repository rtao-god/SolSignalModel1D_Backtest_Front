import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type {
    AggregationMetricsSnapshotDto,
    AggregationProbsSnapshotDto
} from '@/shared/types/aggregation.types'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'

const { aggregationProbs, aggregationMetrics } = API_ROUTES.backtest

async function fetchAggregationProbs(): Promise<AggregationProbsSnapshotDto> {
    const resp = await fetch(`${API_BASE_URL}${aggregationProbs.path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load aggregation probs: ${resp.status} ${text}`)
    }

    return (await resp.json()) as AggregationProbsSnapshotDto
}

async function fetchAggregationMetrics(): Promise<AggregationMetricsSnapshotDto> {
    const resp = await fetch(`${API_BASE_URL}${aggregationMetrics.path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load aggregation metrics: ${resp.status} ${text}`)
    }

    return (await resp.json()) as AggregationMetricsSnapshotDto
}
export function useAggregationProbsQuery(): UseQueryResult<AggregationProbsSnapshotDto, Error> {
    return useQuery({
        queryKey: ['aggregation', 'probs'],
        queryFn: fetchAggregationProbs,
        retry: false
    })
}
export function useAggregationMetricsQuery(): UseQueryResult<AggregationMetricsSnapshotDto, Error> {
    return useQuery({
        queryKey: ['aggregation', 'metrics'],
        queryFn: fetchAggregationMetrics,
        retry: false
    })
}
