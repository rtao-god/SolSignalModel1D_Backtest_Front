import { AppRoute } from '@/app/providers/router/config/types'
import { NAVBAR_ITEMS, SIDEBAR_NAV_ITEMS } from '@/app/providers/router/config/routeConfig'
import type { AboutAtlasNode } from './types'
import {
    ABOUT_ATLAS_ROOT_NODES,
    ABOUT_EXCLUDED_ROUTE_IDS,
    ABOUT_NAVIGATION_ENTRIES,
    ABOUT_VISIBLE_ROUTE_IDS
} from './aboutNavigationCatalog'

function collectAtlasRouteIds(nodes: readonly AboutAtlasNode[]): AppRoute[] {
    return nodes.flatMap(node => {
        if (node.kind === 'route') {
            const ownRouteIds = [node.routeId]
            const childRouteIds = node.childNodes ? collectAtlasRouteIds(node.childNodes) : []

            return [...ownRouteIds, ...childRouteIds]
        }

        const linkedRouteIds = node.linkRouteId ? [node.linkRouteId] : []
        return [...linkedRouteIds, ...collectAtlasRouteIds(node.childNodes)]
    })
}

describe('aboutNavigationCatalog', () => {
    test('covers every visible navbar/sidebar route exactly once in route catalog', () => {
        const expectedRouteIds = [
            ...NAVBAR_ITEMS.map(item => item.id),
            ...SIDEBAR_NAV_ITEMS.map(item => item.id)
        ].sort()
        const actualRouteIds = ABOUT_NAVIGATION_ENTRIES.map(entry => entry.routeId).sort()
        const visibleRouteIds = [...ABOUT_VISIBLE_ROUTE_IDS].sort()

        expect(new Set(actualRouteIds).size).toBe(actualRouteIds.length)
        expect(actualRouteIds).toEqual(expectedRouteIds)
        expect(visibleRouteIds).toEqual(expectedRouteIds)
    })

    test('atlas tree exposes every visible route and skips excluded routes', () => {
        const treeRouteIds = Array.from(new Set(collectAtlasRouteIds(ABOUT_ATLAS_ROOT_NODES))).sort()
        const visibleRouteIds = [...ABOUT_VISIBLE_ROUTE_IDS].sort()

        expect(treeRouteIds).toEqual(visibleRouteIds)

        ABOUT_EXCLUDED_ROUTE_IDS.forEach(routeId => {
            expect(treeRouteIds).not.toContain(routeId)
        })
    })

    test('does not include empty route blocks', () => {
        ABOUT_NAVIGATION_ENTRIES.forEach(entry => {
            expect(entry.blocks.length).toBeGreaterThan(0)
        })
    })
})
