import classNames from '@/shared/lib/helpers/classNames'
import { Link } from '@/shared/ui'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import cls from './Sidebar.module.scss'
import { RouteSection, SIDEBAR_NAV_ITEMS } from '@/app/providers/router/config/routeConfig'
import { AppRoute, SidebarNavItem } from '@/app/providers/router/config/types'
import { BACKTEST_FULL_TABS } from '@/shared/utils/backtestTabs'
import { AGGREGATION_TABS } from '@/shared/utils/aggregationTabs'
import type { TableSectionDto } from '@/shared/types/report.types'
import { buildPfiTabsFromSections, PfiTabConfig } from '@/shared/utils/pfiTabs'
import { scrollToTop } from '@/shared/ui/SectionPager/lib/scrollToAnchor'
import { DOCS_MODELS_TABS, DOCS_TESTS_TABS } from '@/shared/utils/docsTabs'
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
import { usePolicyBranchMegaReportNavQuery } from '@/shared/api/tanstackQueries/policyBranchMega'

/*
    Sidebar — левое меню навигации.

    Зачем:
        - Группирует пункты по разделам (predictions/models/backtest/analysis/diagnostics).
        - Подтягивает hash-навигацию для страниц с секциями (PFI, diagnostics, policy-branch-mega).
*/

interface SidebarProps {
    className?: string
    /**
     * Режим отображения:
     * - default — обычный сайдбар в лэйауте (ПК)
     * - modal   — тот же контент, но внутри модалки (мобилка/планшет)
     */
    mode?: 'default' | 'modal'
    /**
     * Коллбек на клик по пункту меню (основному или подвкладке).
     * В моб. режиме используется для закрытия модалки.
     */
    onItemClick?: () => void
}

// Порядок секций в сайдбаре для "боевого" режима
const SECTION_ORDER: RouteSection[] = ['predictions', 'models', 'backtest', 'analysis', 'diagnostics', 'features']

// Человеко-читаемые заголовки секций
const SECTION_TITLES: Partial<Record<RouteSection, string>> = {
    predictions: 'Прогнозы',
    models: 'Модели',
    backtest: 'Бэктест',
    analysis: 'Анализ',
    diagnostics: 'Диагностика',
    features: 'Фичи',
    docs: 'Документация'
    // system выводить не нужно — там служебные вещи
}

