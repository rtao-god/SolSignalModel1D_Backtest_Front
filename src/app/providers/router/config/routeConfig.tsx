import { AppRoute, AppRouteConfig, SidebarNavItem, RouteSection } from './types'
import { ROUTE_PATH } from './consts'
import { lazyPage, buildSidebarNavItems } from './utils'

// Основные страницы
const MainPage = lazyPage(() => import('@/pages/Main/Main'))

const RegistrationPage = lazyPage(() => import('@/pages/Registration/Registration'))
const LoginPage = lazyPage(() => import('@/pages/Login/Login'))
const AboutPage = lazyPage(() => import('@/pages/About/About'))
const NotFoundPage = lazyPage(() => import('@/pages/404/NotFound'))
const ProfilePage = lazyPage(() => import('@/pages/profile/Profile/ui/Profile'))

// Backtest / ML
const BacktestBaselinePage = lazyPage(() => import('@/pages/BacktestBaselinePage/ui/BacktestBaselinePage'))
const BacktestPage = lazyPage(() => import('@/pages/BacktestPage/BacktestPage'))
const BacktestSummaryReportPage = lazyPage(() => import('@/pages/BacktestSummaryReport/ui/BacktestSummaryReportPage'))
const CurrentMLModelPredictionPage = lazyPage(
    () => import('@/pages/CurrentMLModelPredictionPage/CurrentMLModelPredictionPage')
)

// PFI
const PfiPage = lazyPage(() => import('@/pages/PfiPage/ui/PfiPage'))

// TODO-заглушки для будущих страниц статистики моделей и фич
const ModelsStatsPlaceholder = () => <div>TODO: Статистика по моделям (дейли, micro, SL, delayed и т.д.)</div>

// Основная конфигурация маршрутов
export const ROUTE_CONFIG: AppRouteConfig[] = [
    {
        id: AppRoute.MAIN,
        path: ROUTE_PATH[AppRoute.MAIN],
        element: <MainPage />,
        layout: 'app',
        nav: {
            sidebar: false, // главную из сайдбара пока не показываем
            label: 'Главная'
        }
    },

    // ===== МОДЕЛИ =====
    {
        id: AppRoute.CURRENT_PREDICTION,
        path: ROUTE_PATH[AppRoute.CURRENT_PREDICTION],
        element: <CurrentMLModelPredictionPage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Текущий прогноз',
            section: 'models',
            order: 1
        }
    },
    {
        id: AppRoute.MODELS_STATS,
        path: ROUTE_PATH[AppRoute.MODELS_STATS],
        element: <ModelsStatsPlaceholder />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Статистика моделей',
            section: 'models',
            order: 2
        }
    },

    // ===== БЭКТЕСТ =====
    {
        id: AppRoute.BACKTEST_BASELINE,
        path: ROUTE_PATH[AppRoute.BACKTEST_BASELINE],
        element: <BacktestBaselinePage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Baseline бэктест',
            section: 'backtest',
            order: 1
        }
    },
    {
        id: AppRoute.BACKTEST_SUMMARY,
        path: ROUTE_PATH[AppRoute.BACKTEST_SUMMARY],
        element: <BacktestSummaryReportPage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Сводка бэктеста',
            section: 'backtest',
            order: 2
        }
    },
    {
        id: AppRoute.BACKTEST_FULL,
        path: ROUTE_PATH[AppRoute.BACKTEST_FULL],
        element: <BacktestPage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'Экспериментальный бэктест',
            section: 'backtest',
            order: 3
        }
    },

    // ===== PFI =====
    {
        id: AppRoute.PFI_PER_MODEL,
        path: ROUTE_PATH[AppRoute.PFI_PER_MODEL],
        element: <PfiPage />,
        layout: 'app',
        nav: {
            sidebar: true,
            label: 'PFI по моделям',
            section: 'features',
            order: 2
        }
    },

    // ===== ПРОЧЕЕ =====
    {
        id: AppRoute.ABOUT,
        path: ROUTE_PATH[AppRoute.ABOUT],
        element: <AboutPage />,
        layout: 'app',
        nav: {
            sidebar: false,
            label: 'О проекте',
            section: 'system'
        }
    },

    // "Голые" страницы (без layout)
    {
        id: AppRoute.REGISTRATION,
        path: ROUTE_PATH[AppRoute.REGISTRATION],
        element: <RegistrationPage />,
        layout: 'bare',
        nav: {
            sidebar: false,
            label: 'Регистрация',
            section: 'system'
        }
    },
    {
        id: AppRoute.LOGIN,
        path: ROUTE_PATH[AppRoute.LOGIN],
        element: <LoginPage />,
        layout: 'bare',
        nav: {
            sidebar: false,
            label: 'Вход',
            section: 'system'
        }
    },

    {
        id: AppRoute.PROFILE,
        path: ROUTE_PATH[AppRoute.PROFILE],
        element: <ProfilePage />,
        layout: 'app',
        nav: {
            sidebar: false,
            label: 'Профиль',
            section: 'system'
        }
    },
    {
        id: AppRoute.NOT_FOUND,
        path: ROUTE_PATH[AppRoute.NOT_FOUND],
        element: <NotFoundPage />,
        layout: 'app'
    }
]

// Навигация для сайдбара
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = buildSidebarNavItems(ROUTE_CONFIG)

export type { RouteSection }
