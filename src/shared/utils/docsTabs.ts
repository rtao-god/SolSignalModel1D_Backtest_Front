export interface DocsTabConfig {
    id: string
    label: string
    anchor: string
}
export const DOCS_MODELS_TABS: DocsTabConfig[] = [
    {
        id: 'models-overview',
        label: 'Что означает каждая модель',
        anchor: 'models-overview'
    },
    {
        id: 'models-daily',
        label: 'Дневная модель (Daily)',
        anchor: 'models-daily'
    },
    {
        id: 'models-micro',
        label: 'Микро-модель',
        anchor: 'models-micro'
    },
    {
        id: 'models-sl',
        label: 'SL-модель',
        anchor: 'models-sl'
    },
    {
        id: 'models-pipeline',
        label: 'Пайплайн и данные',
        anchor: 'models-pipeline'
    }
]
export const DOCS_TESTS_TABS: DocsTabConfig[] = [
    {
        id: 'tests-overview',
        label: 'Общий обзор тестов',
        anchor: 'tests-overview'
    },
    {
        id: 'tests-sanity',
        label: 'Sanity-checks',
        anchor: 'tests-sanity'
    },
    {
        id: 'tests-leakage',
        label: 'Leakage-тесты',
        anchor: 'tests-leakage'
    },
    {
        id: 'tests-perf',
        label: 'Перфоманс-тесты',
        anchor: 'tests-perf'
    }
]
export const DOCS_TRUTHFULNESS_TABS: DocsTabConfig[] = [
    {
        id: 'truth-overview',
        label: 'Контур правдивости',
        anchor: 'truth-overview'
    },
    {
        id: 'truth-causal',
        label: 'Казуальный слой',
        anchor: 'truth-causal'
    },
    {
        id: 'truth-omniscient',
        label: 'Post-fact слой',
        anchor: 'truth-omniscient'
    },
    {
        id: 'truth-structure',
        label: 'Проекты и Interop',
        anchor: 'truth-structure'
    },
    {
        id: 'truth-delivery',
        label: 'Отчёты, API и UI',
        anchor: 'truth-delivery'
    },
    {
        id: 'truth-tests',
        label: 'Тесты и барьеры',
        anchor: 'truth-tests'
    }
]
