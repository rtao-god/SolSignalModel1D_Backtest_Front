// app/providers/router/config/routeConsts.ts
import { AppRoute, RouteSection } from './types'

// Карта id → путь
export const ROUTE_PATH: Record<AppRoute, string> = {
    [AppRoute.MAIN]: '/',

    [AppRoute.CURRENT_PREDICTION]: '/current-prediction',

    [AppRoute.BACKTEST_BASELINE]: '/backtest/baseline',
    [AppRoute.BACKTEST_SUMMARY]: '/backtest/summary',
    [AppRoute.BACKTEST_FULL]: '/backtest/full',

    [AppRoute.PFI_PER_MODEL]: '/features/pfi-per-model',

    [AppRoute.MODELS_STATS]: '/models/stats',
    [AppRoute.FEATURES_STATS]: '/features/stats',

    [AppRoute.ABOUT]: '/about',
    [AppRoute.REGISTRATION]: '/registration',
    [AppRoute.LOGIN]: '/login',
    [AppRoute.PROFILE]: '/profile',
    [AppRoute.NOT_FOUND]: '*'
}

// Порядок секций в сайдбаре
export const ROUTE_SECTION_ORDER: RouteSection[] = ['models', 'backtest', 'features', 'system']
