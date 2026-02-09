export interface ExplainTabConfig {
    id: string
    label: string
    anchor: string
}

export const EXPLAIN_MODELS_TABS: ExplainTabConfig[] = [
    { id: 'explain-models-overview', label: 'Общий обзор', anchor: 'explain-models-overview' },
    { id: 'explain-models-daily', label: 'Дневная модель', anchor: 'explain-models-daily' },
    { id: 'explain-models-micro', label: 'Микро-модель', anchor: 'explain-models-micro' },
    { id: 'explain-models-sl', label: 'SL-модель', anchor: 'explain-models-sl' },
    { id: 'explain-models-aggregation', label: 'Сборка сигнала', anchor: 'explain-models-aggregation' }
]

export const EXPLAIN_BRANCHES_TABS: ExplainTabConfig[] = [
    { id: 'explain-branches-overview', label: 'Зачем ветки', anchor: 'explain-branches-overview' },
    { id: 'explain-branches-base', label: 'BASE', anchor: 'explain-branches-base' },
    { id: 'explain-branches-anti', label: 'ANTI-D', anchor: 'explain-branches-anti' },
    { id: 'explain-branches-conditions', label: 'Условия ANTI-D', anchor: 'explain-branches-conditions' },
    { id: 'explain-branches-usage', label: 'Как читать результаты', anchor: 'explain-branches-usage' }
]

export const EXPLAIN_SPLITS_TABS: ExplainTabConfig[] = [
    { id: 'explain-splits-overview', label: 'Зачем сплиты', anchor: 'explain-splits-overview' },
    { id: 'explain-splits-train', label: 'Train', anchor: 'explain-splits-train' },
    { id: 'explain-splits-oos', label: 'OOS', anchor: 'explain-splits-oos' },
    { id: 'explain-splits-recent', label: 'Recent (240d)', anchor: 'explain-splits-recent' },
    { id: 'explain-splits-full', label: 'Full history', anchor: 'explain-splits-full' }
]

export const EXPLAIN_PROJECT_TABS: ExplainTabConfig[] = [
    { id: 'explain-project-overview', label: 'Общий пайплайн', anchor: 'explain-project-overview' },
    { id: 'explain-project-causal', label: 'Causal vs Omniscient', anchor: 'explain-project-causal' },
    { id: 'explain-project-structure', label: 'Проекты и папки', anchor: 'explain-project-structure' },
    { id: 'explain-project-reports', label: 'Отчёты и API', anchor: 'explain-project-reports' },
    { id: 'explain-project-tests', label: 'Тесты и защиты', anchor: 'explain-project-tests' }
]

export const EXPLAIN_TIME_TABS: ExplainTabConfig[] = [
    { id: 'explain-time-overview', label: 'NY-торговый день', anchor: 'explain-time-overview' },
    { id: 'explain-time-baseline', label: 'Baseline-exit', anchor: 'explain-time-baseline' },
    { id: 'explain-time-day-keys', label: 'Day-key и типы времени', anchor: 'explain-time-day-keys' },
    { id: 'explain-time-weekend', label: 'Выходные и исключения', anchor: 'explain-time-weekend' }
]

export const EXPLAIN_FEATURES_TABS: ExplainTabConfig[] = [
    { id: 'explain-features-overview', label: 'Как читать фичи', anchor: 'explain-features-overview' },
    { id: 'explain-features-returns', label: 'Доходности и спреды', anchor: 'explain-features-returns' },
    { id: 'explain-features-indicators', label: 'Индикаторы и макро', anchor: 'explain-features-indicators' },
    { id: 'explain-features-momentum', label: 'Momentum и волатильность', anchor: 'explain-features-momentum' },
    { id: 'explain-features-regime', label: 'Режимы и EMA', anchor: 'explain-features-regime' }
]
