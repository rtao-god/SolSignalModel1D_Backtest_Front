import { Routes, Route } from 'react-router-dom'
import { ROUTE_CONFIG } from '../../config/routeConfig'
import Layout from '@/pages/Layout/Layout'

export default function AppRouter() {
    const routesWithLayout = ROUTE_CONFIG.filter(r => r.layout !== 'bare')
    const routesWithoutLayout = ROUTE_CONFIG.filter(r => r.layout === 'bare')

    return (
        <Routes>
            {/* Все "нормальные" страницы под общим Layout */}
            <Route element={<Layout children={undefined} />}>
                {routesWithLayout.map(route => (
                    <Route key={route.id} path={route.path} element={route.element} />
                ))}
            </Route>

            {/* "Голые" страницы без Layout */}
            {routesWithoutLayout.map(route => (
                <Route key={route.id} path={route.path} element={route.element} />
            ))}
        </Routes>
    )
}
