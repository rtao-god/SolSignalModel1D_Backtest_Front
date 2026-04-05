import classNames from '@/shared/lib/helpers/classNames'
import { Link } from '@/shared/ui'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import cls from './Sidebar.module.scss'
import { RouteSection, SIDEBAR_NAV_ITEMS } from '@/app/providers/router/config/routeConfig'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute, SidebarNavItem } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import { isRouteBranchMatch, isRouteExactMatch } from '@/app/providers/router/config/utils/matchRoutePath'
import {
    buildRouteNavLabelI18nKey,
    buildRouteSectionCompactTitleI18nKey,
    buildRouteSubTabLabelI18nKey,
    buildRouteSectionTitleI18nKey,
    buildRouteSubNavAriaI18nKey
} from '@/app/providers/router/config/i18nKeys'
import { BACKTEST_FULL_TABS } from '@/shared/utils/backtestTabs'
import { AGGREGATION_TABS } from '@/shared/utils/aggregationTabs'
import type { TableSectionDto } from '@/shared/types/report.types'
import type { PfiTabConfig } from '@/shared/utils/pfiTabs'
import { scrollToTop } from '@/shared/ui/SectionPager/lib/scrollToAnchor'
import { DOCS_MODELS_TABS, DOCS_TESTS_TABS, DOCS_TRUTHFULNESS_TABS } from '@/shared/utils/docsTabs'
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
import {
    EXPLAIN_BRANCHES_TABS,
    EXPLAIN_FEATURES_TABS,
    EXPLAIN_SPLITS_TABS,
    EXPLAIN_TIME_TABS
} from '@/shared/utils/explainTabs'
import {
    buildPolicyBranchMegaTabsFromAvailableParts,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaTotalBucketViewFromQuery,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaTotalBucketView
} from '@/shared/utils/policyBranchMegaTabs'
import {
    buildDiagnosticsTabsFromSections,
    getDiagnosticsGroupSections,
    splitBacktestDiagnosticsSections,
    toDiagnosticsSectionRefs,
    type DiagnosticsGroupId,
    type DiagnosticsTabConfig
} from '@/shared/utils/backtestDiagnosticsSections'
import {
    BACKTEST_DIAGNOSTICS_QUERY_SCOPES,
    useBacktestDiagnosticsReportNavQuery
} from '@/shared/api/tanstackQueries/backtestDiagnostics'
import {
    POLICY_BRANCH_MEGA_CANONICAL_PARTS,
} from '@/shared/api/tanstackQueries/policyBranchMega'
import {
    buildBacktestDiagnosticsQueryArgsFromSearchParams,
    buildBacktestDiagnosticsSearchFromSearchParams
} from '@/shared/utils/backtestDiagnosticsQuery'

/*
	Sidebar — единый слой навигации по разделам приложения: собирает пункты из route-конфига, фильтрует их по контексту текущей страницы и строит поднавигацию по hash-якорям из отчётных секций.

	Зачем:
		- Держит в одном месте правила отображения левого меню для обычных разделов, docs/explain и отчётных страниц.
		- Синхронизирует UI меню с маршрутом и hash, чтобы пользователь видел активный раздел и подпункт.

	Источники данных и сайд-эффекты:
		- Источник базовой навигации: SIDEBAR_NAV_ITEMS из роутера.
		- Источник динамических подпунктов: PFI/Diagnostics/PolicyBranchMega отчёты (tanstack query), включаемые только на релевантных страницах.
		- Побочный эффект: при сбросе hash выполняем скролл страницы к началу.

	Контракты:
		- Для динамических табов учитываются только валидные table-секции с непустыми колонками.
		- Для Policy Branch Mega при клике по якорю сохраняется вся query-строка (history/bucket/metric/tpsl/slmode/zonal), иначе теряется контекст выбранного среза.
*/
interface SidebarProps {
    className?: string

    mode?: 'default' | 'modal' | 'compact'

    onItemClick?: () => void
}

interface SidebarLocationSnapshot {
    pathname: string
    search: string
    hash: string
}

