import { ComponentType, lazy } from 'react'
import type { RouteProps } from 'react-router'

// Логические идентификаторы маршрутов
export enum AppRoute {
    MAIN = 'MAIN',
    CURRENT_PREDICTION = 'CURRENT_PREDICTION',
    BACKTEST_BASELINE = 'BACKTEST_BASELINE',
    BACKTEST_SUMMARY = 'BACKTEST_SUMMARY',
    BACKTEST_FULL = 'BACKTEST_FULL',
    ABOUT = 'ABOUT',
    REGISTRATION = 'REGISTRATION',
    LOGIN = 'LOGIN',
    PROFILE = 'PROFILE',
    NOT_FOUND = 'NOT_FOUND'
}

// Карта id → реальный path
export const RoutePath: Record<AppRoute, string> = {
    [AppRoute.MAIN]: '/',
    [AppRoute.CURRENT_PREDICTION]: '/current-prediction',
    [AppRoute.BACKTEST_BASELINE]: '/backtest/baseline',
    [AppRoute.BACKTEST_SUMMARY]: '/backtest/summary',
    [AppRoute.BACKTEST_FULL]: '/backtest/full',
    [AppRoute.ABOUT]: '/about',
    [AppRoute.REGISTRATION]: '/registration',
    [AppRoute.LOGIN]: '/login',
    [AppRoute.PROFILE]: '/profile',
    [AppRoute.NOT_FOUND]: '*'
}

// Утилита для ленивых страниц
const lazyPage = <T extends ComponentType<any>>(importer: () => Promise<{ default: T }>) => lazy(importer)

export type RouteSection = 'root' | 'ml' | 'system'
export type RouteLayout = 'app' | 'bare'

export interface RouteNavMeta {
    sidebar?: boolean
    label: string
    section?: RouteSection
    order?: number
}

// Базовый тип маршрута приложения
export type AppRouteConfig = RouteProps & {
    id: AppRoute
    path: string
    element: JSX.Element
    nav?: RouteNavMeta
    layout?: RouteLayout // 'app' (по умолчанию) или 'bare'
}

// Страницы
const MainPage = lazyPage(() => import('@/pages/Main/Main'))

const RegistrationPage = lazyPage(() => import('@/pages/Registration/Registration'))
const LoginPage = lazyPage(() => import('@/pages/Login/Login'))
const AboutPage = lazyPage(() => import('@/pages/About/About'))
const NotFoundPage = lazyPage(() => import('@/pages/404/NotFound'))
const ProfilePage = lazyPage(() => import('@/pages/profile/Profile/ui/Profile'))

const BacktestBaselinePage = lazyPage(() => import('@/pages/BacktestBaselinePage/ui/BacktestBaselinePage'))
const BacktestPage = lazyPage(() => import('@/pages/BacktestPage/BacktestPage'))
const BacktestSummaryReportPage = lazyPage(() => import('@/pages/BacktestSummaryReport/ui/BacktestSummaryReportPage'))
const CurrentMLModelPredictionPage = lazyPage(
    () => import('@/pages/CurrentMLModelPredictionPage/CurrentMLModelPredictionPage')
)

// Конфигурация маршрутов
export const routeConfig: AppRouteConfig[] = [
    {
        id: AppRoute.MAIN,
        path: RoutePath.MAIN,
        element: <MainPage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Главная',
            section: 'root',
            order: 1
        }
    },
    {
        id: AppRoute.CURRENT_PREDICTION,
        path: RoutePath.CURRENT_PREDICTION,
        element: <CurrentMLModelPredictionPage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Текущий прогноз',
            section: 'ml',
            order: 1
        }
    },
    {
        id: AppRoute.BACKTEST_BASELINE,
        path: RoutePath.BACKTEST_BASELINE,
        element: <BacktestBaselinePage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Baseline бэктест',
            section: 'ml',
            order: 2
        }
    },
    {
        id: AppRoute.BACKTEST_SUMMARY,
        path: RoutePath.BACKTEST_SUMMARY,
        element: <BacktestSummaryReportPage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Сводка бэктеста',
            section: 'ml',
            order: 3
        }
    },
    {
        id: AppRoute.BACKTEST_FULL,
        path: RoutePath.BACKTEST_FULL,
        element: <BacktestPage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Экспериментальный бэктест',
            section: 'ml',
            order: 4
        }
    },
    {
        id: AppRoute.ABOUT,
        path: RoutePath.ABOUT,
        element: <AboutPage />,
        layout: 'app',
        nav: {
            sidebar: false,
            label: 'О проекте'
        }
    },

    // Эти две страницы хотим "голыми" — layout: 'bare'
    {
        id: AppRoute.REGISTRATION,
        path: RoutePath.REGISTRATION,
        element: <RegistrationPage />,
        layout: 'bare',
        nav: {
            sidebar: false,
            label: 'Регистрация'
        }
    },
    {
        id: AppRoute.LOGIN,
        path: RoutePath.LOGIN,
        element: <LoginPage />,
        layout: 'bare',
        nav: {
            sidebar: false,
            label: 'Вход'
        }
    },

    {
        id: AppRoute.PROFILE,
        path: RoutePath.PROFILE,
        element: <ProfilePage />,
        layout: 'app',
        nav: {
            sidebar: false,
            label: 'Профиль'
        }
    },
    {
        id: AppRoute.NOT_FOUND,
        path: RoutePath.NOT_FOUND,
        element: <NotFoundPage />,
        layout: 'app'
    }
]

// Элементы навигации в сайдбаре
export interface SidebarNavItem {
    id: AppRoute
    path: string
    label: string
    section?: RouteSection
    order: number
}

export const sidebarNavItems: SidebarNavItem[] = routeConfig
    .filter(route => route.nav?.sidebar)
    .map(route => ({
        id: route.id,
        path: route.path,
        label: route.nav!.label,
        section: route.nav?.section,
        order: route.nav?.order ?? 0
    }))
    .sort((a, b) => a.order - b.order)
