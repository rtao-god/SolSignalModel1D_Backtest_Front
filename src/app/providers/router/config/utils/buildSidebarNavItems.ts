import { AppRouteConfig, SidebarNavItem } from '../types'

export const buildSidebarNavItems = (routes: AppRouteConfig[]): SidebarNavItem[] =>
    routes
        .filter(route => route.nav?.sidebar)
        .map(route => ({
            id: route.id,
            path: route.path,
            label: route.nav!.label,
            section: route.nav?.section,
            order: route.nav?.order ?? 0
        }))
        .sort((a, b) => a.order - b.order)
