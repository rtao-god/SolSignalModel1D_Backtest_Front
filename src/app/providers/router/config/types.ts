import type { RouteProps } from 'react-router'
export enum AppRoute {
    MAIN = 'MAIN',
    CURRENT_PREDICTION = 'CURRENT_PREDICTION',
    CURRENT_PREDICTION_HISTORY = 'CURRENT_PREDICTION_HISTORY',

    DIAGNOSTICS_HOME = 'DIAGNOSTICS_HOME',
    ANALYSIS_HOME = 'ANALYSIS_HOME',

    BACKTEST_BASELINE = 'BACKTEST_BASELINE',
    BACKTEST_SUMMARY = 'BACKTEST_SUMMARY',
    BACKTEST_FULL = 'BACKTEST_FULL',
    BACKTEST_DIAGNOSTICS = 'BACKTEST_DIAGNOSTICS',
    BACKTEST_DIAGNOSTICS_GUARDRAIL = 'BACKTEST_DIAGNOSTICS_GUARDRAIL',
    BACKTEST_DIAGNOSTICS_DECISIONS = 'BACKTEST_DIAGNOSTICS_DECISIONS',
    BACKTEST_DIAGNOSTICS_HOTSPOTS = 'BACKTEST_DIAGNOSTICS_HOTSPOTS',
    BACKTEST_DIAGNOSTICS_OTHER = 'BACKTEST_DIAGNOSTICS_OTHER',
    BACKTEST_DIAGNOSTICS_RATINGS = 'BACKTEST_DIAGNOSTICS_RATINGS',
    BACKTEST_DIAGNOSTICS_DAYSTATS = 'BACKTEST_DIAGNOSTICS_DAYSTATS',
    BACKTEST_POLICY_BRANCH_MEGA = 'BACKTEST_POLICY_BRANCH_MEGA',
    BACKTEST_CONFIDENCE_RISK = 'BACKTEST_CONFIDENCE_RISK',
    BACKTEST_EXECUTION_PIPELINE = 'BACKTEST_EXECUTION_PIPELINE',

    PFI_PER_MODEL = 'PFI_PER_MODEL',

    MODELS_STATS = 'MODELS_STATS',
    AGGREGATION_STATS = 'AGGREGATION_STATS',
    FEATURES_STATS = 'FEATURES_STATS',
    DOCS = 'DOCS',
    DOCS_MODELS = 'DOCS_MODELS',
    DOCS_TESTS = 'DOCS_TESTS',
    EXPLAIN = 'EXPLAIN',
    EXPLAIN_MODELS = 'EXPLAIN_MODELS',
    EXPLAIN_BRANCHES = 'EXPLAIN_BRANCHES',
    EXPLAIN_SPLITS = 'EXPLAIN_SPLITS',
    EXPLAIN_PROJECT = 'EXPLAIN_PROJECT',
    EXPLAIN_TIME = 'EXPLAIN_TIME',
    EXPLAIN_FEATURES = 'EXPLAIN_FEATURES',

    ABOUT = 'ABOUT',
    CONTACT = 'CONTACT',
    REGISTRATION = 'REGISTRATION',
    LOGIN = 'LOGIN',
    PROFILE = 'PROFILE',
    NOT_FOUND = 'NOT_FOUND'
}
export type RouteLayout = 'app' | 'bare'
export type RouteSection =
    | 'predictions'
    | 'models'
    | 'backtest'
    | 'analysis'
    | 'diagnostics'
    | 'features'
    | 'docs'
    | 'explain'
    | 'system'

export interface RouteNavMeta {
    sidebar?: boolean // показывать ли в сайдбаре
    navbar?: boolean // показывать ли в верхнем navbar
    label: string // подпись в меню
    section?: RouteSection // группа (Прогнозы / Модели / Бэктест / Фичи / Docs / System)
    order?: number // порядок внутри группы (сайдбар)
    navbarOrder?: number // порядок в navbar
}
export type AppRouteConfig = RouteProps & {
    id: AppRoute
    path: string
    element: JSX.Element
    nav?: RouteNavMeta
    layout?: RouteLayout
    loadingTitle?: string
}
export interface SidebarNavItem {
    id: AppRoute
    path: string
    label: string
    section?: RouteSection
    order: number
}
export interface NavbarNavItem {
    id: AppRoute
    path: string
    label: string
    order: number
}

