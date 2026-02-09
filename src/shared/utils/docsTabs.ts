
export interface DocsTabConfig {
    id: string
    label: string
    anchor: string
}
export const DOCS_MODELS_TABS: DocsTabConfig[] = [
    {
        id: 'models-overview',
        label: 'Общий обзор',
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

