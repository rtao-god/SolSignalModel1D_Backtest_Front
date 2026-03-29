import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { logError } from './logError'
import { buildDetailedErrorDetails } from './logError'
import { resolveErrorDomain, shouldSurfaceRuntimeError } from './errorDomains'
import { isLocalizedContentError } from '@/shared/lib/i18n'

let isInitialized = false
let isApplicationBootstrapped = false
const FATAL_ERROR_OVERLAY_ID = 'app-fatal-error-overlay'
const RUNTIME_ERROR_BANNER_ID = 'app-runtime-error-banner'
const boundaryHandledErrors = new WeakSet<Error>()

function buildFatalErrorDetails(error: Error, source: string): string {
    return buildDetailedErrorDetails(error, { source })
}

function buildErrorFromWindowEvent(event: ErrorEvent): Error {
    const directError = event.error
    if (directError instanceof Error) {
        return directError
    }

    const location =
        event.filename ?
            `${event.filename}${event.lineno ? `:${event.lineno}` : ''}${event.colno ? `:${event.colno}` : ''}`
        :   'unknown source'

    return normalizeErrorLike(event.error ?? event.message, 'Unhandled script error.', {
        source: 'window.onerror',
        domain: 'app_runtime',
        owner: 'window.onerror',
        expected: 'Runtime error event should provide an Error instance or a detailed browser message.',
        actual: `location=${location}`,
        requiredAction: 'Inspect the reported script location and throw owner-specific Error instances.',
        extra: {
            location,
            message: event.message || null
        }
    })
}

export function markErrorHandledByBoundary(error: Error): void {
    boundaryHandledErrors.add(error)
}

function isBoundaryHandledError(error: Error): boolean {
    return boundaryHandledErrors.has(error)
}

function removeFatalErrorOverlay(): void {
    if (typeof document === 'undefined') {
        return
    }

    document.getElementById(FATAL_ERROR_OVERLAY_ID)?.remove()
}

function buildErrorSurfaceDetails(error: Error, source: string): string {
    const details = buildFatalErrorDetails(error, source)
    if (import.meta.env.DEV && error.stack) {
        return `${details}\n\n${error.stack}`
    }

    return details
}

function updateErrorSurfaceDetails(containerId: string, detailsText: string): void {
    if (typeof document === 'undefined') {
        return
    }

    const details = document.getElementById(containerId)?.querySelector('[data-role="fatal-details"]')
    if (details instanceof HTMLElement) {
        details.textContent = detailsText
    }
}

function scheduleRuntimeErrorSurface(error: Error, source: string, extra?: Record<string, unknown>): void {
    window.setTimeout(() => {
        const domain = resolveErrorDomain(error, {
            source,
            extra
        })

        if (isBoundaryHandledError(error)) {
            logError(error, undefined, {
                source: `${source}:boundary-handled`,
                extra,
                domain,
                severity: 'warning'
            })
            return
        }

        if (isLocalizedContentError(error)) {
            logError(error, undefined, {
                source,
                extra,
                domain: 'ui_section',
                severity: 'warning'
            })
            return
        }

        logError(error, undefined, {
            source,
            extra,
            domain,
            severity: domain === 'dev_infra' ? 'warning' : 'error'
        })

        if (!shouldSurfaceRuntimeError(domain)) {
            return
        }

        const bannerSource = isApplicationBootstrapped ? source : `${source}:prebootstrap`
        showRuntimeErrorBanner(error, bannerSource)
    }, 0)
}

