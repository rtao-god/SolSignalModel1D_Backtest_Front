import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { buildRouteNavLabelI18nKey } from '@/app/providers/router/config/i18nKeys'
import { NAVBAR_ITEMS, SIDEBAR_NAV_ITEMS } from '@/app/providers/router/config/routeConfig'
import { AppRoute } from '@/app/providers/router/config/types'
import { ANALYSIS_HOME_CARDS } from '@/pages/analysisPages/ui/shared/analysisHomeCards'
import { DEVELOPER_HOME_CARDS } from '@/pages/developerPages/ui/shared/developerHomeContent'
import { DIAGNOSTICS_HOME_CARDS } from '@/pages/diagnosticsPages/ui/shared/diagnosticsHomeCards'
import { GUIDE_HOME_CARDS } from '@/pages/guidePages/ui/shared/guideHomeCards'
import { AGGREGATION_TABS } from '@/shared/utils/aggregationTabs'
import { BACKTEST_FULL_TABS } from '@/shared/utils/backtestTabs'
import {
    DEVELOPER_BACKEND_STRUCTURE_TABS,
    DEVELOPER_REPORTS_API_TABS,
    DEVELOPER_RUNTIME_FLOW_TABS,
    DEVELOPER_TESTS_GUARDS_TABS
} from '@/shared/utils/developerTabs'
import {
    GUIDE_BRANCHES_TABS,
    GUIDE_FEATURES_TABS,
    GUIDE_MODELS_TABS,
    GUIDE_SPLITS_TABS,
    GUIDE_TESTS_TABS,
    GUIDE_TIME_TABS,
    GUIDE_TRUTHFULNESS_TABS
} from '@/shared/utils/guideTabs'
import type {
    AboutAtlasCustomNode,
    AboutAtlasNode,
    AboutAtlasRouteNode,
    AboutBlockLink,
    AboutNavEntry,
    AboutNavType,
    AboutRouteCatalogEntry,
    AboutSectionGroup
} from './types'

type VisibleNavMeta = {
    routeId: AppRoute
    path: string
    label: string
    labelKey: string
    navType: AboutNavType
    sortOrder: number
}

interface RouteTabLike {
    id: string
    label: string
    anchor: string
}

const PREDICTIONS_ROUTE_IDS = [AppRoute.CURRENT_PREDICTION, AppRoute.CURRENT_PREDICTION_HISTORY] as const
const MODELS_ROUTE_IDS = [AppRoute.MODELS_STATS, AppRoute.AGGREGATION_STATS] as const
const BACKTEST_ROUTE_IDS = [AppRoute.BACKTEST_FULL] as const
const ANALYSIS_ROUTE_IDS = ANALYSIS_HOME_CARDS.map(card => card.route)
const DIAGNOSTICS_ROUTE_IDS = DIAGNOSTICS_HOME_CARDS.map(card => card.route)
const FEATURES_ROUTE_IDS = [AppRoute.PFI_PER_MODEL] as const
const GUIDE_ROUTE_IDS = GUIDE_HOME_CARDS.map(card => card.route)
const DEVELOPER_ROUTE_IDS = DEVELOPER_HOME_CARDS.map(card => card.route)
const SYSTEM_ROUTE_IDS = [AppRoute.PROFILE, AppRoute.ABOUT, AppRoute.CONTACT] as const

export const ABOUT_SECTION_GROUP_ORDER: readonly AboutSectionGroup[] = [
    'main',
    'predictions',
    'models',
    'backtest',
    'analysis',
    'diagnostics',
    'features',
    'guide',
    'developer',
    'system'
] as const

