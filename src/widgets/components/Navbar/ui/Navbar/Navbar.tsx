import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import cls from './Navbar.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import NavbarProps from './types'
import { LangSwitcher } from '@/widgets/components'
import { Btn, Link } from '@/shared/ui'
import { NAVBAR_ITEMS } from '@/app/providers/router/config/routeConfig'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import { buildRouteNavLabelI18nKey } from '@/app/providers/router/config/i18nKeys'
import SideBarBlock from '../SideBarBlock/SideBarBlock'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch } from '@/shared/lib/hooks/redux'

function Navbar({ className, showSidebarToggle, onSidebarToggleClick }: NavbarProps) {
    const { i18n, t } = useTranslation()
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const [primaryCount, setPrimaryCount] = useState(NAVBAR_ITEMS.length)
    const [hasOverflow, setHasOverflow] = useState(false)

    const navbarRef = useRef<HTMLDivElement | null>(null)
    const controlsRef = useRef<HTMLDivElement | null>(null)
    const measureRef = useRef<HTMLDivElement | null>(null)

    const handleMenuToggle = () => {
        setIsMenuOpen(prev => !prev)
    }

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch)
        },
        [dispatch, queryClient]
    )

    useEffect(() => {
        const closeMenu = () => setIsMenuOpen(false)

        if (typeof window !== 'undefined') {
            window.addEventListener('app:close-mobile-menu', closeMenu)
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('app:close-mobile-menu', closeMenu)
            }
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const recalc = () => {
            const navbarEl = navbarRef.current
            const controlsEl = controlsRef.current
            const measureEl = measureRef.current

            if (!navbarEl || !controlsEl || !measureEl) {
                return
            }

            const total = NAVBAR_ITEMS.length
            const navbarWidth = navbarEl.clientWidth
            const controlsWidth = controlsEl.getBoundingClientRect().width

            if (navbarWidth >= 1024) {
                setPrimaryCount(total)
                setHasOverflow(false)
                setIsMenuOpen(false)
                return
            }

            const availableWidth = Math.max(0, navbarWidth - controlsWidth - 24)

            const children = Array.from(measureEl.children) as HTMLElement[]
            const linkGap = 10

            const itemWidths = children.map(child => child.getBoundingClientRect().width)

            const totalItemsWidth = itemWidths.reduce((sum, w, index) => sum + w + (index > 0 ? linkGap : 0), 0)

            if (availableWidth <= 0 || totalItemsWidth <= availableWidth) {
                setPrimaryCount(total)
                setHasOverflow(false)
                setIsMenuOpen(false)
                return
            }

            const arrowWidth = 40
            let used = 0
            let count = 0

            for (let i = 0; i < itemWidths.length; i += 1) {
                const widthWithGap = itemWidths[i] + (count > 0 ? linkGap : 0)

                if (used + widthWithGap + arrowWidth <= availableWidth) {
                    used += widthWithGap
                    count += 1
                } else {
                    break
                }
            }

            if (count === 0) {
                count = 1
            }

            setPrimaryCount(count)
            setHasOverflow(true)
        }

        recalc()
        window.addEventListener('resize', recalc)

        return () => {
            window.removeEventListener('resize', recalc)
        }
    }, [i18n.language])

    const primaryItems = NAVBAR_ITEMS.slice(0, primaryCount)
    const secondaryItems = NAVBAR_ITEMS.slice(primaryCount)

    return (
        <div
            ref={navbarRef}
            className={classNames(
                cls.Navbar,
                {
                    [cls.Navbar_open]: isMenuOpen,
                    [cls.Navbar_overflow]: hasOverflow
                },
                [className ?? '']
            )}>
            <div ref={controlsRef} className={cls.controls}>
                <LangSwitcher />
            </div>
            <div className={cls.linksWrapper}>
                <div className={cls.linksRow}>
                    {primaryItems.map(item => (
                        <Link
                            key={item.id}
                            to={item.path}
                            onMouseEnter={() => handleRouteWarmup(item.id)}
                            onFocus={() => handleRouteWarmup(item.id)}>
                            {t(buildRouteNavLabelI18nKey(item.id), { defaultValue: item.label })}
                        </Link>
                    ))}

                    {secondaryItems.length > 0 && (
                        <Btn
                            className={classNames(cls.expandToggle, { [cls.expandToggle_open]: isMenuOpen }, [])}
                            aria-label={isMenuOpen ? t('nav:navbar.expand.hide') : t('nav:navbar.expand.show')}
                            aria-expanded={isMenuOpen}
                            onClick={handleMenuToggle}>
                            <span className={cls.expandToggleIcon} />
                        </Btn>
                    )}
                </div>

                {secondaryItems.length > 0 && (
                    <div className={classNames(cls.secondaryLinks, { [cls.secondaryLinks_open]: isMenuOpen }, [])}>
                        {secondaryItems.map(item => (
                            <Link
                                key={item.id}
                                to={item.path}
                                onMouseEnter={() => handleRouteWarmup(item.id)}
                                onFocus={() => handleRouteWarmup(item.id)}>
                                {t(buildRouteNavLabelI18nKey(item.id), { defaultValue: item.label })}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <div ref={measureRef} className={cls.measureRow} aria-hidden='true'>
                {NAVBAR_ITEMS.map(item => (
                    <span key={item.id} className={cls.measureItem}>
                        {t(buildRouteNavLabelI18nKey(item.id), { defaultValue: item.label })}
                    </span>
                ))}
            </div>
            <SideBarBlock show={showSidebarToggle} onClick={onSidebarToggleClick} />
        </div>
    )
}

export default memo(Navbar)
