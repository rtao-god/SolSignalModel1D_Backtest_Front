import { useCallback, useState } from 'react'
import LayoutProps from './types'
import { Navbar, Sidebar, Footer } from '@/widgets/components'
import { TABLET, MOBILE } from '@/shared/utils'
import cls from './Layout.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { Outlet } from 'react-router-dom'
import { Modal } from '@/shared/ui' // предположение: Modal экспортируется отсюда

export default function Layout({ children, className }: LayoutProps) {
    // Десктоп — когда не мобильный и не планшет
    const isDesktop = !MOBILE && !TABLET

    const [isSidebarModalOpen, setIsSidebarModalOpen] = useState(false)

    const handleOpenSidebarModal = useCallback(() => {
        setIsSidebarModalOpen(true)
    }, [])

    const handleCloseSidebarModal = useCallback(() => {
        setIsSidebarModalOpen(false)
    }, [])

    return (
        <div className={classNames(cls.Layout, {}, [className ?? ''])}>
            <Navbar showSidebarToggle={!isDesktop} onSidebarToggleClick={handleOpenSidebarModal} />

            <div className={cls.content}>
                {isDesktop && <Sidebar />}

                <div className={cls.main}>
                    {/* Если когда-то захочется использовать Layout вручную с children,
                       это продолжит работать. Для роутов используем Outlet. */}
                    {children ?? <Outlet />}
                </div>
            </div>

            <Footer />

            {/* Модалка с сайдбаром для мобилок/планшетов */}
            {!isDesktop && isSidebarModalOpen && (
                <Modal width='min(90vw, 420px)' height='auto' onClose={handleCloseSidebarModal}>
                    <Sidebar mode='modal' onItemClick={handleCloseSidebarModal} />
                </Modal>
            )}
        </div>
    )
}