// Автоскролл к началу допустим только внутри того же документа:
// при смене pathname/search сброс hash означает уже новую страницу, а не возврат к началу текущей.
export function shouldScrollToTopAfterHashReset(
    previousLocation: SidebarLocationSnapshot | null,
    nextLocation: SidebarLocationSnapshot
): boolean {
    if (!previousLocation) {
        return false
    }

    const previousHash = previousLocation.hash.trim()
    const nextHash = nextLocation.hash.trim()
    if (!previousHash || nextHash) {
        return false
    }

    return previousLocation.pathname === nextLocation.pathname && previousLocation.search === nextLocation.search
}

const SECTION_ORDER: RouteSection[] = [
    'predictions',
    'models',
    'backtest',
    'analysis',
    'statistics',
    'diagnostics',
    'features',
    'guide',
    'developer',
    'docs',
    'explain'
]
const SECTION_FALLBACK_TITLES: Partial<Record<RouteSection, string>> = {
    predictions: 'Predictions',
    models: 'Models',
    backtest: 'Backtest',
    analysis: 'Analysis',
    statistics: 'Statistics',
    diagnostics: 'Diagnostics',
    features: 'Features',
    guide: 'Knowledge Base',
    developer: 'Developer',
    docs: 'Documentation',
    explain: 'Объяснение'
}
const SECTION_COMPACT_FALLBACK_TITLES: Partial<Record<RouteSection, string>> = {
    predictions: 'Predictions',
    models: 'Models',
    backtest: 'Backtest',
    analysis: 'Analysis',
    statistics: 'Stats',
    diagnostics: 'Diag',
    features: 'PFI',
    guide: 'Guide',
    developer: 'Dev',
    docs: 'Docs',
    explain: 'Explain'
}
const PFI_ROUTE_TABS: PfiTabConfig[] = [
    {
        id: 'daily-models',
        label: 'Daily models',
        anchor: '',
        routePath: ROUTE_PATH[AppRoute.PFI_PER_MODEL]
    },
    {
        id: 'sl-model',
        label: 'SL model',
        anchor: '',
        routePath: ROUTE_PATH[AppRoute.PFI_SL_MODEL]
    }
]

