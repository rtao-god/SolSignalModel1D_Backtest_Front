import type { QueryClient } from '@tanstack/react-query'
import type { AppDispatch } from '@/app/providers/StoreProvider/config/configureStore'
import { prefetchRouteChunk } from '../routeConfig'
import { AppRoute } from '../types'

interface WarmupRouteNavigationOptions {
    diagnosticsArgs?: unknown
}

export function warmupRouteNavigation(
    routeId: AppRoute,
    _queryClient: QueryClient,
    _dispatch?: AppDispatch,
    _options?: WarmupRouteNavigationOptions
): void {
    // Навигационный warmup прогревает только код страницы.
    // Данные published-read экранов читаются строго после реального открытия маршрута.
    prefetchRouteChunk(routeId)
}
