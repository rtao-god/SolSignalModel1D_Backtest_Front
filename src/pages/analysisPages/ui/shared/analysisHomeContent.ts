import { AppRoute } from '@/app/providers/router/config/types'

export const ANALYSIS_HOME_METRIC_IDS = ['reports', 'readingContours', 'relatedContours'] as const

export const ANALYSIS_HOME_FACT_ROWS = [
    {
        id: 'extremes',
        links: [{ id: 'ratings', route: AppRoute.BACKTEST_DIAGNOSTICS_RATINGS }]
    },
    {
        id: 'policyComparison',
        links: [{ id: 'policyBranchMega', route: AppRoute.BACKTEST_POLICY_BRANCH_MEGA }]
    },
    {
        id: 'regimes',
        links: [
            { id: 'dayStats', route: AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS },
            { id: 'confidenceRisk', route: AppRoute.BACKTEST_CONFIDENCE_RISK }
        ]
    },
    {
        id: 'actualVsForecast',
        links: [{ id: 'realForecastJournal', route: AppRoute.ANALYSIS_REAL_FORECAST_JOURNAL }]
    },
    {
        id: 'formulaTrace',
        links: [{ id: 'executionPipeline', route: AppRoute.BACKTEST_EXECUTION_PIPELINE }]
    },
    {
        id: 'rootCause',
        links: [{ id: 'diagnosticsHome', route: AppRoute.DIAGNOSTICS_HOME }]
    }
] as const

export const ANALYSIS_HOME_OVERVIEW_BLOCKS = [
    {
        id: 'readingOrder',
        stepIds: ['ratingsFirst', 'compareThen', 'regimesThen', 'traceFinally'],
        links: [
            { id: 'ratings', route: AppRoute.BACKTEST_DIAGNOSTICS_RATINGS },
            { id: 'policyBranchMega', route: AppRoute.BACKTEST_POLICY_BRANCH_MEGA },
            { id: 'executionPipeline', route: AppRoute.BACKTEST_EXECUTION_PIPELINE }
        ]
    },
    {
        id: 'analysisScope',
        bulletIds: ['outcomeLayer', 'regimeLayer', 'pipelineLayer'],
        links: [
            { id: 'dayStats', route: AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS },
            { id: 'confidenceRisk', route: AppRoute.BACKTEST_CONFIDENCE_RISK },
            { id: 'realForecastJournal', route: AppRoute.ANALYSIS_REAL_FORECAST_JOURNAL }
        ]
    },
    {
        id: 'boundaries',
        bulletIds: ['analysisVsDiagnostics', 'analysisVsGuide', 'analysisVsDeveloper'],
        links: [
            { id: 'diagnosticsHome', route: AppRoute.DIAGNOSTICS_HOME },
            { id: 'guideHome', route: AppRoute.GUIDE },
            { id: 'developerHome', route: AppRoute.DEVELOPER }
        ]
    }
] as const
