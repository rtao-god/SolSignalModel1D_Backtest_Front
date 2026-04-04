import { AppRoute } from '@/app/providers/router/config/types'

export interface StatisticsHomeCardConfig {
    id: string
    route: AppRoute
}

export const STATISTICS_HOME_CARDS: readonly StatisticsHomeCardConfig[] = [
    {
        id: 'btcWeakness',
        route: AppRoute.BACKTEST_BTC_WEAKNESS_STATS
    },
    {
        id: 'microOverlay',
        route: AppRoute.BACKTEST_MICRO_OVERLAY_STATS
    },
    {
        id: 'slOverlay',
        route: AppRoute.BACKTEST_SL_OVERLAY_STATS
    },
    {
        id: 'slStrongDay',
        route: AppRoute.BACKTEST_SL_STRONG_DAY_STATS
    },
    {
        id: 'sharpMoveStats',
        route: AppRoute.BACKTEST_SHARP_MOVE_STATS
    },
    {
        id: 'boundedParameterStats',
        route: AppRoute.BACKTEST_BOUNDED_PARAMETER_STATS
    }
] as const
