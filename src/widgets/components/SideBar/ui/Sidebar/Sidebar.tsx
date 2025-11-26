import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Link } from '@/shared/ui'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import cls from './Sidebar.module.scss'
import { RouteSection, SIDEBAR_NAV_ITEMS } from '@/app/providers/router/config/routeConfig'
import { AppRoute, SidebarNavItem } from '@/app/providers/router/config/types'
import { BACKTEST_FULL_TABS } from '@/shared/utils/backtestTabs'
import { PFI_TABS } from '@/shared/utils/pfiTabs'

interface SidebarProps {
    className?: string
}

// Порядок секций в сайдбаре
const SECTION_ORDER: RouteSection[] = ['models', 'backtest', 'features']

// Человеко-читаемые заголовки секций
const SECTION_TITLES: Partial<Record<RouteSection, string>> = {
    models: 'Модели',
    backtest: 'Бэктест',
    features: 'Фичи'
    // system выводить не нужно — там служебные вещи (login/profile и т.п.)
}

export default function AppSidebar({ className }: SidebarProps) {
    const { t } = useTranslation('')
    const [collapsed, setCollapsed] = useState(true)
    const location = useLocation()

    const onToggle = () => {
        setCollapsed(prev => !prev)
    }

    // Группируем пункты меню по секциям
    const grouped = useMemo(() => {
        const bySection = new Map<RouteSection, SidebarNavItem[]>()

        SIDEBAR_NAV_ITEMS.forEach(item => {
            const section = item.section
            if (!section) {
                return
            }
            const list = bySection.get(section) ?? []
            list.push(item)
            bySection.set(section, list)
        })

        // Сортируем элементы внутри секции по order / label,
        // чтобы порядок контролировался маршрутом.
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
    }, [])

    // Формируем список секций в нужном порядке:
    // сначала те, которые явно заданы в SECTION_ORDER,
    // затем любые остальные (если появятся новые).
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
            className={classNames(cls.Sidebar, { [cls.collapsed]: collapsed }, [className ?? ''])}>
            <Btn data-testid='sidebar-toggle' onClick={onToggle} size='medium' className={cls.burgerBtn}>
                <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    focusable='false'
                    style={{ pointerEvents: 'none', display: 'inherit' }}
                    aria-hidden='true'>
                    <path d='M21 6H3V5h18v1zm0 5H3v1h18v-1zm0 6H3v1h18v-1z'></path>
                </svg>
            </Btn>

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

                                const hasSubNav = isBacktestFull || isPfiPerModel

                                const isBacktestRouteActive = isBacktestFull && location.pathname.startsWith(item.path)
                                const isPfiRouteActive = isPfiPerModel && location.pathname.startsWith(item.path)

                                const isRouteActiveBase =
                                    location.pathname === item.path || location.pathname.startsWith(item.path + '/')

                                const containerClass = classNames(cls.itemBlock, {
                                    [cls.itemBlockGroup]: hasSubNav,
                                    [cls.itemBlockGroupActive]: hasSubNav && isRouteActiveBase
                                })

                                const tabs =
                                    isBacktestFull ? BACKTEST_FULL_TABS
                                    : isPfiPerModel ? PFI_TABS
                                    : []

                                const subNavAriaLabel =
                                    isBacktestFull ? t('Разделы бэктеста')
                                    : isPfiPerModel ? t('Модели PFI')
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

                                        {/* Подвкладки:
                                            - для backtest/full → BACKTEST_FULL_TABS
                                            - для PFI по моделям → PFI_TABS
                                        */}
                                        {hasSubNav && tabs.length > 0 && (
                                            <nav className={cls.subNav} aria-label={subNavAriaLabel}>
                                                <div className={cls.subNavLine} />
                                                <div className={cls.subNavList}>
                                                    {tabs.map(tab => {
                                                        const isRouteActiveWithTabs =
                                                            (isBacktestFull && isBacktestRouteActive) ||
                                                            (isPfiPerModel && isPfiRouteActive)

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
                                                                    {/* Мини-иконка графика / сценария */}
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
