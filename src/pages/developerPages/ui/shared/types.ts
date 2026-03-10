import type { AppRoute } from '@/app/providers/router/config/types'
import type { DeveloperTabConfig } from '@/shared/utils/developerTabs'

export interface DeveloperSentenceConfig {
    id: string
    whyId?: string
}

export interface DeveloperTreeNodeConfig {
    id: string
    label: string
    sentences?: readonly DeveloperSentenceConfig[]
    children?: readonly DeveloperTreeNodeConfig[]
}

export interface DeveloperSectionGroupConfig {
    id: string
    sentences: readonly DeveloperSentenceConfig[]
}

export interface DeveloperSectionTableConfig {
    id: string
    columnIds: readonly string[]
    rowIds: readonly string[]
    detailRowIds?: readonly string[]
    defaultDetailId?: string
}

export interface DeveloperSectionConfig {
    id: string
    anchor: string
    sentences: readonly DeveloperSentenceConfig[]
    groups?: readonly DeveloperSectionGroupConfig[]
    tables?: readonly DeveloperSectionTableConfig[]
    tree?: readonly DeveloperTreeNodeConfig[]
}

export interface DeveloperPageContentConfig {
    routeId: AppRoute
    pageKey: string
    tabs: readonly DeveloperTabConfig[]
    sections: readonly DeveloperSectionConfig[]
}

export interface DeveloperHomeCardConfig {
    id: string
    route: AppRoute
}

export interface DeveloperLocalizedTermItem {
    id: string
    term: string
    description: string
}
