import { AppRoute } from '@/app/providers/router/config/types'

export interface GuideHomeCardConfig {
    id: string
    route: AppRoute
}

// Карточки главной страницы guide остаются owner-описанием раздела и переиспользуются в /about.
export const GUIDE_HOME_CARDS: readonly GuideHomeCardConfig[] = [
    {
        id: 'models',
        route: AppRoute.GUIDE_MODELS
    },
    {
        id: 'branches',
        route: AppRoute.GUIDE_BRANCHES
    },
    {
        id: 'splits',
        route: AppRoute.GUIDE_SPLITS
    },
    {
        id: 'time',
        route: AppRoute.GUIDE_TIME
    },
    {
        id: 'features',
        route: AppRoute.GUIDE_FEATURES
    },
    {
        id: 'truthfulness',
        route: AppRoute.GUIDE_TRUTHFULNESS
    },
    {
        id: 'tests',
        route: AppRoute.GUIDE_TESTS
    }
] as const