export function showFatalErrorOverlay(error: Error, source: string): void {
    if (typeof document === 'undefined') {
        return
    }

    let overlay = document.getElementById(FATAL_ERROR_OVERLAY_ID) as HTMLDivElement | null

    if (!overlay) {
        overlay = document.createElement('div')
        overlay.id = FATAL_ERROR_OVERLAY_ID
        overlay.style.position = 'fixed'
        overlay.style.inset = '0'
        overlay.style.zIndex = '99999'
        overlay.style.display = 'flex'
        overlay.style.alignItems = 'center'
        overlay.style.justifyContent = 'center'
        overlay.style.padding = '24px'
        overlay.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(30, 41, 59, 0.95))'

        const card = document.createElement('div')
        card.style.width = 'min(720px, 100%)'
        card.style.borderRadius = '20px'
        card.style.padding = '24px'
        card.style.background = 'rgba(15, 23, 42, 0.96)'
        card.style.border = '1px solid rgba(248, 113, 113, 0.45)'
        card.style.boxShadow = '0 24px 60px rgba(0, 0, 0, 0.45)'
        card.style.color = '#e2e8f0'
        card.style.fontFamily = '"Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif'

        const pill = document.createElement('div')
        pill.textContent = 'Критическая ошибка'
        pill.style.display = 'inline-flex'
        pill.style.padding = '6px 12px'
        pill.style.borderRadius = '999px'
        pill.style.background = 'rgba(248, 113, 113, 0.14)'
        pill.style.color = '#fecaca'
        pill.style.fontSize = '12px'
        pill.style.fontWeight = '600'
        pill.style.letterSpacing = '0.04em'
        pill.style.textTransform = 'uppercase'

        const title = document.createElement('h1')
        title.textContent = 'Сайт столкнулся с необработанной ошибкой'
        title.style.margin = '16px 0 10px'
        title.style.fontSize = '28px'
        title.style.lineHeight = '1.15'

        const description = document.createElement('p')
        description.textContent =
            'Ошибка не была перехвачена локальным или глобальным React boundary. Страница не может гарантировать корректный рендер.'
        description.style.margin = '0 0 18px'
        description.style.color = 'rgba(226, 232, 240, 0.86)'
        description.style.fontSize = '15px'
        description.style.lineHeight = '1.5'

        const detailsLabel = document.createElement('div')
        detailsLabel.textContent = 'Описание'
        detailsLabel.style.marginBottom = '8px'
        detailsLabel.style.fontSize = '12px'
        detailsLabel.style.fontWeight = '600'
        detailsLabel.style.textTransform = 'uppercase'
        detailsLabel.style.letterSpacing = '0.04em'
        detailsLabel.style.color = '#fca5a5'

        const details = document.createElement('pre')
        details.dataset.role = 'fatal-details'
        details.style.margin = '0'
        details.style.padding = '12px 14px'
        details.style.borderRadius = '12px'
        details.style.background = 'rgba(2, 6, 23, 0.78)'
        details.style.border = '1px dashed rgba(148, 163, 184, 0.45)'
        details.style.whiteSpace = 'pre-wrap'
        details.style.wordBreak = 'break-word'
        details.style.fontSize = '13px'
        details.style.lineHeight = '1.45'
        details.style.color = '#e2e8f0'

        const actions = document.createElement('div')
        actions.style.display = 'flex'
        actions.style.gap = '10px'
        actions.style.flexWrap = 'wrap'
        actions.style.marginTop = '18px'

        const reloadButton = document.createElement('button')
        reloadButton.type = 'button'
        reloadButton.textContent = 'Обновить страницу'
        reloadButton.style.border = 'none'
        reloadButton.style.borderRadius = '999px'
        reloadButton.style.padding = '10px 16px'
        reloadButton.style.cursor = 'pointer'
        reloadButton.style.fontWeight = '600'
        reloadButton.style.color = '#0f172a'
        reloadButton.style.background = 'linear-gradient(135deg, #f97373, #fb923c)'
        reloadButton.addEventListener('click', () => {
            window.location.reload()
        })

        actions.appendChild(reloadButton)
        card.appendChild(pill)
        card.appendChild(title)
        card.appendChild(description)
        card.appendChild(detailsLabel)
        card.appendChild(details)
        card.appendChild(actions)
        overlay.appendChild(card)
        document.body.appendChild(overlay)
    }

    const details = overlay.querySelector('[data-role="fatal-details"]')
    if (details instanceof HTMLElement) {
        details.textContent = buildErrorSurfaceDetails(error, source)
    }
}