export const ABOUT_EXCLUDED_ROUTE_IDS: readonly AppRoute[] = [
    AppRoute.LOGIN,
    AppRoute.REGISTRATION,
    AppRoute.NOT_FOUND,
    AppRoute.DOCS,
    AppRoute.DOCS_MODELS,
    AppRoute.DOCS_TESTS,
    AppRoute.DOCS_TRUTHFULNESS,
    AppRoute.EXPLAIN,
    AppRoute.EXPLAIN_MODELS,
    AppRoute.EXPLAIN_BRANCHES,
    AppRoute.EXPLAIN_SPLITS,
    AppRoute.EXPLAIN_PROJECT,
    AppRoute.EXPLAIN_TIME,
    AppRoute.EXPLAIN_FEATURES
] as const

function toNodeToken(routeId: AppRoute): string {
    return routeId.toLowerCase()
}

function createCuratedBlocks(routeId: AppRoute, blockIds: readonly string[]): readonly AboutBlockLink[] {
    return blockIds.map(id => ({
        id,
        routeId
    }))
}

function createCuratedBlockWithAnchor(routeId: AppRoute, id: string, anchor: string): AboutBlockLink {
    return {
        id,
        routeId,
        anchor
    }
}

function createTabBlocks(routeId: AppRoute, tabs: readonly RouteTabLike[]): readonly AboutBlockLink[] {
    return tabs.map(tab => ({
        id: tab.id,
        routeId,
        anchor: tab.anchor,
        titleTabId: tab.id,
        titleDefaultLabel: tab.label
    }))
}

function createRouteNode(
    routeId: AppRoute,
    options?: {
        idPrefix?: string
        childNodes?: readonly AboutAtlasNode[]
    }
): AboutAtlasRouteNode {
    return {
        kind: 'route',
        id: `${options?.idPrefix ?? 'route'}-${toNodeToken(routeId)}`,
        routeId,
        childNodes: options?.childNodes
    }
}

function createRouteNodes(routeIds: readonly AppRoute[], idPrefix: string): readonly AboutAtlasRouteNode[] {
    return routeIds.map(routeId =>
        createRouteNode(routeId, {
            idPrefix
        })
    )
}

function createGroupNode(options: {
    id: string
    group: AboutSectionGroup
    childRouteIds: readonly AppRoute[]
    linkRouteId?: AppRoute
}): AboutAtlasCustomNode {
    return {
        kind: 'custom',
        id: options.id,
        group: options.group,
        titleKey: `groups.${options.group}.title`,
        descriptionKey: `groups.${options.group}.subtitle`,
        linkRouteId: options.linkRouteId,
        childNodes: createRouteNodes(options.childRouteIds, `${options.id}-page`)
    }
}

function collectVisibleNavMeta(): Map<AppRoute, VisibleNavMeta> {
    const result = new Map<AppRoute, VisibleNavMeta>()

    NAVBAR_ITEMS.forEach(item => {
        if (result.has(item.id)) {
            throw new Error(`[about] Duplicate visible route in navbar items. routeId=${item.id}.`)
        }

        result.set(item.id, {
            routeId: item.id,
            path: item.path,
            label: item.label,
            labelKey: buildRouteNavLabelI18nKey(item.id),
            navType: 'navbar',
            sortOrder: item.order
        })
    })

    SIDEBAR_NAV_ITEMS.forEach(item => {
        if (result.has(item.id)) {
            throw new Error(`[about] Duplicate visible route across navbar/sidebar items. routeId=${item.id}.`)
        }

        result.set(item.id, {
            routeId: item.id,
            path: item.path,
            label: item.label,
            labelKey: buildRouteNavLabelI18nKey(item.id),
            navType: 'sidebar',
            sortOrder: item.order
        })
    })

    result.forEach(meta => {
        if (meta.path !== ROUTE_PATH[meta.routeId]) {
            throw new Error(`[about] Visible route path mismatch. routeId=${meta.routeId}.`)
        }
    })

    return result
}

