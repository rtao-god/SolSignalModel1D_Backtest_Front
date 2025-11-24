import { ComponentType, lazy } from 'react'
import { AppRouteConfig, SidebarNavItem } from './types'

// Обёртка над lazy
export const lazyPage = <T extends ComponentType<any>>(importer: () => Promise<{ default: T }>) => lazy(importer)

// Строим элементы навигации в сайдбаре из routeConfig
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
