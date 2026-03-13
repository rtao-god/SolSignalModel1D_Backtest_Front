export type ErrorDomain =
    | 'dev_infra'
    | 'asset_contract'
    | 'route_runtime'
    | 'ui_section'
    | 'api_transport'
    | 'backend_contract'
    | 'app_runtime'

export interface ErrorDomainContext {
    source?: string
    domain?: ErrorDomain
    extra?: Record<string, unknown>
}

const DEV_INFRA_PATTERNS = [
    /failed to connect to websocket/i,
    /websocket connection to .*:5173/i,
    /@vite\/client/i,
    /\[vite\]/i,
    /localhost:5173/i,
    /vite\.svg/i
]

const ASSET_CONTRACT_PATTERNS = [
    /does not provide an export named/i,
    /failed to fetch dynamically imported module/i,
    /cannot find module/i,
    /loading namespace .* failed/i,
    /failed loading \/locales\//i
]

const API_TRANSPORT_PATTERNS = [/failed to fetch/i, /networkerror/i, /err_connection_refused/i, /err_network_changed/i]

const BACKEND_CONTRACT_PATTERNS = [
    /\[api\./i,
    /\[report-storage\]/i,
    /schema/i,
    /contract/i,
    /canonical/i,
    /generatedatutc/i
]

function buildComparableErrorText(error: Error, source?: string, extra?: Record<string, unknown>): string {
    const extraText =
        extra ?
            Object.values(extra)
                .map(value => String(value ?? ''))
                .join(' ')
        :   ''

    return `${source ?? ''} ${error.name} ${error.message} ${extraText}`.trim()
}

/**
 * Классифицирует runtime/logging событие по домену ответственности.
 * Домен нужен для единых правил логирования и для решения,
 * должно ли событие поднимать пользовательский runtime surface.
 */
export function resolveErrorDomain(error: Error, context?: ErrorDomainContext): ErrorDomain {
    if (context?.domain) {
        return context.domain
    }

    const source = context?.source ?? ''
    const comparableText = buildComparableErrorText(error, source, context?.extra)

    if (source === 'route-chunk-prefetch' || source === 'lazy-route-import' || source === 'layout-error-boundary') {
        return 'route_runtime'
    }

    if (source === 'route-data-prefetch') {
        return 'api_transport'
    }

    if (source === 'section-data-state' || source === 'section-error-boundary') {
        return 'ui_section'
    }

    if (
        source.startsWith('report-tooltip-') ||
        source === 'term-tooltip-registry' ||
        source === 'shared-terms-registry'
    ) {
        return 'app_runtime'
    }

    if (
        DEV_INFRA_PATTERNS.some(pattern => pattern.test(comparableText)) ||
        (source === 'window.onerror' && /err_connection_refused|err_network_changed/i.test(comparableText))
    ) {
        return 'dev_infra'
    }

    if (ASSET_CONTRACT_PATTERNS.some(pattern => pattern.test(comparableText))) {
        return 'asset_contract'
    }

    if (API_TRANSPORT_PATTERNS.some(pattern => pattern.test(comparableText))) {
        return 'api_transport'
    }

    if (BACKEND_CONTRACT_PATTERNS.some(pattern => pattern.test(comparableText))) {
        return 'backend_contract'
    }

    return 'app_runtime'
}

/**
 * Определяет, должен ли домен ошибки поднимать runtime banner/overlay.
 * Dev-infra события логируются отдельно и не подменяют собой ошибки приложения.
 */
export function shouldSurfaceRuntimeError(domain: ErrorDomain): boolean {
    return domain !== 'dev_infra'
}
