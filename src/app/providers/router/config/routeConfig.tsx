import { AppRoute, AppRouteConfig, SidebarNavItem, RouteSection, NavbarNavItem } from './types'
import { ROUTE_PATH } from './consts'
import { lazyPage } from './utils/lazyPage'
import { buildSidebarNavItems } from './utils/buildSidebarNavItems'
const importMainPage = () => import('@/pages/Main')
const MainPage = lazyPage(importMainPage)
const importModelStatsPage = () => import('@/pages/ModelStatsPage')
const ModelStatsPage = lazyPage(importModelStatsPage)
const importAggregationStatsPage = () => import('@/pages/AggregationStatsPage')
const AggregationStatsPage = lazyPage(importAggregationStatsPage)
const importRegistrationPage = () => import('@/pages/Registration')
const RegistrationPage = lazyPage(importRegistrationPage)
const importLoginPage = () => import('@/pages/Login')
const LoginPage = lazyPage(importLoginPage)
const importAboutPage = () => import('@/pages/About')
const AboutPage = lazyPage(importAboutPage)
const importContactPage = () => import('@/pages/ContactPage')
const ContactPage = lazyPage(importContactPage)
const importNotFoundPage = () => import('@/pages/404')
const NotFoundPage = lazyPage(importNotFoundPage)
const importProfilePage = () => import('@/pages/profile/Profile')
const ProfilePage = lazyPage(importProfilePage)
const importDiagnosticsHomePage = () => import('@/pages/diagnosticsPages/ui/DiagnosticsPage')
const DiagnosticsHomePage = lazyPage(importDiagnosticsHomePage)
const importAnalysisHomePage = () => import('@/pages/analysisPages/ui/AnalysisPage')
const AnalysisHomePage = lazyPage(importAnalysisHomePage)
const importBacktestBaselinePage = () => import('@/pages/BacktestBaselinePage')
const BacktestBaselinePage = lazyPage(importBacktestBaselinePage)
const importBacktestPage = () => import('@/pages/BacktestPage')
const BacktestPage = lazyPage(importBacktestPage)
const importBacktestSummaryReportPage = () => import('@/pages/BacktestSummaryReport')
const BacktestSummaryReportPage = lazyPage(importBacktestSummaryReportPage)
const importBacktestDiagnosticsPage = () =>
    import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsPage/ui/BacktestDiagnosticsPage')
const BacktestDiagnosticsPage = lazyPage(importBacktestDiagnosticsPage)
const importBacktestDiagnosticsGuardrailPage = () =>
    import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsGuardrailPage/ui/BacktestDiagnosticsGuardrailPage')
const BacktestDiagnosticsGuardrailPage = lazyPage(importBacktestDiagnosticsGuardrailPage)
const importBacktestDiagnosticsDecisionsPage = () =>
    import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsDecisionsPage/ui/BacktestDiagnosticsDecisionsPage')
const BacktestDiagnosticsDecisionsPage = lazyPage(importBacktestDiagnosticsDecisionsPage)
const importBacktestDiagnosticsHotspotsPage = () =>
    import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsHotspotsPage/ui/BacktestDiagnosticsHotspotsPage')
const BacktestDiagnosticsHotspotsPage = lazyPage(importBacktestDiagnosticsHotspotsPage)
const importBacktestDiagnosticsOtherPage = () =>
    import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsOtherPage/ui/BacktestDiagnosticsOtherPage')
const BacktestDiagnosticsOtherPage = lazyPage(importBacktestDiagnosticsOtherPage)
const importBacktestDiagnosticsRatingsPage = () =>
    import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsRatingsPage/ui/BacktestDiagnosticsRatingsPage')
const BacktestDiagnosticsRatingsPage = lazyPage(importBacktestDiagnosticsRatingsPage)
const importBacktestDiagnosticsDayStatsPage = () =>
    import('@/pages/diagnosticsPages/ui/BacktestDiagnosticsDayStatsPage/ui/BacktestDiagnosticsDayStatsPage')
