import { Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTE_CONFIG } from '../../config/routeConfig'
import { buildRouteLoadingTitleI18nKey } from '../../config/i18nKeys'
import Layout from '@/pages/Layout/ui/Layout'
import { ErrorBoundary } from '@/app/providers/ErrorBoundary/ErrorBoundary'
import { logError } from '@/shared/lib/logging/logError'
import { buildRouteNavLabelI18nKey } from '../../config/i18nKeys'
import { resolveRouteShellFallback } from './routeShellFallbacks'
import { ModeScopedRouteElement } from '../ModeScopedRouteElement/ModeScopedRouteElement'

export default function AppRouter() {
    const { t } = useTranslation()
    const location = useLocation()
    const routesWithLayout = ROUTE_CONFIG.filter(r => r.layout !== 'bare')
    const routesWithoutLayout = ROUTE_CONFIG.filter(r => r.layout === 'bare')

    const renderElement = (route: (typeof ROUTE_CONFIG)[number]) => {
        const localizedLoadingTitle = t(buildRouteLoadingTitleI18nKey(route.id), {
            defaultValue: route.loadingTitle ?? 'Loading page'
        })
        const routeLabelDefault =
            route.nav?.label ??
            t(buildRouteLoadingTitleI18nKey(route.id), {
                defaultValue: localizedLoadingTitle
            })
        const localizedRouteLabel = route.nav ?
                t(buildRouteNavLabelI18nKey(route.id), { defaultValue: routeLabelDefault })
            :   routeLabelDefault
        const ShellFallback = resolveRouteShellFallback(route.id)

        const routeElement =
            route.modePageKey ?
                (
                    <ModeScopedRouteElement
                        routeLabel={localizedRouteLabel}
                        pageKey={route.modePageKey}
                        fixedSplitElement={route.element}
                    />
                )
            :   route.element

        return (
            <ErrorBoundary
                resetKeys={[location.pathname, location.search, location.hash]}
                onError={(error, errorInfo) =>
                    logError(error, errorInfo, {
                        source: 'router-route-boundary',
                        path: route.path,
                        domain: 'route_runtime',
                        extra: { routeId: route.id }
                    })
                }
                fallbackRender={({ error, resetErrorBoundary }) => (
                    <ShellFallback
                        routeLabelDefault={localizedRouteLabel}
                        loadingTitle={localizedLoadingTitle}
                        state='error'
                        error={error}
                        resetErrorBoundary={resetErrorBoundary}
                    />
                )}>
                <Suspense
                    fallback={
                        <ShellFallback
                            routeLabelDefault={localizedRouteLabel}
                            loadingTitle={localizedLoadingTitle}
                            state='loading'
                        />
                    }>
                    {routeElement}
                </Suspense>
            </ErrorBoundary>
        )
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
