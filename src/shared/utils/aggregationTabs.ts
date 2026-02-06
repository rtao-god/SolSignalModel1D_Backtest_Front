/*
	aggregationTabs — подпункты страницы агрегации прогнозов.

	Зачем:
		- Дает статический список якорей для Sidebar.
*/

export interface AggregationTabConfig {
    id: string
    label: string
    anchor: string
}

export const AGGREGATION_TABS: AggregationTabConfig[] = [
    { id: 'probs', label: 'Вероятности', anchor: 'agg-probs' },
    { id: 'metrics', label: 'Метрики', anchor: 'agg-metrics' },
    { id: 'debug', label: 'Debug последних дней', anchor: 'agg-debug' }
]