const ABOUT_ROUTE_CATALOG_CONFIG: readonly AboutRouteCatalogEntry[] = [
    {
        routeId: AppRoute.MAIN,
        group: 'main',
        blocks: [
            { id: 'hero', routeId: AppRoute.MAIN },
            { id: 'audience', routeId: AppRoute.MAIN },
            { id: 'workflow', routeId: AppRoute.MAIN },
            createCuratedBlockWithAnchor(AppRoute.MAIN, 'proof', 'main-proof'),
            { id: 'tour', routeId: AppRoute.MAIN },
            { id: 'demoConfiguration', routeId: AppRoute.MAIN }
        ]
    },
    {
        routeId: AppRoute.CURRENT_PREDICTION,
        group: 'predictions',
        blocks: createCuratedBlocks(AppRoute.CURRENT_PREDICTION, [
            'scopeControls',
            'reportStatus',
            'metaSummary',
            'reportDocument'
        ])
    },
    {
        routeId: AppRoute.CURRENT_PREDICTION_HISTORY,
        group: 'predictions',
        blocks: createCuratedBlocks(AppRoute.CURRENT_PREDICTION_HISTORY, [
            'filters',
            'archivePager',
            'reportCard',
            'policyTrades'
        ])
    },
    {
        routeId: AppRoute.MODELS_STATS,
        group: 'models',
        blocks: createCuratedBlocks(AppRoute.MODELS_STATS, ['reportStatus', 'sectionPager', 'modelTables'])
    },
    {
        routeId: AppRoute.AGGREGATION_STATS,
        group: 'models',
        blocks: createTabBlocks(AppRoute.AGGREGATION_STATS, AGGREGATION_TABS)
    },
    {
        routeId: AppRoute.BACKTEST_FULL,
        group: 'backtest',
        blocks: createTabBlocks(AppRoute.BACKTEST_FULL, BACKTEST_FULL_TABS)
    },
    {
        routeId: AppRoute.ANALYSIS_HOME,
        group: 'analysis',
        blocks: createCuratedBlocks(AppRoute.ANALYSIS_HOME, ['overview', 'sectionCards'])
    },
    {
        routeId: AppRoute.BACKTEST_DIAGNOSTICS_RATINGS,
        group: 'analysis',
        blocks: createCuratedBlocks(AppRoute.BACKTEST_DIAGNOSTICS_RATINGS, [
            'reportStatus',
            'filters',
            'terms',
            'tables'
        ])
    },
    {
        routeId: AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS,
        group: 'analysis',
        blocks: createCuratedBlocks(AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS, [
            'reportStatus',
            'filters',
            'terms',
            'tables'
        ])
    },
    {
        routeId: AppRoute.BACKTEST_POLICY_BRANCH_MEGA,
        group: 'analysis',
        blocks: [
            { id: 'reportStatus', routeId: AppRoute.BACKTEST_POLICY_BRANCH_MEGA },
            createCuratedBlockWithAnchor(
                AppRoute.BACKTEST_POLICY_BRANCH_MEGA,
                'overview',
                'policy-branch-mega-overview'
            ),
            { id: 'chartExplorer', routeId: AppRoute.BACKTEST_POLICY_BRANCH_MEGA },
            { id: 'terms', routeId: AppRoute.BACKTEST_POLICY_BRANCH_MEGA },
            { id: 'partTables', routeId: AppRoute.BACKTEST_POLICY_BRANCH_MEGA },
            { id: 'diagnosticsBridge', routeId: AppRoute.BACKTEST_POLICY_BRANCH_MEGA }
        ]
    },
    {
        routeId: AppRoute.BACKTEST_CONFIDENCE_RISK,
        group: 'analysis',
        blocks: createCuratedBlocks(AppRoute.BACKTEST_CONFIDENCE_RISK, [
            'filters',
            'terms',
            'configBlock',
            'statisticsTables'
        ])
    },
    {
        routeId: AppRoute.ANALYSIS_REAL_FORECAST_JOURNAL,
        group: 'analysis',
        blocks: createCuratedBlocks(AppRoute.ANALYSIS_REAL_FORECAST_JOURNAL, [
            'daySelector',
            'causalSummary',
            'liveTracking',
            'policyTables',
            'comparison'
        ])
    },
    {
        routeId: AppRoute.BACKTEST_EXECUTION_PIPELINE,
        group: 'analysis',
        blocks: createCuratedBlocks(AppRoute.BACKTEST_EXECUTION_PIPELINE, [
            'reportStatus',
            'configSections',
            'stageTables'
        ])
    },
    {
        routeId: AppRoute.DIAGNOSTICS_HOME,
        group: 'diagnostics',
        blocks: createCuratedBlocks(AppRoute.DIAGNOSTICS_HOME, ['overview', 'sectionCards'])
    },
    {
        routeId: AppRoute.BACKTEST_DIAGNOSTICS,
        group: 'diagnostics',
        blocks: createCuratedBlocks(AppRoute.BACKTEST_DIAGNOSTICS, ['reportStatus', 'filters', 'terms', 'tables'])
    },
    {
        routeId: AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL,
        group: 'diagnostics',
        blocks: createCuratedBlocks(AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL, [
            'reportStatus',
            'filters',
            'terms',
            'tables'
        ])
    },
    {
        routeId: AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS,
        group: 'diagnostics',
        blocks: createCuratedBlocks(AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS, [
            'reportStatus',
            'filters',
            'terms',
            'tables'
        ])
    },
    {
        routeId: AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS,
        group: 'diagnostics',
        blocks: createCuratedBlocks(AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS, [
            'reportStatus',
            'filters',
            'terms',
            'tables'
        ])
    },
    {
        routeId: AppRoute.BACKTEST_DIAGNOSTICS_OTHER,
        group: 'diagnostics',
        blocks: createCuratedBlocks(AppRoute.BACKTEST_DIAGNOSTICS_OTHER, ['reportStatus', 'filters', 'terms', 'tables'])
    },
    {
        routeId: AppRoute.PFI_PER_MODEL,
        group: 'features',
        blocks: createCuratedBlocks(AppRoute.PFI_PER_MODEL, ['reportStatus', 'terms', 'modelTables'])
    },
    {
        routeId: AppRoute.GUIDE,
        group: 'guide',
        blocks: createCuratedBlocks(AppRoute.GUIDE, ['hero', 'sectionCards'])
    },
    {
        routeId: AppRoute.GUIDE_MODELS,
        group: 'guide',
        blocks: createTabBlocks(AppRoute.GUIDE_MODELS, GUIDE_MODELS_TABS)
    },
    {
        routeId: AppRoute.GUIDE_BRANCHES,
        group: 'guide',
        blocks: createTabBlocks(AppRoute.GUIDE_BRANCHES, GUIDE_BRANCHES_TABS)
    },
    {
        routeId: AppRoute.GUIDE_SPLITS,
        group: 'guide',
        blocks: createTabBlocks(AppRoute.GUIDE_SPLITS, GUIDE_SPLITS_TABS)
    },
    {
        routeId: AppRoute.GUIDE_TIME,
        group: 'guide',
        blocks: createTabBlocks(AppRoute.GUIDE_TIME, GUIDE_TIME_TABS)
    },
    {
        routeId: AppRoute.GUIDE_FEATURES,
        group: 'guide',
        blocks: createTabBlocks(AppRoute.GUIDE_FEATURES, GUIDE_FEATURES_TABS)
    },
    {
        routeId: AppRoute.GUIDE_TRUTHFULNESS,
        group: 'guide',
        blocks: createTabBlocks(AppRoute.GUIDE_TRUTHFULNESS, GUIDE_TRUTHFULNESS_TABS)
    },
    {
        routeId: AppRoute.GUIDE_TESTS,
        group: 'guide',
        blocks: createTabBlocks(AppRoute.GUIDE_TESTS, GUIDE_TESTS_TABS)
    },
    {
        routeId: AppRoute.DEVELOPER,
        group: 'developer',
        blocks: createCuratedBlocks(AppRoute.DEVELOPER, ['hero', 'sectionCards'])
    },
    {
        routeId: AppRoute.DEVELOPER_BACKEND_STRUCTURE,
        group: 'developer',
        blocks: createTabBlocks(AppRoute.DEVELOPER_BACKEND_STRUCTURE, DEVELOPER_BACKEND_STRUCTURE_TABS)
    },
    {
        routeId: AppRoute.DEVELOPER_RUNTIME_FLOW,
        group: 'developer',
        blocks: createTabBlocks(AppRoute.DEVELOPER_RUNTIME_FLOW, DEVELOPER_RUNTIME_FLOW_TABS)
    },
    {
        routeId: AppRoute.DEVELOPER_REPORTS_API,
        group: 'developer',
        blocks: createTabBlocks(AppRoute.DEVELOPER_REPORTS_API, DEVELOPER_REPORTS_API_TABS)
    },
    {
        routeId: AppRoute.DEVELOPER_TESTS_GUARDS,
        group: 'developer',
        blocks: createTabBlocks(AppRoute.DEVELOPER_TESTS_GUARDS, DEVELOPER_TESTS_GUARDS_TABS)
    },
    {
        routeId: AppRoute.PROFILE,
        group: 'system',
        blocks: createCuratedBlocks(AppRoute.PROFILE, ['placeholderState', 'backtestLink'])
    },
    {
        routeId: AppRoute.ABOUT,
        group: 'system',
        blocks: createCuratedBlocks(AppRoute.ABOUT, ['hero', 'navigationMatrix', 'routeDetails'])
    },
    {
        routeId: AppRoute.CONTACT,
        group: 'system',
        blocks: createCuratedBlocks(AppRoute.CONTACT, ['pageHeader', 'profileCard', 'contactMethods', 'footer'])
    }
] as const

