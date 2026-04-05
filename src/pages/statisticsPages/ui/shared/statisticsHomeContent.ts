import { AppRoute } from '@/app/providers/router/config/types'

export const STATISTICS_HOME_METRIC_IDS = ['reports', 'readingContours', 'relatedContours'] as const

export const STATISTICS_HOME_FACT_ROWS = [
    {
        id: 'btcWeakness',
        links: [{ id: 'btcWeakness', route: AppRoute.BACKTEST_BTC_WEAKNESS_STATS }]
    },
    {
        id: 'microOverlay',
        links: [{ id: 'microOverlay', route: AppRoute.BACKTEST_MICRO_OVERLAY_STATS }]
    },
    {
        id: 'slOverlay',
        links: [{ id: 'slOverlay', route: AppRoute.BACKTEST_SL_OVERLAY_STATS }]
    },
    {
        id: 'slStrongDay',
        links: [{ id: 'slStrongDay', route: AppRoute.BACKTEST_SL_STRONG_DAY_STATS }]
    },
    {
        id: 'impulseScenarios',
        links: [{ id: 'sharpMoveStats', route: AppRoute.BACKTEST_SHARP_MOVE_STATS }]
    },
    {
        id: 'formulaBounds',
        links: [{ id: 'boundedParameterStats', route: AppRoute.BACKTEST_BOUNDED_PARAMETER_STATS }]
    },
    {
        id: 'analysisBridge',
        links: [{ id: 'analysisHome', route: AppRoute.ANALYSIS_HOME }]
    }
] as const

export const STATISTICS_HOME_OVERVIEW_BLOCKS = [
    {
        id: 'readingOrder',
        stepIds: ['btcFirst', 'microThen', 'riskThen', 'strongDayThen', 'impulseNext', 'boundsThen'],
        links: [
            { id: 'btcWeakness', route: AppRoute.BACKTEST_BTC_WEAKNESS_STATS },
            { id: 'microOverlay', route: AppRoute.BACKTEST_MICRO_OVERLAY_STATS },
            { id: 'slOverlay', route: AppRoute.BACKTEST_SL_OVERLAY_STATS },
            { id: 'slStrongDay', route: AppRoute.BACKTEST_SL_STRONG_DAY_STATS },
            { id: 'sharpMoveStats', route: AppRoute.BACKTEST_SHARP_MOVE_STATS },
            { id: 'boundedParameterStats', route: AppRoute.BACKTEST_BOUNDED_PARAMETER_STATS }
        ]
    },
    {
        id: 'coverage',
        bulletIds: ['sharedContracts', 'fullGrids', 'factualLayer'],
        links: [
            { id: 'btcWeakness', route: AppRoute.BACKTEST_BTC_WEAKNESS_STATS },
            { id: 'microOverlay', route: AppRoute.BACKTEST_MICRO_OVERLAY_STATS },
            { id: 'slOverlay', route: AppRoute.BACKTEST_SL_OVERLAY_STATS },
            { id: 'analysisHome', route: AppRoute.ANALYSIS_HOME }
        ]
    },
    {
        id: 'boundaries',
        bulletIds: ['statisticsVsAnalysis', 'statisticsVsDiagnostics', 'statisticsVsGuide'],
        links: [
            { id: 'analysisHome', route: AppRoute.ANALYSIS_HOME },
            { id: 'diagnosticsHome', route: AppRoute.DIAGNOSTICS_HOME },
            { id: 'guideHome', route: AppRoute.GUIDE }
        ]
    }
] as const
