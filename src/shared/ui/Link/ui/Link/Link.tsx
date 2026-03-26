import { Link, useLocation, useResolvedPath } from 'react-router-dom'
import type { MouseEvent } from 'react'
import cls from './Link.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import AppLinkProps from './types'
import { scrollToAnchor } from '@/shared/ui/SectionPager/lib/scrollToAnchor'
import {
    buildInternalRouteTransitionIntent,
    dispatchInternalRouteTransition
} from '@/shared/lib/navigation/internalRouteTransition'

function extractAnchorFromTo(to: AppLinkProps['to']): string | null {
    if (typeof to === 'string') {
        const hashIndex = to.indexOf('#')
        if (hashIndex < 0) {
            return null
        }

        const anchor = to.slice(hashIndex + 1).trim()
        return anchor.length > 0 ? anchor : null
    }

    const rawHash = typeof to.hash === 'string' ? to.hash.trim() : ''
    if (!rawHash) {
        return null
    }

    return rawHash.startsWith('#') ? rawHash.slice(1) : rawHash
}

function scheduleAnchorScroll(anchor: string): void {
    if (typeof window === 'undefined') {
        return
    }

    let attemptCount = 0
    const maxAttempts = 18

    // Hash-цель может появиться только после route transition и ленивой загрузки страницы,
    // поэтому scroll запускается с несколькими короткими ретраями вместо одного синхронного вызова.
    const tryScroll = () => {
        attemptCount += 1

        if (document.getElementById(anchor)) {
            scrollToAnchor(anchor, {
                behavior: 'smooth'
            })
            return
        }

        if (attemptCount >= maxAttempts) {
            return
        }

        window.setTimeout(
            () => {
                window.requestAnimationFrame(tryScroll)
            },
            attemptCount <= 2 ? 0 : 70
        )
    }

    window.requestAnimationFrame(tryScroll)
}

export default function AppLink({ to, className, children, onClick, ...rest }: AppLinkProps) {
    const location = useLocation()
    const resolvedTarget = useResolvedPath(to)

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        const anchor = extractAnchorFromTo(to)

        if (onClick) {
            onClick(event)
        }

        const isPlainPrimaryClick =
            event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey
        const keepsCurrentDocument =
            Boolean(event.currentTarget.target && event.currentTarget.target !== '_self')
            || event.currentTarget.hasAttribute('download')

        if (!event.defaultPrevented && isPlainPrimaryClick && !keepsCurrentDocument) {
            dispatchInternalRouteTransition(
                buildInternalRouteTransitionIntent(location, {
                    pathname: resolvedTarget.pathname,
                    search: resolvedTarget.search,
                    hash: resolvedTarget.hash
                })
            )
        }

        if (
            anchor &&
            !event.defaultPrevented &&
            isPlainPrimaryClick
        ) {
            scheduleAnchorScroll(anchor)
        }

        if (!event.defaultPrevented && typeof window !== 'undefined') {
            window.dispatchEvent(new Event('app:close-mobile-menu'))
        }
    }

    return (
        <Link to={to} {...rest} onClick={handleClick} className={classNames(cls.App_link, {}, [className ?? ''])}>
            {children}
        </Link>
    )
}