const VISIBLE_NAV_META_BY_ROUTE = collectVisibleNavMeta()
const ABOUT_ROUTE_ENTRY_BY_ROUTE = new Map<AppRoute, AboutNavEntry>(
    ABOUT_ROUTE_CATALOG_CONFIG.map(entry => {
        const meta = VISIBLE_NAV_META_BY_ROUTE.get(entry.routeId)
        if (!meta) {
            throw new Error(`[about] Visible navigation meta is missing. routeId=${entry.routeId}.`)
        }

        return [
            entry.routeId,
            {
                ...entry,
                path: meta.path,
                label: meta.label,
                labelKey: meta.labelKey,
                navType: meta.navType,
                sortOrder: meta.sortOrder
            }
        ] as const
    })
)

function validateRouteCatalog(): void {
    VISIBLE_NAV_META_BY_ROUTE.forEach((_meta, routeId) => {
        if (!ABOUT_ROUTE_ENTRY_BY_ROUTE.has(routeId)) {
            throw new Error(`[about] Missing catalog entry for visible route. routeId=${routeId}.`)
        }
    })

    ABOUT_ROUTE_ENTRY_BY_ROUTE.forEach((_entry, routeId) => {
        if (!VISIBLE_NAV_META_BY_ROUTE.has(routeId)) {
            throw new Error(`[about] Catalog entry points to hidden route. routeId=${routeId}.`)
        }
    })

    ABOUT_EXCLUDED_ROUTE_IDS.forEach(routeId => {
        if (ABOUT_ROUTE_ENTRY_BY_ROUTE.has(routeId)) {
            throw new Error(`[about] Excluded route must not be present in catalog. routeId=${routeId}.`)
        }
    })
}

