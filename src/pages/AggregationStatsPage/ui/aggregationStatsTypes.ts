import type {
    AggregationMetricsSnapshotDto,
    AggregationProbsSnapshotDto
} from '@/shared/types/aggregation.types'

/*
	Типы страницы AggregationStatsPage.

	- Отдельные интерфейсы нужны, чтобы не раздувать UI-компонент и оставить контракт явным.
*/

export interface AggregationStatsPageProps {
    className?: string
}

export interface AggregationStatsPageInnerProps {
    className?: string
    probs: AggregationProbsSnapshotDto
    metrics: AggregationMetricsSnapshotDto
}