export function showRuntimeErrorBanner(error: Error, source: string): void {
    if (typeof document === 'undefined') {
        return
    }

    let banner = document.getElementById(RUNTIME_ERROR_BANNER_ID) as HTMLDivElement | null

    if (!banner) {
        banner = document.createElement('div')
        banner.id = RUNTIME_ERROR_BANNER_ID
        banner.style.position = 'fixed'
        banner.style.right = '20px'
        banner.style.bottom = '20px'
        banner.style.zIndex = '99998'
        banner.style.width = 'min(520px, calc(100vw - 32px))'
        banner.style.borderRadius = '18px'
        banner.style.padding = '18px'
        banner.style.background = 'rgba(15, 23, 42, 0.96)'
        banner.style.border = '1px solid rgba(248, 113, 113, 0.38)'
        banner.style.boxShadow = '0 18px 40px rgba(0, 0, 0, 0.35)'
        banner.style.color = '#e2e8f0'
        banner.style.fontFamily = '"Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif'

        const pill = document.createElement('div')
        pill.textContent = 'Ошибка приложения'
        pill.style.display = 'inline-flex'
        pill.style.padding = '5px 10px'
        pill.style.borderRadius = '999px'
        pill.style.background = 'rgba(248, 113, 113, 0.14)'
        pill.style.color = '#fecaca'
        pill.style.fontSize = '11px'
        pill.style.fontWeight = '600'
        pill.style.letterSpacing = '0.04em'
        pill.style.textTransform = 'uppercase'

        const title = document.createElement('h2')
        title.textContent = 'Один из блоков приложения сломался'
        title.style.margin = '14px 0 8px'
        title.style.fontSize = '20px'
        title.style.lineHeight = '1.2'

        const description = document.createElement('p')
        description.textContent =
            'Приложение продолжает работать, но один из разделов открылся с ошибкой. Остальные страницы и действия остаются доступны.'
        description.style.margin = '0 0 14px'
        description.style.color = 'rgba(226, 232, 240, 0.86)'
        description.style.fontSize = '14px'
        description.style.lineHeight = '1.45'

        const details = document.createElement('pre')
        details.dataset.role = 'fatal-details'
        details.style.margin = '0'
        details.style.padding = '12px 14px'
        details.style.borderRadius = '12px'
        details.style.background = 'rgba(2, 6, 23, 0.72)'
        details.style.border = '1px dashed rgba(148, 163, 184, 0.35)'
        details.style.whiteSpace = 'pre-wrap'
        details.style.wordBreak = 'break-word'
        details.style.fontSize = '12px'
        details.style.lineHeight = '1.4'
        details.style.color = '#e2e8f0'

        const actions = document.createElement('div')
        actions.style.display = 'flex'
        actions.style.gap = '10px'
        actions.style.flexWrap = 'wrap'
        actions.style.marginTop = '14px'

        const reloadButton = document.createElement('button')
        reloadButton.type = 'button'
        reloadButton.textContent = 'Обновить страницу'
        reloadButton.style.border = 'none'
        reloadButton.style.borderRadius = '999px'
        reloadButton.style.padding = '10px 14px'
        reloadButton.style.cursor = 'pointer'
        reloadButton.style.fontWeight = '600'
        reloadButton.style.color = '#0f172a'
        reloadButton.style.background = 'linear-gradient(135deg, #f97373, #fb923c)'
        reloadButton.addEventListener('click', () => {
            window.location.reload()
        })

        const dismissButton = document.createElement('button')
        dismissButton.type = 'button'
        dismissButton.textContent = 'Скрыть'
        dismissButton.style.border = '1px solid rgba(148, 163, 184, 0.4)'
        dismissButton.style.borderRadius = '999px'
        dismissButton.style.padding = '10px 14px'
        dismissButton.style.cursor = 'pointer'
        dismissButton.style.fontWeight = '600'
        dismissButton.style.color = '#e2e8f0'
        dismissButton.style.background = 'transparent'
        dismissButton.addEventListener('click', () => {
            banner?.remove()
        })

        actions.appendChild(reloadButton)
        actions.appendChild(dismissButton)
        banner.appendChild(pill)
        banner.appendChild(title)
        banner.appendChild(description)
        banner.appendChild(details)
        banner.appendChild(actions)
        document.body.appendChild(banner)
    }

    updateErrorSurfaceDetails(RUNTIME_ERROR_BANNER_ID, buildErrorSurfaceDetails(error, source))
}

export function markApplicationBootstrapped(): void {
    isApplicationBootstrapped = true
    removeFatalErrorOverlay()
}

export function setupGlobalErrorHandlers() {
    if (isInitialized || typeof window === 'undefined') {
        return
    }

    isInitialized = true

    window.addEventListener('error', event => {
        if (!event.error && !event.message) {
            return
        }

        event.preventDefault()
        scheduleRuntimeErrorSurface(buildErrorFromWindowEvent(event), 'window.onerror')
    })

    window.addEventListener('unhandledrejection', event => {
        const reason = event.reason

        if (reason instanceof Error) {
            event.preventDefault()
            scheduleRuntimeErrorSurface(reason, 'unhandledrejection')
            return
        }

        const wrappedError = normalizeErrorLike(reason, 'Unhandled promise rejection.', {
            source: 'unhandledrejection',
            domain: 'app_runtime',
            owner: 'window.unhandledrejection',
            expected: 'Promise rejection should provide an Error instance with owner context.',
            actual: 'Promise rejected with a non-Error value.',
            requiredAction: 'Reject promises with Error instances that include owner, expected, actual, and context.',
            extra: { reason }
        })
        event.preventDefault()
        scheduleRuntimeErrorSurface(wrappedError, 'unhandledrejection', { reason })
    })
}

// Регистрация на уровне модуля нужна для import-time ошибок,
// когда выполнение main.tsx может не дойти до явного вызова setupGlobalErrorHandlers().
setupGlobalErrorHandlers()
