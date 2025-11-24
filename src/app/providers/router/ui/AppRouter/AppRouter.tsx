import { Routes, Route } from 'react-router-dom'
import { routeConfig } from '../../config/routeConfig'
import Layout from '@/pages/Layout/Layout'

export default function AppRouter() {
    const routesWithLayout = routeConfig.filter(r => r.layout !== 'bare')
    const routesWithoutLayout = routeConfig.filter(r => r.layout === 'bare')

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
