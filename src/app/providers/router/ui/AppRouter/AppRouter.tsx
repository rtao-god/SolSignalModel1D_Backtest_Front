import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTE_CONFIG } from '../../config/routeConfig'
import { buildRouteLoadingTitleI18nKey } from '../../config/i18nKeys'
import Layout from '@/pages/Layout/ui/Layout'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'

export default function AppRouter() {
    const { t } = useTranslation()
    const routesWithLayout = ROUTE_CONFIG.filter(r => r.layout !== 'bare')
    const routesWithoutLayout = ROUTE_CONFIG.filter(r => r.layout === 'bare')

    const renderElement = (route: (typeof ROUTE_CONFIG)[number]) => {
        if (!route.loadingTitle) {
            return route.element
        }

        const localizedLoadingTitle = t(buildRouteLoadingTitleI18nKey(route.id), {
            defaultValue: route.loadingTitle
        })

        return <PageSuspense title={localizedLoadingTitle}>{route.element}</PageSuspense>
    }

    const renderBareElement = (route: (typeof ROUTE_CONFIG)[number]) => {
        return <main>{renderElement(route)}</main>
    }

    return (
        <Routes>
            <Route element={<Layout children={undefined} />}>
                {routesWithLayout.map(route => (
                    <Route key={route.id} path={route.path} element={renderElement(route)} />
                ))}
            </Route>

            {routesWithoutLayout.map(route => (
                <Route key={route.id} path={route.path} element={renderBareElement(route)} />
            ))}
        </Routes>
    )
}
