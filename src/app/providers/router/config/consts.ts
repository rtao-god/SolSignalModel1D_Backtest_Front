import { AppRoute, RouteSection } from './types'

// Карта id → путь
export const ROUTE_PATH: Record<AppRoute, string> = {
    [AppRoute.MAIN]: '/',

    [AppRoute.CURRENT_PREDICTION]: '/current-prediction',
    [AppRoute.CURRENT_PREDICTION_HISTORY]: '/current-prediction/history',

    [AppRoute.BACKTEST_BASELINE]: '/backtest/baseline',
    [AppRoute.BACKTEST_SUMMARY]: '/backtest/summary',
    [AppRoute.BACKTEST_FULL]: '/backtest/full',

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
export const ROUTE_SECTION_ORDER: RouteSection[] = ['predictions', 'models', 'backtest', 'features', 'docs', 'system']
