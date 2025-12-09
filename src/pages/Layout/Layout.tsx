import { useCallback, useState } from 'react'
import LayoutProps from './types'
import { Navbar, Sidebar, Footer } from '@/widgets/components'
import { TABLET, MOBILE } from '@/shared/utils'
import cls from './Layout.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { Outlet, useLocation } from 'react-router-dom'
import { Modal } from '@/shared/ui'
import PageErrorFallback from '@/app/providers/ErrorBoundary/ui/PageErrorFallback/PageErrorFallback'
import { logError } from '@/shared/lib/logging/logError'
import { ErrorBoundary } from '@/app/providers/ErrorBoundary/ErrorBoundary'

export default function Layout({ children, className }: LayoutProps) {
    // Десктоп — когда не мобильный и не планшет
    const isDesktop = !MOBILE && !TABLET

    const [isSidebarModalOpen, setIsSidebarModalOpen] = useState(false)
    const location = useLocation()

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
                    {/* Layout-level ErrorBoundary: защищает основное содержимое (Outlet/children),
                        но не трогает Navbar/Sidebar/Footer */}
                    <ErrorBoundary
                        resetKeys={[location.pathname]}
                        onError={(error, errorInfo) =>
                            logError(error, errorInfo, {
                                source: 'layout-error-boundary',
                                path: location.pathname
                            })
                        }
                        fallbackRender={props => <PageErrorFallback {...props} />}>
                        {/* Если Layout используется как оболочка с children — сохраняем этот сценарий,
                           для маршрутов по умолчанию рендерим <Outlet /> */}
                        {children ?? <Outlet />}
                    </ErrorBoundary>
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
