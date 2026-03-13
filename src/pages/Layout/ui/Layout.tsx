import { useCallback, useEffect, useState } from 'react'
import LayoutProps from './types'
import { Navbar, Sidebar, Footer } from '@/widgets/components'
import cls from './Layout.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { Outlet, useLocation } from 'react-router-dom'
import { Modal } from '@/shared/ui'
import PageErrorFallback from '@/app/providers/ErrorBoundary/ui/PageErrorFallback/PageErrorFallback'
import { logError } from '@/shared/lib/logging/logError'
import { ErrorBoundary } from '@/app/providers/ErrorBoundary/ErrorBoundary'

export default function Layout({ children, className }: LayoutProps) {
    const [isSidebarModalOpen, setIsSidebarModalOpen] = useState(false)
    const location = useLocation()
    const isGuideRoute = location.pathname.startsWith('/guide')

    const handleOpenSidebarModal = useCallback(() => {
        setIsSidebarModalOpen(true)
    }, [])

    const handleCloseSidebarModal = useCallback(() => {
        setIsSidebarModalOpen(false)
    }, [])

    useEffect(() => {
        setIsSidebarModalOpen(false)
    }, [location.pathname])

    return (
        <div className={classNames(cls.Layout, {}, [className ?? ''])}>
            <Navbar showSidebarToggle onSidebarToggleClick={handleOpenSidebarModal} />

            <div className={cls.content}>
                <div className={cls.fullSidebarShell}>
                    <Sidebar />
                </div>

                <div className={cls.compactSidebarShell}>
                    <Sidebar mode='compact' onItemClick={handleOpenSidebarModal} />
                </div>

                <main className={classNames(cls.main, { [cls.guideMain]: isGuideRoute })} data-tooltip-boundary>
                    <ErrorBoundary
                        resetKeys={[location.pathname]}
                        onError={(error, errorInfo) =>
                            logError(error, errorInfo, {
                                source: 'layout-error-boundary',
                                path: location.pathname,
                                domain: 'route_runtime'
                            })
                        }
                        fallbackRender={props => <PageErrorFallback {...props} />}>
                        {children ?? <Outlet />}
                    </ErrorBoundary>
                </main>
            </div>

            <Footer />

            {isSidebarModalOpen && (
                <Modal
                    className={cls.sidebarModal}
                    width='min(92vw, var(--sidebar-modal-width))'
                    height='auto'
                    onClose={handleCloseSidebarModal}>
                    <Sidebar mode='modal' onItemClick={handleCloseSidebarModal} />
                </Modal>
            )}
        </div>
    )
}
