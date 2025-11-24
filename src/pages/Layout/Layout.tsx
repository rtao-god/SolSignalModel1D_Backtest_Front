import LayoutProps from './types'
import { Navbar, Sidebar, Footer } from '@/widgets/components'
import { TABLET, MOBILE, PC } from '@/shared/utils'
import cls from './Layout.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { Outlet } from 'react-router-dom'

export default function Layout({ children, className }: LayoutProps) {
    // const isDesktop = !MOBILE && !TABLET
    const isDesktop = MOBILE && TABLET // для тестов

    return (
        <div className={classNames(cls.Layout, {}, [className ?? ''])}>
            <Navbar />

            <div className={cls.content}>
                <Sidebar />
                <div className={cls.main}>
                    {/* Если когда-то захочется использовать Layout вручную с children,
                       это продолжит работать. Для роутов используем Outlet. */}
                    {children ?? <Outlet />}
                </div>
            </div>

            <Footer />
        </div>
    )
}
