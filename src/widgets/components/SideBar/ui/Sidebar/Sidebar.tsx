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
import {
    isRouteBranchMatch,
    isRouteExactMatch
} from '@/app/providers/router/config/utils/matchRoutePath'
import {
    buildRouteNavLabelI18nKey,
    buildRouteSubTabLabelI18nKey,
    buildRouteSectionTitleI18nKey,
    buildRouteSubNavAriaI18nKey
} from '@/app/providers/router/config/i18nKeys'
import { BACKTEST_FULL_TABS } from '@/shared/utils/backtestTabs'
import { AGGREGATION_TABS } from '@/shared/utils/aggregationTabs'
import type { TableSectionDto } from '@/shared/types/report.types'
import { buildPfiTabsFromSections, PfiTabConfig } from '@/shared/utils/pfiTabs'
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
import { usePfiPerModelReportNavQuery } from '@/shared/api/tanstackQueries/pfi'
import { buildPolicyBranchMegaTabsFromSections } from '@/shared/utils/policyBranchMegaTabs'
import {
    buildDiagnosticsTabsFromSections,
    getDiagnosticsGroupSections,
    splitBacktestDiagnosticsSections,
    toDiagnosticsSectionRefs,
    type DiagnosticsGroupId,
    type DiagnosticsTabConfig
} from '@/shared/utils/backtestDiagnosticsSections'
import { useBacktestDiagnosticsReportNavQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import {
    DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS,
    resolvePolicyBranchMegaReportQueryArgsOrThrow,
    usePolicyBranchMegaReportWithFreshnessQuery
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
		- Для Policy Branch Mega при клике по якорю сохраняется вся query-строка (bucket/metric/tpsl/slmode/zonal), иначе теряется контекст выбранного режима.
*/
interface SidebarProps {
    className?: string

    mode?: 'default' | 'modal'

    onItemClick?: () => void
}
const SECTION_ORDER: RouteSection[] = [
    'predictions',
    'models',
    'backtest',
    'analysis',
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
    diagnostics: 'Diagnostics',
    features: 'Features',
    guide: 'Knowledge Base',
    developer: 'Developer',
    docs: 'Documentation',
    explain: 'Explain'
}

export default function AppSidebar({ className, mode = 'default', onItemClick }: SidebarProps) {
    const { t } = useTranslation()
    const location = useLocation()
    const pathname = location.pathname
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()

    // Режим страницы определяет, какие секции вообще должны быть видимы в сайдбаре.
    const isModal = mode === 'modal'
    const isGuideRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.GUIDE])
    const isDeveloperRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.DEVELOPER])
    const isDocsRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.DOCS])
    const isExplainRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.EXPLAIN])
    const isDiagnosticsRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.DIAGNOSTICS_HOME])
    const isAnalysisRoute = isRouteBranchMatch(pathname, ROUTE_PATH[AppRoute.ANALYSIS_HOME])
    // Если hash в URL пропал (например, после перехода между пунктами), уводим страницу к началу.
    const prevHashRef = useRef<string | null>(null)

    useEffect(() => {
        const prevHash = prevHashRef.current ?? ''
        const currentHash = location.hash ?? ''
        if (prevHash && !currentHash) {
            scrollToTop({
                behavior: 'smooth',
                withTransitionPulse: true
            })
        }

        prevHashRef.current = currentHash
    }, [location.hash])
    const pfiRoutePath = useMemo(
        () => SIDEBAR_NAV_ITEMS.find(item => item.id === AppRoute.PFI_PER_MODEL)?.path ?? null,
        []
    )
    const policyBranchMegaRoutePath = useMemo(
        () => SIDEBAR_NAV_ITEMS.find(item => item.id === AppRoute.BACKTEST_POLICY_BRANCH_MEGA)?.path ?? null,
        []
    )

    const isOnPfiPage = pfiRoutePath ? isRouteBranchMatch(pathname, pfiRoutePath) : false
    const isOnPolicyBranchMegaPage =
        policyBranchMegaRoutePath ? isRouteBranchMatch(pathname, policyBranchMegaRoutePath) : false
    // PFI-данные нужны только внутри PFI-раздела, чтобы не делать лишний сетевой шум.
    const { data: pfiReport } = usePfiPerModelReportNavQuery({
        enabled: isOnPfiPage
    })
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
    const shouldLoadDiagnosticsNav = isDiagnosticsRoute || isAnalysisRoute
    const { data: diagnosticsReport } = useBacktestDiagnosticsReportNavQuery(
        {
            enabled: shouldLoadDiagnosticsNav
        },
        diagnosticsNavArgs
    )

    const policyBranchMegaArgsState = useMemo(() => {
        try {
            return {
                value: resolvePolicyBranchMegaReportQueryArgsOrThrow({
                    bucket: currentSearchParams.get('bucket'),
                    bucketView: currentSearchParams.get('bucketview'),
                    metric: currentSearchParams.get('metric'),
                    tpSlMode: currentSearchParams.get('tpsl'),
                    slMode: currentSearchParams.get('slmode'),
                    zonalMode: currentSearchParams.get('zonal')
                }),
                error: null as Error | null
            }
        } catch (err) {
            return {
                value: DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS,
                error: err instanceof Error ? err : new Error('Failed to resolve policy branch mega query args.')
            }
        }
    }, [currentSearchParams])

    const shouldLoadPolicyBranchMegaNav =
        isOnPolicyBranchMegaPage && policyBranchMegaArgsState.error === null
    const { data: policyBranchMegaPayload } = usePolicyBranchMegaReportWithFreshnessQuery(policyBranchMegaArgsState.value, {
        enabled: shouldLoadPolicyBranchMegaNav
    })
    const policyBranchMegaReport = policyBranchMegaPayload?.report ?? null

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch, {
                diagnosticsArgs: diagnosticsNavArgs,
                policyBranchMegaArgs:
                    policyBranchMegaArgsState.error ? undefined : policyBranchMegaArgsState.value
            })
        },
        [diagnosticsNavArgs, dispatch, policyBranchMegaArgsState.error, policyBranchMegaArgsState.value, queryClient]
    )

    const pfiTabs: PfiTabConfig[] = useMemo(() => {
        if (!pfiReport) return []

        // Защита от "шумных" секций: в навигацию попадают только реальные таблицы.
        const tableSections = (pfiReport.sections ?? []).filter(
            (section): section is TableSectionDto =>
                Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
        )

        return buildPfiTabsFromSections(tableSections)
    }, [pfiReport])

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
            groupTabs.set(groupId, buildDiagnosticsTabsFromSections(groupRefs))
        }

        return {
            ratings: buildDiagnosticsTabsFromSections(ratingsRefs),
            diagnostics: buildDiagnosticsTabsFromSections(diagnosticsRefs),
            dayStats: buildDiagnosticsTabsFromSections(dayStatsRefs),
            diagnosticsGroups: groupTabs
        }
    }, [diagnosticsReport])

    const policyBranchMegaTabs = useMemo(() => {
        if (!policyBranchMegaReport) return []

        const tableSections = (policyBranchMegaReport.sections ?? []).filter(
            (section): section is TableSectionDto =>
                Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
        )

        return buildPolicyBranchMegaTabsFromSections(tableSections)
    }, [policyBranchMegaReport])

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
    }, [isGuideRoute, isDeveloperRoute, isDocsRoute, isExplainRoute, isDiagnosticsRoute, isAnalysisRoute])

    const orderedSections: RouteSection[] = useMemo(() => {
        const existing = Array.from(grouped.keys())

        const explicit: RouteSection[] = SECTION_ORDER.filter(s => existing.includes(s))
        const rest: RouteSection[] = existing.filter(s => !SECTION_ORDER.includes(s))

        return [...explicit, ...rest]
    }, [grouped])

    const currentHash = location.hash.replace('#', '')

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
                                const isPfiPerModel = item.id === AppRoute.PFI_PER_MODEL
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
                                    isPfiPerModel ||
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

                                const isRouteActiveBase = isRouteExactMatch(pathname, item.path)
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
                                    : isPfiPerModel ? pfiTabs
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
                                    : isPfiPerModel ? 'PFI models'
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
                                    : isExplainBranches ? 'Branch explain'
                                    : isExplainSplits ? 'Split explain'
                                    : isExplainTime ? 'Time explain'
                                    : isExplainFeatures ? 'Feature explain'
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
                                                        const isActiveTab = isRouteActiveBase && currentHash === tab.anchor

                                                        // Для Policy Branch Mega сохраняем весь query-контекст фильтров при кликах по якорям.
                                                        const linkBase = `${item.path}${routeSearch}`

                                                        return (
                                                            <Link
                                                                key={tab.id}
                                                                to={`${linkBase}#${tab.anchor}`}
                                                                onClick={onItemClick}
                                                                onMouseEnter={() => handleRouteWarmup(item.id)}
                                                                onFocus={() => handleRouteWarmup(item.id)}
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
