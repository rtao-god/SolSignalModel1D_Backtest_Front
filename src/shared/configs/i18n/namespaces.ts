export const I18N_NAMESPACES = [
    'common',
    'nav',
    'errors',
    'auth',
    'about',
    'reports',
    'tooltips',
    'docs',
    'explain',
    'guide',
    'developer'
] as const

export type I18nNamespace = (typeof I18N_NAMESPACES)[number]
