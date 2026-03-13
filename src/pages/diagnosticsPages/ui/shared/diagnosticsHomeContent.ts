import { AppRoute } from '@/app/providers/router/config/types'

export const DIAGNOSTICS_HOME_METRIC_IDS = ['reports', 'failureLenses', 'relatedContours'] as const

export const DIAGNOSTICS_HOME_FACT_ROWS = [
    {
        id: 'drawdown',
        links: [{ id: 'risk', route: AppRoute.BACKTEST_DIAGNOSTICS }]
    },
    {
        id: 'filter',
        links: [{ id: 'guardrail', route: AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL }]
    },
    {
        id: 'actor',
        links: [{ id: 'decisions', route: AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS }]
    },
    {
        id: 'repetition',
        links: [{ id: 'hotspots', route: AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS }]
    },
    {
        id: 'leftovers',
        links: [{ id: 'other', route: AppRoute.BACKTEST_DIAGNOSTICS_OTHER }]
    },
    {
        id: 'finishedResult',
        links: [{ id: 'analysisHome', route: AppRoute.ANALYSIS_HOME }]
    }
] as const

export const DIAGNOSTICS_HOME_OVERVIEW_BLOCKS = [
    {
        id: 'readingOrder',
        stepIds: ['riskFirst', 'filterSecond', 'actorThird', 'clusterFourth', 'leftoversFifth'],
        links: [
            { id: 'risk', route: AppRoute.BACKTEST_DIAGNOSTICS },
            { id: 'guardrail', route: AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL },
            { id: 'decisions', route: AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS }
        ]
    },
    {
        id: 'diagnosticsScope',
        bulletIds: ['riskSurface', 'filterSurface', 'actorSurface', 'clusterSurface'],
        links: [
            { id: 'risk', route: AppRoute.BACKTEST_DIAGNOSTICS },
            { id: 'hotspots', route: AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS }
        ]
    },
    {
        id: 'boundaries',
        bulletIds: ['diagnosticsVsAnalysis', 'diagnosticsVsGuide', 'diagnosticsVsDeveloper'],
        links: [
            { id: 'analysisHome', route: AppRoute.ANALYSIS_HOME },
            { id: 'guideHome', route: AppRoute.GUIDE },
            { id: 'developerHome', route: AppRoute.DEVELOPER }
        ]
    }
] as const
