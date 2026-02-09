import { AppRoute, AppRouteConfig, SidebarNavItem, RouteSection, NavbarNavItem } from './types'
import { ROUTE_PATH } from './consts'
import { lazyPage } from './utils/lazyPage'
import { buildSidebarNavItems } from './utils/buildSidebarNavItems'
const MainPage = lazyPage(() => import('@/pages/Main'))

const ModelStatsPage = lazyPage(() => import('@/pages/ModelStatsPage'))
const AggregationStatsPage = lazyPage(() => import('@/pages/AggregationStatsPage'))
const RegistrationPage = lazyPage(() => import('@/pages/Registration'))
const LoginPage = lazyPage(() => import('@/pages/Login'))
const AboutPage = lazyPage(() => import('@/pages/About'))
const ContactPage = lazyPage(() => import('@/pages/ContactPage'))
const NotFoundPage = lazyPage(() => import('@/pages/404'))
const ProfilePage = lazyPage(() => import('@/pages/profile/Profile'))
const DiagnosticsHomePage = lazyPage(() => import('@/pages/diagnosticsPages/ui/DiagnosticsPage'))
const AnalysisHomePage = lazyPage(() => import('@/pages/analysisPages/ui/AnalysisPage'))
const BacktestBaselinePage = lazyPage(() => import('@/pages/BacktestBaselinePage'))
const BacktestPage = lazyPage(() => import('@/pages/BacktestPage'))
const BacktestSummaryReportPage = lazyPage(() => import('@/pages/BacktestSummaryReport'))
const BacktestDiagnosticsPage = lazyPage(
    () => import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsPage/ui/BacktestDiagnosticsPage')
)
const BacktestDiagnosticsGuardrailPage = lazyPage(
    () => import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsGuardrailPage/ui/BacktestDiagnosticsGuardrailPage')
)
const BacktestDiagnosticsDecisionsPage = lazyPage(
    () => import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsDecisionsPage/ui/BacktestDiagnosticsDecisionsPage')
)
const BacktestDiagnosticsHotspotsPage = lazyPage(
    () => import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsHotspotsPage/ui/BacktestDiagnosticsHotspotsPage')
)
const BacktestDiagnosticsOtherPage = lazyPage(
    () => import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsOtherPage/ui/BacktestDiagnosticsOtherPage')
)
const BacktestDiagnosticsRatingsPage = lazyPage(
    () => import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsRatingsPage/ui/BacktestDiagnosticsRatingsPage')
)
const BacktestDiagnosticsDayStatsPage = lazyPage(
    () => import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsDayStatsPage/ui/BacktestDiagnosticsDayStatsPage')
)
const PolicyBranchMegaPage = lazyPage(
    () => import('@/pages/analysisPages/ui/PolicyBranchMegaPage')
)
const ConfidenceRiskPage = lazyPage(
    () => import('@/pages/analysisPages/ui/ConfidenceRiskPage')
)
const CurrentMLModelPredictionPage = lazyPage(
    () => import('@/pages/predictions/ui/CurrentMLModelPredictionPage')
)
const PredictionHistoryPage = lazyPage(() => import('@/pages/predictions/ui/PredictionHistoryPage'))
const PfiPage = lazyPage(() => import('@/pages/PfiPage'))
const DocsPage = lazyPage(() => import('@/pages/docsPages/ui/DocsPage'))
const DocsModelsPage = lazyPage(() => import('@/pages/docsPages/ui/DocsModelsPage'))
const DocsTestsPage = lazyPage(() => import('@/pages/docsPages/ui/DocsTestsPage'))
const ExplainPage = lazyPage(() => import('@/pages/explainPages/ui/ExplainPage'))
const ExplainModelsPage = lazyPage(() => import('@/pages/explainPages/ui/ExplainModelsPage'))
const ExplainBranchesPage = lazyPage(() => import('@/pages/explainPages/ui/ExplainBranchesPage'))
const ExplainSplitsPage = lazyPage(() => import('@/pages/explainPages/ui/ExplainSplitsPage'))
const ExplainProjectPage = lazyPage(() => import('@/pages/explainPages/ui/ExplainProjectPage'))
const ExplainTimePage = lazyPage(() => import('@/pages/explainPages/ui/ExplainTimePage'))
const ExplainFeaturesPage = lazyPage(() => import('@/pages/explainPages/ui/ExplainFeaturesPage'))
export const ROUTE_CONFIG: AppRouteConfig[] = [
    {
        id: AppRoute.MAIN,
        path: ROUTE_PATH[AppRoute.MAIN],
        element: <MainPage />,
        layout: 'app',
        loadingTitle: 'Загружаю главную страницу',
        nav: {
            sidebar: false, // главную из сайдбара пока не показываем
            navbar: true,
            label: 'Main',
            navbarOrder: 0
        }
    },
    {
        id: AppRoute.DIAGNOSTICS_HOME,
        path: ROUTE_PATH[AppRoute.DIAGNOSTICS_HOME],
        element: <DiagnosticsHomePage />,
        layout: 'app',
        loadingTitle: 'Загружаю диагностику',
        nav: {
            sidebar: false,
            navbar: true,
            label: 'Диагностика',
            section: 'diagnostics',
            navbarOrder: 1
        }
    },
    {
        id: AppRoute.ANALYSIS_HOME,
        path: ROUTE_PATH[AppRoute.ANALYSIS_HOME],
        element: <AnalysisHomePage />,
        layout: 'app',
        loadingTitle: 'Загружаю анализ',
        nav: {
            sidebar: false,
            navbar: true,
            label: 'Анализ',
            section: 'analysis',
            navbarOrder: 2
        }
    },
    {
        id: AppRoute.CURRENT_PREDICTION,
        path: ROUTE_PATH[AppRoute.CURRENT_PREDICTION],
        element: <CurrentMLModelPredictionPage />,
        layout: 'app',
        loadingTitle: 'Загружаю текущий прогноз',
        nav: {
            sidebar: true,
            label: 'Текущий прогноз',
            section: 'predictions',
            order: 1
        }
    },
    {
        id: AppRoute.CURRENT_PREDICTION_HISTORY,
        path: ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY],
        element: <PredictionHistoryPage />,
        layout: 'app',
        loadingTitle: 'Загружаю историю прогнозов',
        nav: {
            sidebar: true,
            label: 'История прогнозов',
            section: 'predictions',
            order: 2
        }
    },
    {
        id: AppRoute.MODELS_STATS,
        path: ROUTE_PATH[AppRoute.MODELS_STATS],
        element: <ModelStatsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю статистику моделей',
        nav: {
            sidebar: true,
            label: 'Статистика моделей',
            section: 'models',
            order: 1
        }
    },
    {
        id: AppRoute.AGGREGATION_STATS,
        path: ROUTE_PATH[AppRoute.AGGREGATION_STATS],
        element: <AggregationStatsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю агрегацию прогнозов',
        nav: {
            sidebar: true,
            label: 'Агрегация прогнозов',
            section: 'models',
            order: 2
        }
    },
    {
        id: AppRoute.BACKTEST_BASELINE,
        path: ROUTE_PATH[AppRoute.BACKTEST_BASELINE],
        element: <BacktestBaselinePage />,
        layout: 'app',
        loadingTitle: 'Загружаю baseline бэктеста',
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
        loadingTitle: 'Загружаю сводку бэктеста',
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
        loadingTitle: 'Загружаю экспериментальный бэктест',
        nav: {
            sidebar: true,
            label: 'Экспериментальный бэктест',
            section: 'backtest',
            order: 3
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_RATINGS,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_RATINGS],
        element: <BacktestDiagnosticsRatingsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю рейтинги бэктеста',
        nav: {
            sidebar: true,
            label: 'Рейтинги полисов',
            section: 'analysis',
            order: 1
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS],
        element: <BacktestDiagnosticsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю риск и ликвидации',
        nav: {
            sidebar: true,
            label: 'Риск и ликвидации',
            section: 'diagnostics',
            order: 1
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL],
        element: <BacktestDiagnosticsGuardrailPage />,
        layout: 'app',
        loadingTitle: 'Загружаю guardrail-диагностику',
        nav: {
            sidebar: true,
            label: 'Guardrail / Specificity',
            section: 'diagnostics',
            order: 2
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS],
        element: <BacktestDiagnosticsDecisionsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю анализ решений',
        nav: {
            sidebar: true,
            label: 'Решения / Attribution',
            section: 'diagnostics',
            order: 3
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS],
        element: <BacktestDiagnosticsHotspotsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю hotspots',
        nav: {
            sidebar: true,
            label: 'Hotspots / NoTrade',
            section: 'diagnostics',
            order: 4
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_OTHER,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_OTHER],
        element: <BacktestDiagnosticsOtherPage />,
        layout: 'app',
        loadingTitle: 'Загружаю прочие диагностики',
        nav: {
            sidebar: true,
            label: 'Прочее',
            section: 'diagnostics',
            order: 5
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS],
        element: <BacktestDiagnosticsDayStatsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю статистику по дням',
        nav: {
            sidebar: true,
            label: 'Статистика по дням',
            section: 'analysis',
            order: 2
        }
    },
    {
        id: AppRoute.BACKTEST_POLICY_BRANCH_MEGA,
        path: ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA],
        element: <PolicyBranchMegaPage />,
        layout: 'app',
        loadingTitle: 'Загружаю Policy Branch Mega',
        nav: {
            sidebar: true,
            label: 'Policy Branch Mega',
            section: 'analysis',
            order: 4
        }
    },
    {
        id: AppRoute.BACKTEST_CONFIDENCE_RISK,
        path: ROUTE_PATH[AppRoute.BACKTEST_CONFIDENCE_RISK],
        element: <ConfidenceRiskPage />,
        layout: 'app',
        loadingTitle: 'Загружаю статистику уверенности',
        nav: {
            sidebar: true,
            label: 'Статистика уверенности',
            section: 'analysis',
            order: 3
        }
    },
    {
        id: AppRoute.PFI_PER_MODEL,
        path: ROUTE_PATH[AppRoute.PFI_PER_MODEL],
        element: <PfiPage />,
        layout: 'app',
        loadingTitle: 'Загружаю PFI отчёт',
        nav: {
            sidebar: true,
            label: 'PFI по моделям',
            section: 'features',
            order: 2
        }
    },
    {
        id: AppRoute.DOCS,
        path: ROUTE_PATH[AppRoute.DOCS],
        element: <DocsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю документацию',
        nav: {
            sidebar: false, // НЕ показываем /docs в сайдбаре, только в navbar
            navbar: true,
            label: 'Docs',
            section: 'docs',
            navbarOrder: 3
        }
    },
    {
        id: AppRoute.DOCS_MODELS,
        path: ROUTE_PATH[AppRoute.DOCS_MODELS],
        element: <DocsModelsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю описание моделей',
        nav: {
            sidebar: true,
            label: 'Модели',
            section: 'docs',
            order: 1
        }
    },
    {
        id: AppRoute.DOCS_TESTS,
        path: ROUTE_PATH[AppRoute.DOCS_TESTS],
        element: <DocsTestsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю описание тестов',
        nav: {
            sidebar: true,
            label: 'Тесты',
            section: 'docs',
            order: 2
        }
    },
    {
        id: AppRoute.EXPLAIN,
        path: ROUTE_PATH[AppRoute.EXPLAIN],
        element: <ExplainPage />,
        layout: 'app',
        loadingTitle: 'Загружаю объяснение проекта',
        nav: {
            sidebar: false,
            navbar: true,
            label: 'Объяснение',
            section: 'explain',
            navbarOrder: 4
        }
    },
    {
        id: AppRoute.EXPLAIN_MODELS,
        path: ROUTE_PATH[AppRoute.EXPLAIN_MODELS],
        element: <ExplainModelsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю объяснение моделей',
        nav: {
            sidebar: true,
            label: 'Модели',
            section: 'explain',
            order: 1
        }
    },
    {
        id: AppRoute.EXPLAIN_BRANCHES,
        path: ROUTE_PATH[AppRoute.EXPLAIN_BRANCHES],
        element: <ExplainBranchesPage />,
        layout: 'app',
        loadingTitle: 'Загружаю объяснение веток',
        nav: {
            sidebar: true,
            label: 'Ветки BASE/ANTI-D',
            section: 'explain',
            order: 2
        }
    },
    {
        id: AppRoute.EXPLAIN_SPLITS,
        path: ROUTE_PATH[AppRoute.EXPLAIN_SPLITS],
        element: <ExplainSplitsPage />,
        layout: 'app',
        loadingTitle: 'Загружаю объяснение сплитов',
        nav: {
            sidebar: true,
            label: 'Train/OOS/Recent',
            section: 'explain',
            order: 3
        }
    },
    {
        id: AppRoute.EXPLAIN_PROJECT,
        path: ROUTE_PATH[AppRoute.EXPLAIN_PROJECT],
        element: <ExplainProjectPage />,
        layout: 'app',
        loadingTitle: 'Загружаю описание проекта',
        nav: {
            sidebar: true,
            label: 'О проекте',
            section: 'explain',
            order: 4
        }
    },
    {
        id: AppRoute.EXPLAIN_TIME,
        path: ROUTE_PATH[AppRoute.EXPLAIN_TIME],
        element: <ExplainTimePage />,
        layout: 'app',
        loadingTitle: 'Загружаю объяснение времени',
        nav: {
            sidebar: true,
            label: 'Время и дни',
            section: 'explain',
            order: 5
        }
    },
    {
        id: AppRoute.EXPLAIN_FEATURES,
        path: ROUTE_PATH[AppRoute.EXPLAIN_FEATURES],
        element: <ExplainFeaturesPage />,
        layout: 'app',
        loadingTitle: 'Загружаю описание фич',
        nav: {
            sidebar: true,
            label: 'Фичи и индикаторы',
            section: 'explain',
            order: 6
        }
    },
    {
        id: AppRoute.ABOUT,
        path: ROUTE_PATH[AppRoute.ABOUT],
        element: <AboutPage />,
        layout: 'app',
        loadingTitle: 'Загружаю страницу About',
        nav: {
            sidebar: false,
            navbar: true,
            label: 'About',
            section: 'system',
            navbarOrder: 6
        }
    },
    {
        id: AppRoute.CONTACT,
        path: ROUTE_PATH[AppRoute.CONTACT],
        element: <ContactPage />,
        layout: 'app',
        loadingTitle: 'Загружаю страницу контактов',
        nav: {
            sidebar: false,
            navbar: true,
            label: 'Contact',
            section: 'system',
            navbarOrder: 7
        }
    },
    {
        id: AppRoute.REGISTRATION,
        path: ROUTE_PATH[AppRoute.REGISTRATION],
        element: <RegistrationPage />,
        layout: 'bare',
        loadingTitle: 'Загружаю страницу регистрации',
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
        loadingTitle: 'Загружаю страницу входа',
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
        loadingTitle: 'Загружаю профиль',
        nav: {
            sidebar: false,
            navbar: true,
            label: 'Profile',
            section: 'system',
            navbarOrder: 5
        }
    },
    {
        id: AppRoute.NOT_FOUND,
        path: ROUTE_PATH[AppRoute.NOT_FOUND],
        element: <NotFoundPage />,
        layout: 'app',
        loadingTitle: 'Загружаю страницу'
    }
]
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = buildSidebarNavItems(ROUTE_CONFIG)
export const NAVBAR_ITEMS: NavbarNavItem[] = ROUTE_CONFIG.filter(route => route.nav && route.nav.navbar)
    .map(route => ({
        id: route.id,
        path: route.path,
        label: route.nav!.label,
        order: route.nav!.navbarOrder ?? route.nav!.order ?? 0
    }))
    .sort((a, b) => {
        if (a.order !== b.order) {
            return a.order - b.order
        }
        return a.label.localeCompare(b.label)
    })

export type { RouteSection }

