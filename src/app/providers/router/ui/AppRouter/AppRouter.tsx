import { Routes, Route } from 'react-router-dom'
import { ROUTE_CONFIG } from '../../config/routeConfig'
import Layout from '@/pages/Layout/ui/Layout'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'

export default function AppRouter() {
    const routesWithLayout = ROUTE_CONFIG.filter(r => r.layout !== 'bare')
    const routesWithoutLayout = ROUTE_CONFIG.filter(r => r.layout === 'bare')

    const renderElement = (route: (typeof ROUTE_CONFIG)[number]) => {
        if (!route.loadingTitle) {
            return route.element
        }

        return <PageSuspense title={route.loadingTitle}>{route.element}</PageSuspense>
    }

    return (
        <Routes>

            <Route element={<Layout children={undefined} />}>
                {routesWithLayout.map(route => (
                    <Route key={route.id} path={route.path} element={renderElement(route)} />
                ))}
            </Route>


            {routesWithoutLayout.map(route => (
                <Route key={route.id} path={route.path} element={renderElement(route)} />
            ))}
        </Routes>
    )
}
