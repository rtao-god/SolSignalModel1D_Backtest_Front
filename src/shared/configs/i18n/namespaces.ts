export const I18N_NAMESPACES = ['common', 'nav', 'errors', 'auth', 'reports', 'tooltips', 'docs', 'explain'] as const

export type I18nNamespace = (typeof I18N_NAMESPACES)[number]