export default function AppSidebar({ className, mode = 'default', onItemClick }: SidebarProps) {
    const { t, i18n } = useTranslation()
    const location = useLocation()
    const pathname = location.pathname
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()

    // Режим страницы определяет, какие секции вообще должны быть видимы в сайдбаре.
    const isModal = mode === 'modal'
    const isCompact = mode === 'compact'
    const isGuideRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.GUIDE])
    const isDeveloperRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.DEVELOPER])
    const isDocsRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.DOCS])
    const isExplainRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.EXPLAIN])
    const isDiagnosticsRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.DIAGNOSTICS_HOME])
    const isAnalysisRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.ANALYSIS_HOME])
    const isStatisticsRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.STATISTICS_HOME])
    const previousLocationRef = useRef<SidebarLocationSnapshot | null>(null)

    useEffect(() => {
        const nextLocation: SidebarLocationSnapshot = {
            pathname: location.pathname,
            search: location.search ?? '',
            hash: location.hash ?? ''
        }

        if (shouldScrollToTopAfterHashReset(previousLocationRef.current, nextLocation)) {
            scrollToTop({
                behavior: 'smooth',
                withTransitionPulse: true
            })
        }

        previousLocationRef.current = nextLocation
    }, [location.hash, location.pathname, location.search])
    const dailyPfiRoutePath = ROUTE_PATH[AppRoute.PFI_PER_MODEL]
    const slPfiRoutePath = ROUTE_PATH[AppRoute.PFI_SL_MODEL]
    const policyBranchMegaRoutePath = useMemo(
        () => SIDEBAR_NAV_ITEMS.find(item => item.id === AppRoute.BACKTEST_POLICY_BRANCH_MEGA)?.path ?? null,
        []
    )

    const isOnDailyPfiPage = dailyPfiRoutePath ? isRouteBranchMatch(pathname, dailyPfiRoutePath) : false
    const isOnSlPfiPage = slPfiRoutePath ? isRouteBranchMatch(pathname, slPfiRoutePath) : false
    const isOnPfiRouteGroup = isOnDailyPfiPage || isOnSlPfiPage
    const isOnPolicyBranchMegaPage =
        policyBranchMegaRoutePath ? isRouteBranchMatch(pathname, policyBranchMegaRoutePath) : false
    const currentSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search])

    const diagnosticsNavArgs = useMemo(
        () => buildBacktestDiagnosticsQueryArgsFromSearchParams(currentSearchParams),
        [currentSearchParams]
    )
    const diagnosticsSearch = useMemo(
        () => buildBacktestDiagnosticsSearchFromSearchParams(currentSearchParams),
        [currentSearchParams]
    )

    // Подгружаем данные для поднавигации только на тех страницах, где она реально используется.
    const shouldLoadDiagnosticsNav = !isCompact && (isDiagnosticsRoute || isAnalysisRoute)
    const { data: diagnosticsReport } = useBacktestDiagnosticsReportNavQuery(
        {
            enabled: shouldLoadDiagnosticsNav,
            scope: BACKTEST_DIAGNOSTICS_QUERY_SCOPES.sidebarNav
        },
        diagnosticsNavArgs
    )

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch, {
                diagnosticsArgs: diagnosticsNavArgs
            })
        },
        [diagnosticsNavArgs, dispatch, queryClient]
    )

    const diagnosticsTabs = useMemo(() => {
        if (!diagnosticsReport) {
            return {
                ratings: [] as DiagnosticsTabConfig[],
                diagnostics: [] as DiagnosticsTabConfig[],
                dayStats: [] as DiagnosticsTabConfig[],
                diagnosticsGroups: new Map<DiagnosticsGroupId, DiagnosticsTabConfig[]>()
            }
        }

        const tableSections = (diagnosticsReport.sections ?? []).filter(
            (section): section is TableSectionDto =>
                Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
        )

        const split = splitBacktestDiagnosticsSections(tableSections)
        const ratingsRefs = toDiagnosticsSectionRefs(split.ratings)
        const dayStatsRefs = toDiagnosticsSectionRefs(split.dayStats)
        // Неизвестные секции отправляем в общий diagnostics, чтобы не терять навигацию при расширении отчёта.
        const diagnosticsSections = [...split.diagnostics, ...split.unknown]
        const diagnosticsRefs = toDiagnosticsSectionRefs(diagnosticsSections)
        const groupTabs = new Map<DiagnosticsGroupId, DiagnosticsTabConfig[]>()
        const groupIds: DiagnosticsGroupId[] = ['risk', 'guardrail', 'decisions', 'hotspots', 'other']
        for (const groupId of groupIds) {
            const groupSections = getDiagnosticsGroupSections(diagnosticsSections, groupId)
            const groupRefs = toDiagnosticsSectionRefs(groupSections)
            groupTabs.set(groupId, buildDiagnosticsTabsFromSections(groupRefs, i18n.resolvedLanguage ?? i18n.language))
        }

        return {
            ratings: buildDiagnosticsTabsFromSections(ratingsRefs, i18n.resolvedLanguage ?? i18n.language),
            diagnostics: buildDiagnosticsTabsFromSections(diagnosticsRefs, i18n.resolvedLanguage ?? i18n.language),
            dayStats: buildDiagnosticsTabsFromSections(dayStatsRefs, i18n.resolvedLanguage ?? i18n.language),
            diagnosticsGroups: groupTabs
        }
    }, [diagnosticsReport, i18n.language, i18n.resolvedLanguage])

    const policyBranchMegaTabs = useMemo(() => {
        const selectedBucket = resolvePolicyBranchMegaBucketFromQuery(
            currentSearchParams.get('bucket'),
            'daily'
        ) as PolicyBranchMegaBucketMode
        const selectedBucketView = resolvePolicyBranchMegaTotalBucketViewFromQuery(
            currentSearchParams.get('bucketview'),
            'aggregate'
        ) as PolicyBranchMegaTotalBucketView

        return buildPolicyBranchMegaTabsFromAvailableParts(
            [...POLICY_BRANCH_MEGA_CANONICAL_PARTS],
            selectedBucket,
            selectedBucketView
        )
    }, [currentSearchParams])

    // На специализированных страницах оставляем только профильную секцию в сайдбаре.
    const grouped = useMemo(() => {
        const bySection = new Map<RouteSection, SidebarNavItem[]>()

        SIDEBAR_NAV_ITEMS.forEach(item => {
            const section = item.section
            if (!section) {
                return
            }

            const isDocsItem = section === 'docs'
            const isExplainItem = section === 'explain'
            const isGuideItem = section === 'guide'
            const isDeveloperItem = section === 'developer'
            const isDiagnosticsItem = section === 'diagnostics'
            const isAnalysisItem = section === 'analysis'
            const isStatisticsItem = section === 'statistics'

            // В специализированных разделах оставляем только их собственные секции меню.
            if (isGuideRoute && !isGuideItem) {
                return
            }
            if (isDeveloperRoute && !isDeveloperItem) {
                return
            }
            if (isDocsRoute && !isDocsItem) {
                return
            }
            if (isExplainRoute && !isExplainItem) {
                return
            }
            if (isDiagnosticsRoute && !isDiagnosticsItem) {
                return
            }
            if (isAnalysisRoute && !isAnalysisItem) {
                return
            }
            if (isStatisticsRoute && !isStatisticsItem) {
                return
            }
            if (!isDocsRoute && isDocsItem) {
                return
            }
            if (!isGuideRoute && isGuideItem) {
                return
            }
            if (!isDeveloperRoute && isDeveloperItem) {
                return
            }
            if (!isExplainRoute && isExplainItem) {
                return
            }
            if (!isDiagnosticsRoute && isDiagnosticsItem) {
                return
            }
            if (!isAnalysisRoute && isAnalysisItem) {
                return
            }
            if (!isStatisticsRoute && isStatisticsItem) {
                return
            }

            const list = bySection.get(section) ?? []
            list.push(item)
            bySection.set(section, list)
        })

        // Стабильный порядок внутри секции: сначала order, затем label.
        for (const [section, items] of bySection) {
            items.sort((a, b) => {
                const ao = a.order ?? 0
                const bo = b.order ?? 0
                if (ao !== bo) return ao - bo
                return a.label.localeCompare(b.label)
            })
            bySection.set(section, items)
        }

        return bySection
    }, [isGuideRoute, isDeveloperRoute, isDocsRoute, isExplainRoute, isDiagnosticsRoute, isAnalysisRoute, isStatisticsRoute])

    const orderedSections: RouteSection[] = useMemo(() => {
        const existing = Array.from(grouped.keys())

        const explicit: RouteSection[] = SECTION_ORDER.filter(s => existing.includes(s))
        const rest: RouteSection[] = existing.filter(s => !SECTION_ORDER.includes(s))

        return [...explicit, ...rest]
    }, [grouped])

    const currentHash = location.hash.replace('#', '')

    if (isCompact) {
        return (
            <div className={classNames(cls.Sidebar, { [cls.Sidebar_compact]: true }, [className ?? ''])}>
                <div className={cls.compactSections}>
                    {orderedSections.map(section => {
                        const items = grouped.get(section) ?? []
                        if (items.length === 0) {
                            return null
                        }

                        const fallbackTitle = SECTION_FALLBACK_TITLES[section] ?? section
                        const sectionTitle = t(buildRouteSectionTitleI18nKey(section), {
                            defaultValue: fallbackTitle
                        })
                        const sectionCompactTitle = t(buildRouteSectionCompactTitleI18nKey(section), {
                            defaultValue: SECTION_COMPACT_FALLBACK_TITLES[section] ?? sectionTitle
                        })
                        const isActiveSection = items.some(
                            item => isRouteExactMatch(pathname, item.path) || isRouteBranchMatch(pathname, item.path)
                        )

                        return (
                            <button
                                key={section}
                                type='button'
                                title={sectionTitle}
                                aria-label={sectionTitle}
                                onClick={onItemClick}
                                className={classNames(
                                    cls.compactSectionButton,
                                    { [cls.compactSectionButtonActive]: isActiveSection },
                                    []
                                )}>
                                <span className={cls.compactSectionLabel}>{sectionCompactTitle}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div
            data-testid='sidebar'
            className={classNames(
                cls.Sidebar,
                {
                    [cls.Sidebar_modal]: isModal
                },
                [className ?? '']
            )}>
            <div className={cls.links}>
                {orderedSections.map(section => {
                    const items = grouped.get(section) ?? []
                    if (items.length === 0) {
                        return null
                    }

                    const fallbackTitle = SECTION_FALLBACK_TITLES[section] ?? section
                    const sectionTitle = t(buildRouteSectionTitleI18nKey(section), {
                        defaultValue: fallbackTitle
                    })

                    return (
                        <div key={section} className={cls.sectionBlock}>
                            <div className={cls.sectionTitle}>{sectionTitle}</div>

                            {items.map(item => {
                                const isBacktestFull = item.id === AppRoute.BACKTEST_FULL
                                const isPfiRoute = item.id === AppRoute.PFI_PER_MODEL
                                const isDocsModels = item.id === AppRoute.DOCS_MODELS
                                const isDocsTests = item.id === AppRoute.DOCS_TESTS
                                const isDocsTruthfulness = item.id === AppRoute.DOCS_TRUTHFULNESS
                                const isGuideModels = item.id === AppRoute.GUIDE_MODELS
                                const isGuideBranches = item.id === AppRoute.GUIDE_BRANCHES
                                const isGuideSplits = item.id === AppRoute.GUIDE_SPLITS
                                const isGuideTime = item.id === AppRoute.GUIDE_TIME
                                const isGuideFeatures = item.id === AppRoute.GUIDE_FEATURES
                                const isGuideTruthfulness = item.id === AppRoute.GUIDE_TRUTHFULNESS
                                const isGuideTests = item.id === AppRoute.GUIDE_TESTS
                                const isDeveloperBackendStructure = item.id === AppRoute.DEVELOPER_BACKEND_STRUCTURE
                                const isDeveloperRuntimeFlow = item.id === AppRoute.DEVELOPER_RUNTIME_FLOW
                                const isDeveloperReportsApi = item.id === AppRoute.DEVELOPER_REPORTS_API
                                const isDeveloperTestsGuards = item.id === AppRoute.DEVELOPER_TESTS_GUARDS
                                const isExplainBranches = item.id === AppRoute.EXPLAIN_BRANCHES
                                const isExplainSplits = item.id === AppRoute.EXPLAIN_SPLITS
                                const isExplainTime = item.id === AppRoute.EXPLAIN_TIME
                                const isExplainFeatures = item.id === AppRoute.EXPLAIN_FEATURES
                                const isAggregationStats = item.id === AppRoute.AGGREGATION_STATS
                                const isBacktestDiagnostics = item.id === AppRoute.BACKTEST_DIAGNOSTICS
                                const isBacktestRatings = item.id === AppRoute.BACKTEST_DIAGNOSTICS_RATINGS
                                const isBacktestDayStats = item.id === AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS
                                const isBacktestDiagnosticsGuardrail =
                                    item.id === AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL
                                const isBacktestDiagnosticsDecisions =
                                    item.id === AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS
                                const isBacktestDiagnosticsHotspots = item.id === AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS
                                const isBacktestDiagnosticsOther = item.id === AppRoute.BACKTEST_DIAGNOSTICS_OTHER
                                const isPolicyBranchMega = item.id === AppRoute.BACKTEST_POLICY_BRANCH_MEGA

                                const hasSubNav =
                                    isBacktestFull ||
                                    isPfiRoute ||
                                    isGuideModels ||
                                    isGuideBranches ||
                                    isGuideSplits ||
                                    isGuideTime ||
                                    isGuideFeatures ||
                                    isGuideTruthfulness ||
                                    isGuideTests ||
                                    isDeveloperBackendStructure ||
                                    isDeveloperRuntimeFlow ||
                                    isDeveloperReportsApi ||
                                    isDeveloperTestsGuards ||
                                    isDocsModels ||
                                    isDocsTests ||
                                    isDocsTruthfulness ||
                                    isExplainBranches ||
                                    isExplainSplits ||
                                    isExplainTime ||
                                    isExplainFeatures ||
                                    isAggregationStats ||
                                    isBacktestDiagnostics ||
                                    isBacktestRatings ||
                                    isBacktestDayStats ||
                                    isBacktestDiagnosticsGuardrail ||
                                    isBacktestDiagnosticsDecisions ||
                                    isBacktestDiagnosticsHotspots ||
                                    isBacktestDiagnosticsOther ||
                                    isPolicyBranchMega

                                const isRouteActiveBase = isPfiRoute ? isOnPfiRouteGroup : isRouteExactMatch(pathname, item.path)
                                const isPolicyBranchMegaRouteActive = isPolicyBranchMega && isRouteActiveBase
                                const isAnalysisFamilyItem =
                                    item.section === 'analysis' || item.section === 'diagnostics'
                                const analysisFamilySearch =
                                    isAnalysisRoute || isDiagnosticsRoute ? diagnosticsSearch : ''
                                const routeSearch =
                                    isPolicyBranchMega ?
                                        isPolicyBranchMegaRouteActive ? location.search
                                        :   analysisFamilySearch
                                    : isAnalysisFamilyItem ? analysisFamilySearch
                                    : ''

                                const containerClass = classNames(cls.itemBlock, {
                                    [cls.itemBlockGroup]: hasSubNav,
                                    [cls.itemBlockGroupActive]: hasSubNav && isRouteActiveBase
                                })

                                // Источник подвкладок зависит от текущего раздела и доступных секций отчёта.
                                const tabs =
                                    isBacktestFull ? BACKTEST_FULL_TABS
                                    : isPfiRoute ? PFI_ROUTE_TABS
                                    : isGuideModels ? GUIDE_MODELS_TABS
                                    : isGuideBranches ? GUIDE_BRANCHES_TABS
                                    : isGuideSplits ? GUIDE_SPLITS_TABS
                                    : isGuideTime ? GUIDE_TIME_TABS
                                    : isGuideFeatures ? GUIDE_FEATURES_TABS
                                    : isGuideTruthfulness ? GUIDE_TRUTHFULNESS_TABS
                                    : isGuideTests ? GUIDE_TESTS_TABS
                                    : isDeveloperBackendStructure ? DEVELOPER_BACKEND_STRUCTURE_TABS
                                    : isDeveloperRuntimeFlow ? DEVELOPER_RUNTIME_FLOW_TABS
                                    : isDeveloperReportsApi ? DEVELOPER_REPORTS_API_TABS
                                    : isDeveloperTestsGuards ? DEVELOPER_TESTS_GUARDS_TABS
                                    : isDocsModels ? DOCS_MODELS_TABS
                                    : isDocsTests ? DOCS_TESTS_TABS
                                    : isDocsTruthfulness ? DOCS_TRUTHFULNESS_TABS
                                    : isExplainBranches ? EXPLAIN_BRANCHES_TABS
                                    : isExplainSplits ? EXPLAIN_SPLITS_TABS
                                    : isExplainTime ? EXPLAIN_TIME_TABS
                                    : isExplainFeatures ? EXPLAIN_FEATURES_TABS
                                    : isAggregationStats ? AGGREGATION_TABS
                                    : isBacktestDiagnostics ? (diagnosticsTabs.diagnosticsGroups.get('risk') ?? [])
                                    : isBacktestDiagnosticsGuardrail ?
                                        (diagnosticsTabs.diagnosticsGroups.get('guardrail') ?? [])
                                    : isBacktestDiagnosticsDecisions ?
                                        (diagnosticsTabs.diagnosticsGroups.get('decisions') ?? [])
                                    : isBacktestDiagnosticsHotspots ?
                                        (diagnosticsTabs.diagnosticsGroups.get('hotspots') ?? [])
                                    : isBacktestDiagnosticsOther ?
                                        (diagnosticsTabs.diagnosticsGroups.get('other') ?? [])
                                    : isBacktestRatings ? diagnosticsTabs.ratings
                                    : isBacktestDayStats ? diagnosticsTabs.dayStats
                                    : isPolicyBranchMega ? policyBranchMegaTabs
                                    : []

                                const subNavAriaDefaultLabel =
                                    isBacktestFull ? 'Backtest sections'
                                    : isPfiRoute ? 'PFI sections'
                                    : isGuideModels ? 'Guide model sections'
                                    : isGuideBranches ? 'Guide branch sections'
                                    : isGuideSplits ? 'Guide split sections'
                                    : isGuideTime ? 'Guide time sections'
                                    : isGuideFeatures ? 'Guide feature sections'
                                    : isGuideTruthfulness ? 'Guide truthfulness sections'
                                    : isGuideTests ? 'Guide test sections'
                                    : isDeveloperBackendStructure ? 'Developer backend structure sections'
                                    : isDeveloperRuntimeFlow ? 'Developer runtime flow sections'
                                    : isDeveloperReportsApi ? 'Developer delivery sections'
                                    : isDeveloperTestsGuards ? 'Developer guard sections'
                                    : isDocsModels ? 'Model docs'
                                    : isDocsTests ? 'Test docs'
                                    : isDocsTruthfulness ? 'Truthfulness docs'
                                    : isExplainBranches ? 'Раздел про ветки'
                                    : isExplainSplits ? 'Раздел про сплиты'
                                    : isExplainTime ? 'Раздел про время'
                                    : isExplainFeatures ? 'Раздел про признаки'
                                    : isAggregationStats ? 'Aggregation sections'
                                    : isBacktestDiagnostics ? 'Diagnostics sections'
                                    : isBacktestDiagnosticsGuardrail ? 'Guardrail sections'
                                    : isBacktestDiagnosticsDecisions ? 'Decision sections'
                                    : isBacktestDiagnosticsHotspots ? 'Hotspot sections'
                                    : isBacktestDiagnosticsOther ? 'Other sections'
                                    : isBacktestRatings ? 'Analysis sections'
                                    : isBacktestDayStats ? 'Day-stat sections'
                                    : isPolicyBranchMega ? 'Policy Branch Mega sections'
                                    : undefined

                                const subNavAriaLabel =
                                    subNavAriaDefaultLabel ?
                                        t(buildRouteSubNavAriaI18nKey(item.id), {
                                            defaultValue: subNavAriaDefaultLabel
                                        })
                                    :   undefined

                                return (
                                    <div key={item.id} className={containerClass}>
                                        <Link
                                            to={`${item.path}${routeSearch}`}
                                            onClick={onItemClick}
                                            onMouseEnter={() => handleRouteWarmup(item.id)}
                                            onFocus={() => handleRouteWarmup(item.id)}
                                            className={classNames(cls.link, {
                                                [cls.linkActive]: isRouteActiveBase && !hasSubNav,
                                                [cls.linkGroup]: hasSubNav
                                            })}>
                                            <span className={cls.linkBullet} />
                                            <span className={cls.label}>
                                                {t(buildRouteNavLabelI18nKey(item.id), {
                                                    defaultValue: item.label
                                                })}
                                            </span>
                                        </Link>

                                        {hasSubNav && tabs.length > 0 && (
                                            <nav className={cls.subNav} aria-label={subNavAriaLabel}>
                                                <div className={cls.subNavLine} />
                                                <div className={cls.subNavList}>
                                                    {tabs.map(tab => {
                                                        const routePath =
                                                            'routePath' in tab &&
                                                            typeof tab.routePath === 'string' &&
                                                            tab.routePath.length > 0 ?
                                                                tab.routePath
                                                            :   null
                                                        const isRouteTab = routePath !== null
                                                        const isActiveTab =
                                                            isRouteTab ? isRouteExactMatch(pathname, routePath)
                                                            : isRouteActiveBase && currentHash === tab.anchor

                                                        // Для Policy Branch Mega сохраняем весь query-контекст фильтров при кликах по якорям.
                                                        const linkBase = `${item.path}${routeSearch}`
                                                        const href =
                                                            isRouteTab ? routePath
                                                            : `${linkBase}#${tab.anchor}`
                                                        const warmupRouteId =
                                                            isRouteTab && routePath === ROUTE_PATH[AppRoute.PFI_SL_MODEL] ? AppRoute.PFI_SL_MODEL
                                                            : item.id

                                                        return (
                                                            <Link
                                                                key={tab.id}
                                                                to={href}
                                                                onClick={onItemClick}
                                                                onMouseEnter={() => handleRouteWarmup(warmupRouteId)}
                                                                onFocus={() => handleRouteWarmup(warmupRouteId)}
                                                                className={classNames(cls.subLink, {
                                                                    [cls.subLinkActive]: isActiveTab
                                                                })}>
                                                                <span className={cls.subIcon}>
                                                                    <svg
                                                                        xmlns='http://www.w3.org/2000/svg'
                                                                        viewBox='0 0 24 24'
                                                                        aria-hidden='true'>
                                                                        <path d='M4 18h16v1H3v-13h1v12zm3.5-3.5 2.75-3.3 2.5 2.5 3.75-5.2.8.6-4.3 6-2.5-2.5-2.75 3.3-.95-.9z' />
                                                                    </svg>
                                                                </span>
                                                                <span className={cls.subLabel}>
                                                                    {t(buildRouteSubTabLabelI18nKey(item.id, tab.id), {
                                                                        defaultValue: tab.label
                                                                    })}
                                                                </span>
                                                                <span className={cls.subRipple} />
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            </nav>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
