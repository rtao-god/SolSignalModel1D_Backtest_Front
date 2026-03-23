import type { Path } from 'react-router-dom'

/**
 * Составной график и in-page pager должны знать, когда текущая страница уже отдала управление
 * новому маршруту. Этот сигнал отделяет переход на другой документ от локальной hash-навигации.
 */
export interface InternalRouteTransitionIntent {
    pathname: string
    search: string
    hash: string
    sameDocument: boolean
}

export const INTERNAL_ROUTE_TRANSITION_EVENT = 'app:internal-route-transition'

export function buildInternalRouteTransitionIntent(
    currentLocation: Pick<Path, 'pathname' | 'search' | 'hash'>,
    targetLocation: Pick<Path, 'pathname' | 'search' | 'hash'>
): InternalRouteTransitionIntent {
    return {
        pathname: targetLocation.pathname,
        search: targetLocation.search,
        hash: targetLocation.hash,
        sameDocument:
            currentLocation.pathname === targetLocation.pathname && currentLocation.search === targetLocation.search
    }
}

export function dispatchInternalRouteTransition(intent: InternalRouteTransitionIntent): void {
    if (typeof window === 'undefined') {
        return
    }

    window.dispatchEvent(
        new CustomEvent<InternalRouteTransitionIntent>(INTERNAL_ROUTE_TRANSITION_EVENT, {
            detail: intent
        })
    )
}
