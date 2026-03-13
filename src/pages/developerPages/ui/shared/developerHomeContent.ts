import { AppRoute } from '@/app/providers/router/config/types'
import type {
    DeveloperHomeCardConfig,
    DeveloperHomeFactRowConfig,
    DeveloperHomeMetricConfig,
    DeveloperHomeOverviewBlockConfig,
    DeveloperHomeTableRowConfig
} from './types'

// Home overview не дублирует детальные developer-страницы целиком.
// Его задача — дать базовую карту проекта и сразу отправить в owner-страницу по теме.
export const DEVELOPER_HOME_CARDS: readonly DeveloperHomeCardConfig[] = [
    {
        id: 'backendStructure',
        route: AppRoute.DEVELOPER_BACKEND_STRUCTURE
    },
    {
        id: 'runtimeFlow',
        route: AppRoute.DEVELOPER_RUNTIME_FLOW
    },
    {
        id: 'reportsApi',
        route: AppRoute.DEVELOPER_REPORTS_API
    },
    {
        id: 'testsGuards',
        route: AppRoute.DEVELOPER_TESTS_GUARDS
    }
]

export const DEVELOPER_HOME_METRICS: readonly DeveloperHomeMetricConfig[] = [
    {
        id: 'projects'
    },
    {
        id: 'runtime'
    },
    {
        id: 'tests'
    },
    {
        id: 'pipeline'
    }
]

export const DEVELOPER_HOME_FACT_ROWS: readonly DeveloperHomeFactRowConfig[] = [
    {
        id: 'purpose',
        links: [
            {
                id: 'runtimeFlow',
                route: AppRoute.DEVELOPER_RUNTIME_FLOW
            },
            {
                id: 'reportsApi',
                route: AppRoute.DEVELOPER_REPORTS_API
            }
        ]
    },
    {
        id: 'frameworks',
        links: [
            {
                id: 'backendStructure',
                route: AppRoute.DEVELOPER_BACKEND_STRUCTURE
            }
        ]
    },
    {
        id: 'universe',
        links: [
            {
                id: 'runtimeFlow',
                route: AppRoute.DEVELOPER_RUNTIME_FLOW
            }
        ]
    },
    {
        id: 'entrypoints',
        links: [
            {
                id: 'runtimeFlow',
                route: AppRoute.DEVELOPER_RUNTIME_FLOW
            },
            {
                id: 'backendStructure',
                route: AppRoute.DEVELOPER_BACKEND_STRUCTURE
            }
        ]
    },
    {
        id: 'artifacts',
        links: [
            {
                id: 'reportsApi',
                route: AppRoute.DEVELOPER_REPORTS_API
            }
        ]
    },
    {
        id: 'whatIsNotHere',
        links: [
            {
                id: 'reportsApi',
                route: AppRoute.DEVELOPER_REPORTS_API
            },
            {
                id: 'runtimeFlow',
                route: AppRoute.DEVELOPER_RUNTIME_FLOW
            }
        ]
    }
]

export const DEVELOPER_HOME_OVERVIEW_BLOCKS: readonly DeveloperHomeOverviewBlockConfig[] = [
    {
        id: 'solutionShape',
        bulletIds: ['mainMap', 'zones', 'details'],
        links: [
            {
                id: 'backendStructure',
                route: AppRoute.DEVELOPER_BACKEND_STRUCTURE
            }
        ]
    },
    {
        id: 'pipeline',
        stepIds: ['loadData', 'validateData', 'prepareRows', 'splitHistory', 'trainAndInfer', 'buildReports'],
        links: [
            {
                id: 'runtimeFlow',
                route: AppRoute.DEVELOPER_RUNTIME_FLOW
            },
            {
                id: 'reportsApi',
                route: AppRoute.DEVELOPER_REPORTS_API
            }
        ]
    },
    {
        id: 'causalBoundary',
        bulletIds: ['causalAssembly', 'omniscientAssembly', 'oneWayBoundary', 'howCausalityWorks'],
        links: [
            {
                id: 'backendStructure',
                route: AppRoute.DEVELOPER_BACKEND_STRUCTURE
            },
            {
                id: 'testsGuards',
                route: AppRoute.DEVELOPER_TESTS_GUARDS
            }
        ]
    },
    {
        id: 'delivery',
        bulletIds: ['documents', 'workers', 'failFast'],
        layout: 'fullWidth',
        links: [
            {
                id: 'reportsApi',
                route: AppRoute.DEVELOPER_REPORTS_API
            },
            {
                id: 'runtimeFlow',
                route: AppRoute.DEVELOPER_RUNTIME_FLOW
            }
        ]
    },
    {
        id: 'tests',
        bulletIds: ['coverageShape', 'featureIsolation', 'datasetBoundary', 'reportGuards', 'selfCheck'],
        layout: 'fullWidth',
        links: [
            {
                id: 'testsGuards',
                route: AppRoute.DEVELOPER_TESTS_GUARDS
            }
        ],
        tableId: 'suiteSummary'
    }
]

export const DEVELOPER_HOME_TEST_SUITE_ROWS: readonly DeveloperHomeTableRowConfig[] = [
    {
        id: 'mainSuite'
    },
    {
        id: 'archSuite'
    },
    {
        id: 'analyzersSuite'
    },
    {
        id: 'cachePathSuite'
    }
]
