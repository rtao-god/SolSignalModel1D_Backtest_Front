import { useEffect, useState } from 'react'
import cls from './Navbar.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import NavbarProps from './types'
import { LangSwitcher } from '@/widgets/components'
import { Link } from '@/shared/ui'
import { NAVBAR_ITEMS } from '@/app/providers/router/config/routeConfig'

export default function Navbar({ className }: NavbarProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const handleMenuToggle = () => {
        setIsMenuOpen(prev => !prev)
    }

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

    return (
        <div className={classNames(cls.Navbar, { [cls.Navbar_open]: isMenuOpen }, [className ?? ''])}>
            <div className={cls.controls}>
                <LangSwitcher />

                <button
                    type='button'
                    className={classNames(cls.menuToggle, { [cls.menuToggle_open]: isMenuOpen }, [])}
                    aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
                    aria-expanded={isMenuOpen}
                    onClick={handleMenuToggle}>
                    <span className={cls.menuToggleIcon} />
                </button>

                {/*
                <label className={cls.switch}>
                    <Input type='checkbox' />
                    <span
                        onClick={handleToggle}
                        className={`${cls.slider} ${cls.slider_red}`}
                    />
                </label>
                */}
            </div>

            <div className={classNames(cls.links, { [cls.links_open]: isMenuOpen }, [])}>
                {NAVBAR_ITEMS.map(item => (
                    <Link key={item.id} to={item.path}>
                        {item.label}
                    </Link>
                ))}

                {/*
                <AuthSection />
                */}
            </div>
        </div>
    )
}
