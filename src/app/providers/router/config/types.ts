import type { RouteProps } from 'react-router'

// Логические идентификаторы маршрутов
export enum AppRoute {
    MAIN = 'MAIN',
    CURRENT_PREDICTION = 'CURRENT_PREDICTION',

    BACKTEST_BASELINE = 'BACKTEST_BASELINE',
    BACKTEST_SUMMARY = 'BACKTEST_SUMMARY',
    BACKTEST_FULL = 'BACKTEST_FULL',

    PFI_PER_MODEL = 'PFI_PER_MODEL',

    MODELS_STATS = 'MODELS_STATS',
    FEATURES_STATS = 'FEATURES_STATS',

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
export type RouteSection = 'models' | 'backtest' | 'features' | 'system'

export interface RouteNavMeta {
    sidebar?: boolean // показывать ли в сайдбаре
    navbar?: boolean // показывать ли в верхнем navbar
    label: string // подпись в меню
    section?: RouteSection // группа (Модели / Бэктест / Фичи / System)
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
