import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'
import cls from './Link.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import AppLinkProps from './types'

export default function AppLink({ to, className, children, onClick, ...rest }: AppLinkProps) {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (onClick) {
            onClick(event)
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

