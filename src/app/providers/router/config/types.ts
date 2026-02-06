import type { RouteProps } from 'react-router'

/*
    types — контракт навигации и маршрутов.

    Зачем:
        - Даёт единый набор id/секций для navbar/sidebar.
        - Фиксирует структуру AppRouteConfig.
*/

// Логические идентификаторы маршрутов
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

    PFI_PER_MODEL = 'PFI_PER_MODEL',

    MODELS_STATS = 'MODELS_STATS',
    AGGREGATION_STATS = 'AGGREGATION_STATS',
    FEATURES_STATS = 'FEATURES_STATS',

    // Документация / описания проекта
    DOCS = 'DOCS',
    DOCS_MODELS = 'DOCS_MODELS',
    DOCS_TESTS = 'DOCS_TESTS',

    ABOUT = 'ABOUT',
    CONTACT = 'CONTACT',
    REGISTRATION = 'REGISTRATION',
    LOGIN = 'LOGIN',
    PROFILE = 'PROFILE',
    NOT_FOUND = 'NOT_FOUND'
}

// Какие layout'ы бывают
export type RouteLayout = 'app' | 'bare'

// Логические группы для сайдбара
export type RouteSection =
    | 'predictions'
    | 'models'
    | 'backtest'
    | 'analysis'
    | 'diagnostics'
    | 'features'
    | 'docs'
    | 'system'

export interface RouteNavMeta {
    sidebar?: boolean // показывать ли в сайдбаре
    navbar?: boolean // показывать ли в верхнем navbar
    label: string // подпись в меню
    section?: RouteSection // группа (Прогнозы / Модели / Бэктест / Фичи / Docs / System)
    order?: number // порядок внутри группы (сайдбар)
    navbarOrder?: number // порядок в navbar
}

// Базовый тип конфигурации маршрута
export type AppRouteConfig = RouteProps & {
    id: AppRoute
    path: string
    element: JSX.Element
    nav?: RouteNavMeta
    layout?: RouteLayout
    // Текст для PageLoader (если нужен локальный Suspense на страницу)
    loadingTitle?: string
}

// Элемент навигации сайдбара
export interface SidebarNavItem {
    id: AppRoute
    path: string
    label: string
    section?: RouteSection
    order: number
}

// Элемент навигации navbar
export interface NavbarNavItem {
    id: AppRoute
    path: string
    label: string
    order: number
}