export default function AppSidebar({ className, mode = 'default', onItemClick }: SidebarProps) {
    const { t } = useTranslation('')
    const location = useLocation()

    const isModal = mode === 'modal'
    const isDocsRoute = location.pathname.startsWith('/docs')
    const isDiagnosticsRoute = location.pathname.startsWith('/diagnostics')
    const isAnalysisRoute = location.pathname.startsWith('/analysis')

    // ===== Хук: если hash был, а стал пустой — скроллим в самый верх =====
    const prevHashRef = useRef<string | null>(null)

    useEffect(() => {
        const prevHash = prevHashRef.current ?? ''
        const currentHash = location.hash ?? ''

        // Был какой-то #anchor, теперь hash пустой → едем наверх.
        if (prevHash && !currentHash) {
            scrollToTop({
                behavior: 'smooth',
                withTransitionPulse: true
            })
        }

        prevHashRef.current = currentHash
    }, [location.hash])

    // Путь до PFI-страницы для skip-логики запроса
    const pfiRoutePath = useMemo(
        () => SIDEBAR_NAV_ITEMS.find(item => item.id === AppRoute.PFI_PER_MODEL)?.path ?? null,
        []
    )

    const isOnPfiPage = pfiRoutePath ? location.pathname.startsWith(pfiRoutePath) : false

    // Тянем PFI-отчёт только когда реально находимся на PFI-странице
    // TanStack-хук: запрос активен только на PFI-странице.
    const { data: pfiReport } = usePfiPerModelReportNavQuery({
        enabled: isOnPfiPage
    })

    const shouldLoadDiagnosticsNav = isDiagnosticsRoute || isAnalysisRoute
    const { data: diagnosticsReport } = useBacktestDiagnosticsReportNavQuery({
        enabled: shouldLoadDiagnosticsNav
    })

    const shouldLoadPolicyBranchMegaNav = isAnalysisRoute
    const { data: policyBranchMegaReport } = usePolicyBranchMegaReportNavQuery({
        enabled: shouldLoadPolicyBranchMegaNav
    })

    const pfiTabs: PfiTabConfig[] = useMemo(() => {
        if (!pfiReport) return []

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

    // Группируем пункты меню по секциям с учётом docs-режима
    const grouped = useMemo(() => {
        const bySection = new Map<RouteSection, SidebarNavItem[]>()

        SIDEBAR_NAV_ITEMS.forEach(item => {
            const section = item.section
            if (!section) {
                return
            }

            const isDocsItem = section === 'docs'
            const isDiagnosticsItem = section === 'diagnostics'
            const isAnalysisItem = section === 'analysis'

            // Если мы на docs-странице → показываем только docs-секцию.
            if (isDocsRoute && !isDocsItem) {
                return
            }

            // Если мы на diagnostics-странице → показываем только диагностику.
            if (isDiagnosticsRoute && !isDiagnosticsItem) {
                return
            }

            // Если мы на analysis-странице → показываем только анализ.
            if (isAnalysisRoute && !isAnalysisItem) {
                return
            }

            // Если мы НЕ на docs/diagnostics/analysis → скрываем эти секции.
            if (!isDocsRoute && isDocsItem) {
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
    }, [isDocsRoute, isDiagnosticsRoute, isAnalysisRoute])

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

                    const title = SECTION_TITLES[section] ?? section

                    return (
                        <div key={section} className={cls.sectionBlock}>
                            <div className={cls.sectionTitle}>{t(title)}</div>

                            {items.map(item => {
                                const isBacktestFull = item.id === AppRoute.BACKTEST_FULL
                                const isPfiPerModel = item.id === AppRoute.PFI_PER_MODEL
                                const isDocsModels = item.id === AppRoute.DOCS_MODELS
                                const isDocsTests = item.id === AppRoute.DOCS_TESTS
                                const isAggregationStats = item.id === AppRoute.AGGREGATION_STATS
                                const isBacktestDiagnostics = item.id === AppRoute.BACKTEST_DIAGNOSTICS
                                const isBacktestRatings = item.id === AppRoute.BACKTEST_DIAGNOSTICS_RATINGS
                                const isBacktestDayStats = item.id === AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS
                                const isBacktestDiagnosticsGuardrail =
                                    item.id === AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL
                                const isBacktestDiagnosticsDecisions =
                                    item.id === AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS
                                const isBacktestDiagnosticsHotspots =
                                    item.id === AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS
                                const isBacktestDiagnosticsOther = item.id === AppRoute.BACKTEST_DIAGNOSTICS_OTHER
                                const isPolicyBranchMega = item.id === AppRoute.BACKTEST_POLICY_BRANCH_MEGA

                                const hasSubNav =
                                    isBacktestFull ||
                                    isPfiPerModel ||
                                    isDocsModels ||
                                    isDocsTests ||
                                    isAggregationStats ||
                                    isBacktestDiagnostics ||
                                    isBacktestRatings ||
                                    isBacktestDayStats ||
                                    isBacktestDiagnosticsGuardrail ||
                                    isBacktestDiagnosticsDecisions ||
                                    isBacktestDiagnosticsHotspots ||
                                    isBacktestDiagnosticsOther ||
                                    isPolicyBranchMega

                                const isBacktestRouteActive = isBacktestFull && location.pathname.startsWith(item.path)
                                const isPfiRouteActive = isPfiPerModel && location.pathname.startsWith(item.path)
                                const isDocsModelsRouteActive = isDocsModels && location.pathname.startsWith(item.path)
                                const isDocsTestsRouteActive = isDocsTests && location.pathname.startsWith(item.path)
                                const isAggregationStatsRouteActive =
                                    isAggregationStats && location.pathname.startsWith(item.path)
                                const isBacktestDiagnosticsRouteActive =
                                    isBacktestDiagnostics && location.pathname.startsWith(item.path)
                                const isBacktestDiagnosticsGuardrailRouteActive =
                                    isBacktestDiagnosticsGuardrail && location.pathname.startsWith(item.path)
                                const isBacktestDiagnosticsDecisionsRouteActive =
                                    isBacktestDiagnosticsDecisions && location.pathname.startsWith(item.path)
                                const isBacktestDiagnosticsHotspotsRouteActive =
                                    isBacktestDiagnosticsHotspots && location.pathname.startsWith(item.path)
                                const isBacktestDiagnosticsOtherRouteActive =
                                    isBacktestDiagnosticsOther && location.pathname.startsWith(item.path)
                                const isBacktestRatingsRouteActive =
                                    isBacktestRatings && location.pathname.startsWith(item.path)
                                const isBacktestDayStatsRouteActive =
                                    isBacktestDayStats && location.pathname.startsWith(item.path)
                                const isPolicyBranchMegaRouteActive =
                                    isPolicyBranchMega && location.pathname.startsWith(item.path)

                                const isRouteActiveBase =
                                    location.pathname === item.path || location.pathname.startsWith(item.path + '/')

                                const containerClass = classNames(cls.itemBlock, {
                                    [cls.itemBlockGroup]: hasSubNav,
                                    [cls.itemBlockGroupActive]: hasSubNav && isRouteActiveBase
                                })

                                const tabs =
                                    isBacktestFull ? BACKTEST_FULL_TABS
                                    : isPfiPerModel ? pfiTabs
                                    : isDocsModels ? DOCS_MODELS_TABS
                                    : isDocsTests ? DOCS_TESTS_TABS
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

                                const subNavAriaLabel =
                                    isBacktestFull ? t('Разделы бэктеста')
                                    : isPfiPerModel ? t('Модели PFI')
                                    : isDocsModels ? t('Описание моделей')
                                    : isDocsTests ? t('Описание тестов')
                                    : isAggregationStats ? t('Разделы агрегации прогнозов')
                                    : isBacktestDiagnostics ? t('Разделы диагностики')
                                    : isBacktestDiagnosticsGuardrail ? t('Разделы guardrail')
                                    : isBacktestDiagnosticsDecisions ? t('Разделы решений')
                                    : isBacktestDiagnosticsHotspots ? t('Разделы hotspots')
                                    : isBacktestDiagnosticsOther ? t('Разделы прочего')
                                    : isBacktestRatings ? t('Разделы анализа')
                                    : isBacktestDayStats ? t('Разделы статистики по дням')
                                    : isPolicyBranchMega ? t('Разделы Policy Branch Mega')
                                    : undefined

                                return (
                                    <div key={item.id} className={containerClass}>
                                        {/* Основная вкладка */}
                                        <Link
                                            to={item.path}
                                            onClick={onItemClick}
                                            className={classNames(cls.link, {
                                                [cls.linkActive]: isRouteActiveBase && !hasSubNav,
                                                [cls.linkGroup]: hasSubNav
                                            })}>
                                            <span className={cls.linkBullet} />
                                            <span className={cls.label}>{t(item.label)}</span>
                                        </Link>

                                        {/* Подвкладки для backtest / PFI / Docs-* */}
                                        {hasSubNav && tabs.length > 0 && (
                                            <nav className={cls.subNav} aria-label={subNavAriaLabel}>
                                                <div className={cls.subNavLine} />
                                                <div className={cls.subNavList}>
                                                    {tabs.map(tab => {
                                                        const isRouteActiveWithTabs =
                                                            (isBacktestFull && isBacktestRouteActive) ||
                                                            (isPfiPerModel && isPfiRouteActive) ||
                                                            (isDocsModels && isDocsModelsRouteActive) ||
                                                            (isDocsTests && isDocsTestsRouteActive) ||
                                                            (isAggregationStats && isAggregationStatsRouteActive) ||
                                                            (isBacktestDiagnostics && isBacktestDiagnosticsRouteActive) ||
                                                            (isBacktestDiagnosticsGuardrail &&
                                                                isBacktestDiagnosticsGuardrailRouteActive) ||
                                                            (isBacktestDiagnosticsDecisions &&
                                                                isBacktestDiagnosticsDecisionsRouteActive) ||
                                                            (isBacktestDiagnosticsHotspots &&
                                                                isBacktestDiagnosticsHotspotsRouteActive) ||
                                                            (isBacktestDiagnosticsOther &&
                                                                isBacktestDiagnosticsOtherRouteActive) ||
                                                            (isBacktestRatings && isBacktestRatingsRouteActive) ||
                                                            (isBacktestDayStats && isBacktestDayStatsRouteActive) ||
                                                            (isPolicyBranchMega && isPolicyBranchMegaRouteActive)

                                                        const isActiveTab =
                                                            isRouteActiveWithTabs && currentHash === tab.anchor

                                                        return (
                                                            <Link
                                                                key={tab.id}
                                                                to={`${item.path}#${tab.anchor}`}
                                                                onClick={onItemClick}
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
                                                                <span className={cls.subLabel}>{t(tab.label)}</span>
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
