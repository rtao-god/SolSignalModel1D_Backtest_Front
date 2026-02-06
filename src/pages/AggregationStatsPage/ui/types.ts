import type {
    AggregationMetricsSnapshotDto,
    AggregationProbsSnapshotDto
} from '@/shared/types/aggregation.types'

export interface AggregationStatsPageProps {
    className?: string
}

export interface AggregationStatsPageInnerProps {
    className?: string
    probs: AggregationProbsSnapshotDto
    metrics: AggregationMetricsSnapshotDto
}
