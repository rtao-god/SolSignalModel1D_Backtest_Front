export interface DeveloperTabConfig {
    id: string
    label: string
    anchor: string
}

export const DEVELOPER_BACKEND_STRUCTURE_TABS: DeveloperTabConfig[] = [
    {
        id: 'developer-structure-reading-map',
        label: 'Как читать',
        anchor: 'developer-structure-reading-map'
    },
    {
        id: 'developer-structure-root-solution',
        label: 'Root и solutions',
        anchor: 'developer-structure-root-solution'
    },
    {
        id: 'developer-structure-core-foundation',
        label: 'Core foundation',
        anchor: 'developer-structure-core-foundation'
    },
    {
        id: 'developer-structure-model-pipeline',
        label: 'Model pipeline',
        anchor: 'developer-structure-model-pipeline'
    },
    {
        id: 'developer-structure-runtime-delivery',
        label: 'Runtime / delivery',
        anchor: 'developer-structure-runtime-delivery'
    },
    {
        id: 'developer-structure-guards-quality',
        label: 'Guards / quality',
        anchor: 'developer-structure-guards-quality'
    },
    {
        id: 'developer-structure-root-source',
        label: 'Root source / exclusions',
        anchor: 'developer-structure-root-source'
    }
]

export const DEVELOPER_RUNTIME_FLOW_TABS: DeveloperTabConfig[] = [
    {
        id: 'developer-runtime-entrypoints',
        label: 'Entry points',
        anchor: 'developer-runtime-entrypoints'
    },
    {
        id: 'developer-runtime-bootstrap',
        label: 'Bootstrap',
        anchor: 'developer-runtime-bootstrap'
    },
    {
        id: 'developer-runtime-prediction',
        label: 'Prediction flow',
        anchor: 'developer-runtime-prediction'
    },
    {
        id: 'developer-runtime-backtest',
        label: 'Backtest flow',
        anchor: 'developer-runtime-backtest'
    }
]

export const DEVELOPER_REPORTS_API_TABS: DeveloperTabConfig[] = [
    {
        id: 'developer-delivery-reports',
        label: 'Report builders',
        anchor: 'developer-delivery-reports'
    },
    {
        id: 'developer-delivery-storage',
        label: 'Storage',
        anchor: 'developer-delivery-storage'
    },
    {
        id: 'developer-delivery-api',
        label: 'API endpoints',
        anchor: 'developer-delivery-api'
    },
    {
        id: 'developer-delivery-frontend',
        label: 'Frontend contract',
        anchor: 'developer-delivery-frontend'
    }
]

export const DEVELOPER_TESTS_GUARDS_TABS: DeveloperTabConfig[] = [
    {
        id: 'developer-guards-tests',
        label: 'Test suites',
        anchor: 'developer-guards-tests'
    },
    {
        id: 'developer-guards-arch',
        label: 'Arch barriers',
        anchor: 'developer-guards-arch'
    },
    {
        id: 'developer-guards-analyzers',
        label: 'Analyzers',
        anchor: 'developer-guards-analyzers'
    },
    {
        id: 'developer-guards-selfcheck',
        label: 'Self-check',
        anchor: 'developer-guards-selfcheck'
    }
]
