import { useSuspenseQuery, type UseSuspenseQueryResult } from '@tanstack/react-query'
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
export function useAggregationProbsQuery(): UseSuspenseQueryResult<AggregationProbsSnapshotDto, Error> {
    return useSuspenseQuery({
        queryKey: ['aggregation', 'probs'],
        queryFn: fetchAggregationProbs
    })
}
export function useAggregationMetricsQuery(): UseSuspenseQueryResult<AggregationMetricsSnapshotDto, Error> {
    return useSuspenseQuery({
        queryKey: ['aggregation', 'metrics'],
        queryFn: fetchAggregationMetrics
    })
}
