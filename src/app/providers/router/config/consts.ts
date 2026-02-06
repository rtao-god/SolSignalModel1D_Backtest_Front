import { AppRoute, RouteSection } from './types'

/*
    consts — карта маршрутов и порядок секций.

    Зачем:
        - Один источник правды для path'ов.
        - Контролируем порядок блоков в сайдбаре.
*/

// Карта id → путь
export const ROUTE_PATH: Record<AppRoute, string> = {
    [AppRoute.MAIN]: '/',

    [AppRoute.CURRENT_PREDICTION]: '/current-prediction',
    [AppRoute.CURRENT_PREDICTION_HISTORY]: '/current-prediction/history',

    [AppRoute.DIAGNOSTICS_HOME]: '/diagnostics',
    [AppRoute.ANALYSIS_HOME]: '/analysis',

    [AppRoute.BACKTEST_BASELINE]: '/backtest/baseline',
    [AppRoute.BACKTEST_SUMMARY]: '/backtest/summary',
    [AppRoute.BACKTEST_FULL]: '/backtest/full',
    [AppRoute.BACKTEST_DIAGNOSTICS]: '/diagnostics/backtest',
    [AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]: '/diagnostics/guardrail',
    [AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]: '/diagnostics/decisions',
    [AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]: '/diagnostics/hotspots',
    [AppRoute.BACKTEST_DIAGNOSTICS_OTHER]: '/diagnostics/other',
    [AppRoute.BACKTEST_DIAGNOSTICS_RATINGS]: '/analysis/ratings',
    [AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS]: '/analysis/day-stats',
    [AppRoute.BACKTEST_POLICY_BRANCH_MEGA]: '/analysis/policy-branch-mega',

    [AppRoute.PFI_PER_MODEL]: '/features/pfi-per-model',

    [AppRoute.MODELS_STATS]: '/models/stats',
    [AppRoute.AGGREGATION_STATS]: '/models/aggregation',
    [AppRoute.FEATURES_STATS]: '/features/stats',

    // Документация
    [AppRoute.DOCS]: '/docs',
    [AppRoute.DOCS_MODELS]: '/docs/models',
    [AppRoute.DOCS_TESTS]: '/docs/tests',

    [AppRoute.ABOUT]: '/about',
    [AppRoute.CONTACT]: '/contact',
    [AppRoute.REGISTRATION]: '/registration',
    [AppRoute.LOGIN]: '/login',
    [AppRoute.PROFILE]: '/profile',
    [AppRoute.NOT_FOUND]: '*'
}

// Порядок секций в сайдбаре
export const ROUTE_SECTION_ORDER: RouteSection[] = [
    'predictions',
    'models',
    'backtest',
    'analysis',
    'diagnostics',
    'features',
    'docs',
    'system'
]
