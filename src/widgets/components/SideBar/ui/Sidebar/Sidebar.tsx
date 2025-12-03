import classNames from '@/shared/lib/helpers/classNames'
import { Link } from '@/shared/ui'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import cls from './Sidebar.module.scss'
import { RouteSection, SIDEBAR_NAV_ITEMS } from '@/app/providers/router/config/routeConfig'
import { AppRoute, SidebarNavItem } from '@/app/providers/router/config/types'
import { BACKTEST_FULL_TABS } from '@/shared/utils/backtestTabs'
import { useGetPfiPerModelReportQuery } from '@/shared/api/api'
import type { TableSectionDto } from '@/shared/types/report.types'
import { buildPfiTabsFromSections, PfiTabConfig } from '@/shared/utils/pfiTabs'
import { scrollToTop } from '@/shared/ui/SectionPager/lib/scrollToAnchor'
import { DOCS_MODELS_TABS, DOCS_TESTS_TABS } from '@/shared/utils/docsTabs'

interface SidebarProps {
    className?: string
}

// Порядок секций в сайдбаре для "боевого" режима
const SECTION_ORDER: RouteSection[] = ['models', 'backtest', 'features']

// Человеко-читаемые заголовки секций
const SECTION_TITLES: Partial<Record<RouteSection, string>> = {
    models: 'Модели',
    backtest: 'Бэктест',
    features: 'Фичи',
    docs: 'Документация'
    // system выводить не нужно — там служебные вещи
}

export default function AppSidebar({ className }: SidebarProps) {
    const { t } = useTranslation('')
    const location = useLocation()

    const isDocsRoute = location.pathname.startsWith('/docs')

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
    const { data: pfiReport } = useGetPfiPerModelReportQuery(undefined, {
        skip: !isOnPfiPage
    })

    const pfiTabs: PfiTabConfig[] = useMemo(() => {
        if (!pfiReport) return []

        const tableSections = (pfiReport.sections ?? []).filter(
            (section): section is TableSectionDto =>
                Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
        )

        return buildPfiTabsFromSections(tableSections)
    }, [pfiReport])

    // Группируем пункты меню по секциям с учётом docs-режима
    const grouped = useMemo(() => {
        const bySection = new Map<RouteSection, SidebarNavItem[]>()

        SIDEBAR_NAV_ITEMS.forEach(item => {
            const section = item.section
            if (!section) {
                return
            }

            const isDocsItem = section === 'docs'

            // Если мы на docs-странице → показываем только docs-секцию.
            if (isDocsRoute && !isDocsItem) {
                return
            }

            // Если мы НЕ на docs-странице → скрываем docs-секцию.
            if (!isDocsRoute && isDocsItem) {
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
    }, [isDocsRoute])

    const orderedSections: RouteSection[] = useMemo(() => {
        const existing = Array.from(grouped.keys())

        const explicit: RouteSection[] = SECTION_ORDER.filter(s => existing.includes(s))
        const rest: RouteSection[] = existing.filter(s => !SECTION_ORDER.includes(s))

        return [...explicit, ...rest]
    }, [grouped])

    const currentHash = location.hash.replace('#', '')

    return (
        <div data-testid='sidebar' className={classNames(cls.Sidebar, {}, [className ?? ''])}>
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

                                const hasSubNav = isBacktestFull || isPfiPerModel || isDocsModels || isDocsTests

                                const isBacktestRouteActive = isBacktestFull && location.pathname.startsWith(item.path)
                                const isPfiRouteActive = isPfiPerModel && location.pathname.startsWith(item.path)
                                const isDocsModelsRouteActive = isDocsModels && location.pathname.startsWith(item.path)
                                const isDocsTestsRouteActive = isDocsTests && location.pathname.startsWith(item.path)

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
                                    : []

                                const subNavAriaLabel =
                                    isBacktestFull ? t('Разделы бэктеста')
                                    : isPfiPerModel ? t('Модели PFI')
                                    : isDocsModels ? t('Описание моделей')
                                    : isDocsTests ? t('Описание тестов')
                                    : undefined

                                return (
                                    <div key={item.id} className={containerClass}>
                                        {/* Основная вкладка */}
                                        <Link
                                            to={item.path}
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
                                                            (isDocsTests && isDocsTestsRouteActive)

                                                        const isActiveTab =
                                                            isRouteActiveWithTabs && currentHash === tab.anchor

                                                        return (
                                                            <Link
                                                                key={tab.id}
                                                                to={`${item.path}#${tab.anchor}`}
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
