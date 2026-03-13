import { AppRoute } from '@/app/providers/router/config/types'

export interface AboutPageProps {
    className?: string
}

export type AboutSectionGroup =
    | 'main'
    | 'predictions'
    | 'models'
    | 'backtest'
    | 'analysis'
    | 'diagnostics'
    | 'features'
    | 'guide'
    | 'developer'
    | 'system'

export type AboutNavType = 'navbar' | 'sidebar'

export interface AboutBlockLink {
    id: string
    routeId: AppRoute
    anchor?: string
    titleTabId?: string
    titleDefaultLabel?: string
}

export interface AboutRouteCatalogEntry {
    routeId: AppRoute
    group: AboutSectionGroup
    blocks: readonly AboutBlockLink[]
}

export interface AboutNavEntry extends AboutRouteCatalogEntry {
    path: string
    label: string
    labelKey: string
    navType: AboutNavType
    sortOrder: number
}

interface AboutAtlasNodeBase {
    id: string
}

export interface AboutAtlasRouteNode extends AboutAtlasNodeBase {
    kind: 'route'
    routeId: AppRoute
    childNodes?: readonly AboutAtlasNode[]
}

export interface AboutAtlasCustomNode extends AboutAtlasNodeBase {
    kind: 'custom'
    group: AboutSectionGroup
    titleKey: string
    descriptionKey: string
    defaultTitle?: string
    linkRouteId?: AppRoute
    childNodes: readonly AboutAtlasNode[]
}

export type AboutAtlasNode = AboutAtlasRouteNode | AboutAtlasCustomNode
