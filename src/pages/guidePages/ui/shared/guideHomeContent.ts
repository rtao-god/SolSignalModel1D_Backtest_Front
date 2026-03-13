import { AppRoute } from '@/app/providers/router/config/types'

export const GUIDE_HOME_METRIC_IDS = ['topics', 'readingRoutes', 'relatedContours'] as const

export const GUIDE_HOME_FACT_ROWS = [
    {
        id: 'meaning',
        links: [
            { id: 'models', route: AppRoute.GUIDE_MODELS },
            { id: 'time', route: AppRoute.GUIDE_TIME }
        ]
    },
    {
        id: 'branchesAndSplits',
        links: [
            { id: 'branches', route: AppRoute.GUIDE_BRANCHES },
            { id: 'splits', route: AppRoute.GUIDE_SPLITS }
        ]
    },
    {
        id: 'features',
        links: [
            { id: 'features', route: AppRoute.GUIDE_FEATURES },
            { id: 'models', route: AppRoute.GUIDE_MODELS }
        ]
    },
    {
        id: 'trust',
        links: [
            { id: 'truthfulness', route: AppRoute.GUIDE_TRUTHFULNESS },
            { id: 'tests', route: AppRoute.GUIDE_TESTS }
        ]
    },
    {
        id: 'nextAfterGuide',
        links: [
            { id: 'analysisHome', route: AppRoute.ANALYSIS_HOME },
            { id: 'diagnosticsHome', route: AppRoute.DIAGNOSTICS_HOME }
        ]
    }
] as const

export const GUIDE_HOME_OVERVIEW_BLOCKS = [
    {
        id: 'readingOrder',
        stepIds: ['termsFirst', 'behaviorThen', 'trustFinally'],
        links: [
            { id: 'models', route: AppRoute.GUIDE_MODELS },
            { id: 'truthfulness', route: AppRoute.GUIDE_TRUTHFULNESS },
            { id: 'tests', route: AppRoute.GUIDE_TESTS }
        ]
    },
    {
        id: 'pageBoundaries',
        bulletIds: ['knowledgeBaseScope', 'notRuntimeMap', 'notFailureAttribution'],
        links: [
            { id: 'analysisHome', route: AppRoute.ANALYSIS_HOME },
            { id: 'diagnosticsHome', route: AppRoute.DIAGNOSTICS_HOME }
        ]
    },
    {
        id: 'relatedContours',
        bulletIds: ['analysisRole', 'diagnosticsRole', 'developerRole'],
        links: [
            { id: 'analysisHome', route: AppRoute.ANALYSIS_HOME },
            { id: 'diagnosticsHome', route: AppRoute.DIAGNOSTICS_HOME },
            { id: 'developerHome', route: AppRoute.DEVELOPER }
        ]
    }
] as const
