import { AppRoute, RouteSection } from './types'

function toRouteToken(routeId: AppRoute): string {
    return routeId.toLowerCase()
}

export function buildRouteNavLabelI18nKey(routeId: AppRoute): string {
    return `nav:route.${toRouteToken(routeId)}`
}

export function buildRouteSectionTitleI18nKey(section: RouteSection): string {
    return `nav:section.${section}`
}

export function buildRouteSectionCompactTitleI18nKey(section: RouteSection): string {
    return `nav:sectionCompact.${section}`
}

export function buildRouteSubNavAriaI18nKey(routeId: AppRoute): string {
    return `nav:subnav.${toRouteToken(routeId)}`
}

export function buildRouteSubTabLabelI18nKey(routeId: AppRoute, tabId: string): string {
    return `nav:tab.${toRouteToken(routeId)}.${tabId}`
}

export function buildRouteLoadingTitleI18nKey(routeId: AppRoute): string {
    return `common:loading.${toRouteToken(routeId)}`
}