function validateAtlasNode(node: AboutAtlasNode): void {
    if (node.kind === 'route') {
        if (!ABOUT_ROUTE_ENTRY_BY_ROUTE.has(node.routeId)) {
            throw new Error(`[about] Atlas route node points to unknown route. routeId=${node.routeId}.`)
        }

        node.childNodes?.forEach(validateAtlasNode)
        return
    }

    if (node.linkRouteId && !ABOUT_ROUTE_ENTRY_BY_ROUTE.has(node.linkRouteId)) {
        throw new Error(`[about] Atlas custom node points to unknown route. routeId=${node.linkRouteId}.`)
    }

    node.childNodes.forEach(validateAtlasNode)
}

validateRouteCatalog()

const MAIN_ATLAS_CHILD_NODES = [
    createGroupNode({
        id: 'main-predictions',
        group: 'predictions',
        childRouteIds: PREDICTIONS_ROUTE_IDS
    }),
    createGroupNode({
        id: 'main-models',
        group: 'models',
        childRouteIds: MODELS_ROUTE_IDS
    }),
    createGroupNode({
        id: 'main-backtest',
        group: 'backtest',
        childRouteIds: BACKTEST_ROUTE_IDS
    }),
    createGroupNode({
        id: 'main-analysis',
        group: 'analysis',
        childRouteIds: ANALYSIS_ROUTE_IDS,
        linkRouteId: AppRoute.ANALYSIS_HOME
    }),
    createGroupNode({
        id: 'main-diagnostics',
        group: 'diagnostics',
        childRouteIds: DIAGNOSTICS_ROUTE_IDS,
        linkRouteId: AppRoute.DIAGNOSTICS_HOME
    }),
    createGroupNode({
        id: 'main-features',
        group: 'features',
        childRouteIds: FEATURES_ROUTE_IDS
    }),
    createGroupNode({
        id: 'main-guide',
        group: 'guide',
        childRouteIds: GUIDE_ROUTE_IDS,
        linkRouteId: AppRoute.GUIDE
    }),
    createGroupNode({
        id: 'main-developer',
        group: 'developer',
        childRouteIds: DEVELOPER_ROUTE_IDS,
        linkRouteId: AppRoute.DEVELOPER
    }),
    createGroupNode({
        id: 'main-system',
        group: 'system',
        childRouteIds: SYSTEM_ROUTE_IDS
    })
] as const

