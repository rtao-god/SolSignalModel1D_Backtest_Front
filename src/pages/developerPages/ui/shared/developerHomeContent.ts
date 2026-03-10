import { AppRoute } from '@/app/providers/router/config/types'
import type { DeveloperHomeCardConfig } from './types'

export const DEVELOPER_HOME_CARDS: readonly DeveloperHomeCardConfig[] = [
    {
        id: 'backendStructure',
        route: AppRoute.DEVELOPER_BACKEND_STRUCTURE
    },
    {
        id: 'runtimeFlow',
        route: AppRoute.DEVELOPER_RUNTIME_FLOW
    },
    {
        id: 'reportsApi',
        route: AppRoute.DEVELOPER_REPORTS_API
    },
    {
        id: 'testsGuards',
        route: AppRoute.DEVELOPER_TESTS_GUARDS
    }
]
