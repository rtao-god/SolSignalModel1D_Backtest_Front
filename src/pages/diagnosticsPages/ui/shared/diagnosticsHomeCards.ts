import { AppRoute } from '@/app/providers/router/config/types'

export interface DiagnosticsHomeCardConfig {
    id: string
    route: AppRoute
}

// Карточки diagnostics-хаба держатся рядом с owner-страницей, чтобы /about не дублировал список вручную.
export const DIAGNOSTICS_HOME_CARDS: readonly DiagnosticsHomeCardConfig[] = [
    {
        id: 'risk',
        route: AppRoute.BACKTEST_DIAGNOSTICS
    },
    {
        id: 'guardrail',
        route: AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL
    },
    {
        id: 'decisions',
        route: AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS
    },
    {
        id: 'hotspots',
        route: AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS
    },
    {
        id: 'other',
        route: AppRoute.BACKTEST_DIAGNOSTICS_OTHER
    }
] as const