const BacktestDiagnosticsDayStatsPage = lazyPage(importBacktestDiagnosticsDayStatsPage)
const importPolicyBranchMegaPage = () => import('@/pages/analysisPages/ui/PolicyBranchMegaPage')
const PolicyBranchMegaPage = lazyPage(importPolicyBranchMegaPage)
const importConfidenceRiskPage = () => import('@/pages/analysisPages/ui/ConfidenceRiskPage')
const ConfidenceRiskPage = lazyPage(importConfidenceRiskPage)
const importExecutionPipelinePage = () => import('@/pages/analysisPages/ui/ExecutionPipelinePage')
const ExecutionPipelinePage = lazyPage(importExecutionPipelinePage)
const importCurrentMLModelPredictionPage = () => import('@/pages/predictions/ui/CurrentMLModelPredictionPage')
const CurrentMLModelPredictionPage = lazyPage(importCurrentMLModelPredictionPage)
const importPredictionHistoryPage = () => import('@/pages/predictions/ui/PredictionHistoryPage')
const PredictionHistoryPage = lazyPage(importPredictionHistoryPage)
const importPfiPage = () => import('@/pages/PfiPage')
const PfiPage = lazyPage(importPfiPage)
const importDocsPage = () => import('@/pages/docsPages/ui/DocsPage')
const DocsPage = lazyPage(importDocsPage)
const importDocsModelsPage = () => import('@/pages/docsPages/ui/DocsModelsPage')
const DocsModelsPage = lazyPage(importDocsModelsPage)
const importDocsTestsPage = () => import('@/pages/docsPages/ui/DocsTestsPage')
const DocsTestsPage = lazyPage(importDocsTestsPage)
const importDocsTruthfulnessPage = () => import('@/pages/docsPages/ui/DocsTruthfulnessPage')
const DocsTruthfulnessPage = lazyPage(importDocsTruthfulnessPage)
const importExplainPage = () => import('@/pages/explainPages/ui/ExplainPage')
const ExplainPage = lazyPage(importExplainPage)
const importExplainModelsPage = () => import('@/pages/explainPages/ui/ExplainModelsPage')
const ExplainModelsPage = lazyPage(importExplainModelsPage)
const importExplainBranchesPage = () => import('@/pages/explainPages/ui/ExplainBranchesPage')
const ExplainBranchesPage = lazyPage(importExplainBranchesPage)
const importExplainSplitsPage = () => import('@/pages/explainPages/ui/ExplainSplitsPage')
const ExplainSplitsPage = lazyPage(importExplainSplitsPage)
const importExplainProjectPage = () => import('@/pages/explainPages/ui/ExplainProjectPage')
const ExplainProjectPage = lazyPage(importExplainProjectPage)
const importExplainTimePage = () => import('@/pages/explainPages/ui/ExplainTimePage')
const ExplainTimePage = lazyPage(importExplainTimePage)
const importExplainFeaturesPage = () => import('@/pages/explainPages/ui/ExplainFeaturesPage')
const ExplainFeaturesPage = lazyPage(importExplainFeaturesPage)
export const ROUTE_CONFIG: AppRouteConfig[] = [
    {
        id: AppRoute.MAIN,
        path: ROUTE_PATH[AppRoute.MAIN],
        element: <MainPage />,
        layout: 'app',
        loadingTitle: 'Loading main page',
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
        loadingTitle: 'Loading diagnostics',
        nav: {
            sidebar: false,
            navbar: true,
            label: 'Diagnostics',
            section: 'diagnostics',
            navbarOrder: 1
        }
    },
    {
        id: AppRoute.ANALYSIS_HOME,
        path: ROUTE_PATH[AppRoute.ANALYSIS_HOME],
        element: <AnalysisHomePage />,
        layout: 'app',
        loadingTitle: 'Loading analysis',
        nav: {
            sidebar: false,
            navbar: true,
            label: 'Analysis',
            section: 'analysis',
            navbarOrder: 2
        }
    },
    {
        id: AppRoute.CURRENT_PREDICTION,
        path: ROUTE_PATH[AppRoute.CURRENT_PREDICTION],
        element: <CurrentMLModelPredictionPage />,
        layout: 'app',
        loadingTitle: 'Loading current prediction',
        nav: {
            sidebar: true,
            label: 'Current prediction',
            section: 'predictions',
            order: 1
        }
    },
    {
        id: AppRoute.CURRENT_PREDICTION_HISTORY,
        path: ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY],
        element: <PredictionHistoryPage />,
        layout: 'app',
        loadingTitle: 'Loading prediction history',
        nav: {
            sidebar: true,
            label: 'Prediction history',
            section: 'predictions',
            order: 2
        }
    },
    {
        id: AppRoute.MODELS_STATS,
        path: ROUTE_PATH[AppRoute.MODELS_STATS],
        element: <ModelStatsPage />,
        layout: 'app',
        loadingTitle: 'Loading model statistics',
        nav: {
            sidebar: true,
            label: 'Model statistics',
            section: 'models',
            order: 1
        }
    },
    {
        id: AppRoute.AGGREGATION_STATS,
        path: ROUTE_PATH[AppRoute.AGGREGATION_STATS],
        element: <AggregationStatsPage />,
        layout: 'app',
        loadingTitle: 'Loading prediction aggregation',
        nav: {
            sidebar: true,
            label: 'Prediction aggregation',
            section: 'models',
            order: 2
        }
    },
    {
        id: AppRoute.BACKTEST_BASELINE,
        path: ROUTE_PATH[AppRoute.BACKTEST_BASELINE],
        element: <BacktestBaselinePage />,
        layout: 'app',
        loadingTitle: 'Loading baseline backtest',
        nav: {
            sidebar: true,
            label: 'Baseline backtest',
            section: 'backtest',
            order: 1
        }
    },
    {
        id: AppRoute.BACKTEST_SUMMARY,
        path: ROUTE_PATH[AppRoute.BACKTEST_SUMMARY],
        element: <BacktestSummaryReportPage />,
        layout: 'app',
        loadingTitle: 'Loading backtest summary',
        nav: {
            sidebar: true,
            label: 'Backtest summary',
            section: 'backtest',
            order: 2
        }
    },
    {
        id: AppRoute.BACKTEST_FULL,
        path: ROUTE_PATH[AppRoute.BACKTEST_FULL],
        element: <BacktestPage />,
        layout: 'app',
        loadingTitle: 'Loading experimental backtest',
        nav: {
            sidebar: true,
            label: 'Experimental backtest',
            section: 'backtest',
            order: 3
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_RATINGS,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_RATINGS],
        element: <BacktestDiagnosticsRatingsPage />,
        layout: 'app',
        loadingTitle: 'Loading backtest ratings',
        nav: {
            sidebar: true,
            label: 'Policy ratings',
            section: 'analysis',
            order: 1
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS],
        element: <BacktestDiagnosticsPage />,
        layout: 'app',
        loadingTitle: 'Loading risk and liquidations diagnostics',
        nav: {
            sidebar: true,
            label: 'Risk and liquidations',
            section: 'diagnostics',
            order: 1
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL],
        element: <BacktestDiagnosticsGuardrailPage />,
        layout: 'app',
        loadingTitle: 'Loading guardrail diagnostics',
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
        loadingTitle: 'Loading decision analysis',
        nav: {
            sidebar: true,
            label: 'Decisions / Attribution',
            section: 'diagnostics',
            order: 3
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS],
        element: <BacktestDiagnosticsHotspotsPage />,
        layout: 'app',
        loadingTitle: 'Loading hotspots diagnostics',
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
        loadingTitle: 'Loading additional diagnostics',
        nav: {
            sidebar: true,
            label: 'Other diagnostics',
            section: 'diagnostics',
            order: 5
        }
    },
    {
        id: AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS,
        path: ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS],
        element: <BacktestDiagnosticsDayStatsPage />,
        layout: 'app',
        loadingTitle: 'Loading day statistics',
        nav: {
            sidebar: true,
            label: 'Day statistics',
            section: 'analysis',
            order: 2
        }
    },
    {
        id: AppRoute.BACKTEST_POLICY_BRANCH_MEGA,
        path: ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA],
        element: <PolicyBranchMegaPage />,
        layout: 'app',
        loadingTitle: 'Loading Policy Branch Mega',
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
        loadingTitle: 'Loading confidence statistics',
        nav: {
            sidebar: true,
            label: 'Confidence statistics',
            section: 'analysis',
            order: 3
        }
    },
    {
        id: AppRoute.BACKTEST_EXECUTION_PIPELINE,
        path: ROUTE_PATH[AppRoute.BACKTEST_EXECUTION_PIPELINE],
        element: <ExecutionPipelinePage />,
        layout: 'app',
        loadingTitle: 'Loading execution pipeline',
        nav: {
            sidebar: true,
            label: 'Execution pipeline',
            section: 'analysis',
            order: 5
        }
    },
    {
        id: AppRoute.PFI_PER_MODEL,
        path: ROUTE_PATH[AppRoute.PFI_PER_MODEL],
        element: <PfiPage />,
        layout: 'app',
        loadingTitle: 'Loading PFI report',
        nav: {
            sidebar: true,
            label: 'PFI by models',
            section: 'features',
            order: 2
        }
    },
    {
        id: AppRoute.DOCS,
        path: ROUTE_PATH[AppRoute.DOCS],
        element: <DocsPage />,
        layout: 'app',
        loadingTitle: 'Loading documentation',
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
        loadingTitle: 'Loading model documentation',
        nav: {
            sidebar: true,
            label: 'Models',
            section: 'docs',
            order: 1
        }
    },
    {
        id: AppRoute.DOCS_TESTS,
        path: ROUTE_PATH[AppRoute.DOCS_TESTS],
        element: <DocsTestsPage />,
        layout: 'app',
        loadingTitle: 'Loading test documentation',
        nav: {
            sidebar: true,
            label: 'Tests',
            section: 'docs',
            order: 2
        }
    },
    {
        id: AppRoute.DOCS_TRUTHFULNESS,
        path: ROUTE_PATH[AppRoute.DOCS_TRUTHFULNESS],
        element: <DocsTruthfulnessPage />,
        layout: 'app',
        loadingTitle: 'Loading truthfulness documentation',
        nav: {
            sidebar: true,
            label: 'Truthfulness',
            section: 'docs',
            order: 3
        }
    },
    {
        id: AppRoute.EXPLAIN,
        path: ROUTE_PATH[AppRoute.EXPLAIN],
        element: <ExplainPage />,
        layout: 'app',
        loadingTitle: 'Loading project explain section',
        nav: {
            sidebar: false,
            navbar: true,
            label: 'Explain',
            section: 'explain',
            navbarOrder: 4
        }
    },
    {
        id: AppRoute.EXPLAIN_MODELS,
        path: ROUTE_PATH[AppRoute.EXPLAIN_MODELS],
        element: <ExplainModelsPage />,
        layout: 'app',
        loadingTitle: 'Loading model explanation',
        nav: {
            sidebar: true,
            label: 'Models',
            section: 'explain',
            order: 1
        }
    },
    {
        id: AppRoute.EXPLAIN_BRANCHES,
        path: ROUTE_PATH[AppRoute.EXPLAIN_BRANCHES],
        element: <ExplainBranchesPage />,
        layout: 'app',
        loadingTitle: 'Loading branch explanation',
        nav: {
            sidebar: true,
            label: 'BASE/ANTI-D branches',
            section: 'explain',
            order: 2
        }
    },
    {
        id: AppRoute.EXPLAIN_SPLITS,
        path: ROUTE_PATH[AppRoute.EXPLAIN_SPLITS],
        element: <ExplainSplitsPage />,
        layout: 'app',
        loadingTitle: 'Loading split explanation',
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
        loadingTitle: 'Loading project overview',
        nav: {
            sidebar: true,
            label: 'Project overview',
            section: 'explain',
            order: 4
        }
    },
    {
        id: AppRoute.EXPLAIN_TIME,
        path: ROUTE_PATH[AppRoute.EXPLAIN_TIME],
        element: <ExplainTimePage />,
        layout: 'app',
        loadingTitle: 'Loading time explanation',
        nav: {
            sidebar: true,
            label: 'Time and days',
            section: 'explain',
            order: 5
        }
    },
    {
        id: AppRoute.EXPLAIN_FEATURES,
        path: ROUTE_PATH[AppRoute.EXPLAIN_FEATURES],
        element: <ExplainFeaturesPage />,
        layout: 'app',
        loadingTitle: 'Loading feature explanation',
        nav: {
            sidebar: true,
            label: 'Features and indicators',
            section: 'explain',
            order: 6
        }
    },
    {
        id: AppRoute.ABOUT,
        path: ROUTE_PATH[AppRoute.ABOUT],
        element: <AboutPage />,
        layout: 'app',
        loadingTitle: 'Loading About page',
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
        loadingTitle: 'Loading contact page',
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
        loadingTitle: 'Loading registration page',
        nav: {
            sidebar: false,
            label: 'Registration',
            section: 'system'
        }
    },
    {
        id: AppRoute.LOGIN,
        path: ROUTE_PATH[AppRoute.LOGIN],
        element: <LoginPage />,
        layout: 'bare',
        loadingTitle: 'Loading login page',
        nav: {
            sidebar: false,
            label: 'Login',
            section: 'system'
        }
    },

    {
        id: AppRoute.PROFILE,
        path: ROUTE_PATH[AppRoute.PROFILE],
        element: <ProfilePage />,
        layout: 'app',
        loadingTitle: 'Loading profile',
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
        loadingTitle: 'Loading page'
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

const ROUTE_PREFETCHERS: Partial<Record<AppRoute, () => Promise<unknown>>> = {
    [AppRoute.MAIN]: importMainPage,
    [AppRoute.CURRENT_PREDICTION]: importCurrentMLModelPredictionPage,
    [AppRoute.CURRENT_PREDICTION_HISTORY]: importPredictionHistoryPage,
    [AppRoute.DIAGNOSTICS_HOME]: importDiagnosticsHomePage,
    [AppRoute.ANALYSIS_HOME]: importAnalysisHomePage,
    [AppRoute.BACKTEST_BASELINE]: importBacktestBaselinePage,
    [AppRoute.BACKTEST_SUMMARY]: importBacktestSummaryReportPage,
    [AppRoute.BACKTEST_FULL]: importBacktestPage,
    [AppRoute.BACKTEST_DIAGNOSTICS]: importBacktestDiagnosticsPage,
    [AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]: importBacktestDiagnosticsGuardrailPage,
    [AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]: importBacktestDiagnosticsDecisionsPage,
    [AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]: importBacktestDiagnosticsHotspotsPage,
    [AppRoute.BACKTEST_DIAGNOSTICS_OTHER]: importBacktestDiagnosticsOtherPage,
    [AppRoute.BACKTEST_DIAGNOSTICS_RATINGS]: importBacktestDiagnosticsRatingsPage,
    [AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS]: importBacktestDiagnosticsDayStatsPage,
    [AppRoute.BACKTEST_POLICY_BRANCH_MEGA]: importPolicyBranchMegaPage,
    [AppRoute.BACKTEST_CONFIDENCE_RISK]: importConfidenceRiskPage,
    [AppRoute.BACKTEST_EXECUTION_PIPELINE]: importExecutionPipelinePage,
    [AppRoute.PFI_PER_MODEL]: importPfiPage,
    [AppRoute.MODELS_STATS]: importModelStatsPage,
    [AppRoute.AGGREGATION_STATS]: importAggregationStatsPage,
    [AppRoute.DOCS]: importDocsPage,
    [AppRoute.DOCS_MODELS]: importDocsModelsPage,
    [AppRoute.DOCS_TESTS]: importDocsTestsPage,
    [AppRoute.DOCS_TRUTHFULNESS]: importDocsTruthfulnessPage,
    [AppRoute.EXPLAIN]: importExplainPage,
    [AppRoute.EXPLAIN_MODELS]: importExplainModelsPage,
    [AppRoute.EXPLAIN_BRANCHES]: importExplainBranchesPage,
    [AppRoute.EXPLAIN_SPLITS]: importExplainSplitsPage,
    [AppRoute.EXPLAIN_PROJECT]: importExplainProjectPage,
    [AppRoute.EXPLAIN_TIME]: importExplainTimePage,
    [AppRoute.EXPLAIN_FEATURES]: importExplainFeaturesPage,
    [AppRoute.ABOUT]: importAboutPage,
    [AppRoute.CONTACT]: importContactPage,
    [AppRoute.REGISTRATION]: importRegistrationPage,
    [AppRoute.LOGIN]: importLoginPage,
    [AppRoute.PROFILE]: importProfilePage,
    [AppRoute.NOT_FOUND]: importNotFoundPage
}

export function prefetchRouteChunk(routeId: AppRoute): void {
    const prefetcher = ROUTE_PREFETCHERS[routeId]
    if (!prefetcher) {
        return
    }

    void prefetcher()
}

export type { RouteSection }
