import { AppRoute } from '@/app/providers/router/config/types'

export interface AnalysisHomeCardConfig {
    id: string
    route: AppRoute
}

// Карта analysis-страницы используется и в самой витрине раздела, и в общем atlas `/about`.
export const ANALYSIS_HOME_CARDS: readonly AnalysisHomeCardConfig[] = [
    {
        id: 'ratings',
        route: AppRoute.BACKTEST_DIAGNOSTICS_RATINGS
    },
    {
        id: 'policyBranchMega',
        route: AppRoute.BACKTEST_POLICY_BRANCH_MEGA
    },
    {
        id: 'policySetups',
        route: AppRoute.BACKTEST_POLICY_SETUPS
    },
    {
        id: 'dayStats',
        route: AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS
    },
    {
        id: 'confidenceRisk',
        route: AppRoute.BACKTEST_CONFIDENCE_RISK
    },
    {
        id: 'oosPresetTails',
        route: AppRoute.CURRENT_PREDICTION_OOS_PRESETS
    },
    {
        id: 'realForecastJournal',
        route: AppRoute.ANALYSIS_REAL_FORECAST_JOURNAL
    },
    {
        id: 'executionPipeline',
        route: AppRoute.BACKTEST_EXECUTION_PIPELINE
    }
] as const