const ABOUT_ATLAS_ROOT_CONFIG: readonly AboutAtlasNode[] = [
    createRouteNode(AppRoute.MAIN, {
        idPrefix: 'root',
        childNodes: MAIN_ATLAS_CHILD_NODES
    }),
    createRouteNode(AppRoute.DIAGNOSTICS_HOME, {
        idPrefix: 'root',
        childNodes: createRouteNodes(DIAGNOSTICS_ROUTE_IDS, 'diagnostics-root-page')
    }),
    createRouteNode(AppRoute.ANALYSIS_HOME, {
        idPrefix: 'root',
        childNodes: createRouteNodes(ANALYSIS_ROUTE_IDS, 'analysis-root-page')
    }),
    createRouteNode(AppRoute.GUIDE, {
        idPrefix: 'root',
        childNodes: createRouteNodes(GUIDE_ROUTE_IDS, 'guide-root-page')
    }),
    createRouteNode(AppRoute.DEVELOPER, {
        idPrefix: 'root',
        childNodes: createRouteNodes(DEVELOPER_ROUTE_IDS, 'developer-root-page')
    }),
    createRouteNode(AppRoute.PROFILE, {
        idPrefix: 'root'
    }),
    createRouteNode(AppRoute.ABOUT, {
        idPrefix: 'root'
    }),
    createRouteNode(AppRoute.CONTACT, {
        idPrefix: 'root'
    })
] as const

ABOUT_ATLAS_ROOT_CONFIG.forEach(validateAtlasNode)

export const ABOUT_VISIBLE_ROUTE_IDS: readonly AppRoute[] = Object.freeze([...VISIBLE_NAV_META_BY_ROUTE.keys()])

// Каталог /about делится на два слоя: route-entry хранит owner-описание конкретной страницы,
// а atlas-root задаёт иерархию, в которой страницы раскрываются через домены и дочерние маршруты.
export const ABOUT_NAVIGATION_ENTRIES: readonly AboutNavEntry[] = Object.freeze([
    ...ABOUT_ROUTE_ENTRY_BY_ROUTE.values()
])
export const ABOUT_ATLAS_ROOT_NODES: readonly AboutAtlasNode[] = Object.freeze([...ABOUT_ATLAS_ROOT_CONFIG])
