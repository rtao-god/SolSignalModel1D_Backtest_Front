export interface ScrollToAnchorOptions {
    behavior?: ScrollBehavior
    /**
     * Явное смещение сверху, px.
     * Если не задано, берём значение из CSS-переменной --anchor-offset.
     */
    offsetTop?: number

    /**
     * Включать ли визуальный эффект перехода (пульс фона).
     */
    withTransitionPulse?: boolean
}

function resolveOffsetTop(explicit?: number): number {
    if (typeof explicit === 'number') {
        return explicit
    }

    if (typeof document === 'undefined') {
        return 0
    }

    try {
        const root = document.documentElement
        const cssValue = getComputedStyle(root).getPropertyValue('--anchor-offset').trim()

        if (!cssValue) {
            return 0
        }

        const probe = document.createElement('div')
        probe.style.position = 'absolute'
        probe.style.visibility = 'hidden'
        probe.style.height = cssValue

        document.body.appendChild(probe)
        const computedHeight = getComputedStyle(probe).height
        document.body.removeChild(probe)

        const value = parseFloat(computedHeight || '')
        return Number.isFinite(value) ? value : 0
    } catch {
        return 0
    }
}

/**
 * Запускает анимацию пульса на body.
 */
function triggerScrollTransitionPulse() {
    if (typeof document === 'undefined') {
        return
    }

    const body = document.body
    if (!body) {
        return
    }

    body.classList.remove('scroll-transition-pulse')
    // форсируем reflow, чтобы анимация перезапустилась
    void body.offsetWidth
    body.classList.add('scroll-transition-pulse')
}

/**
 * Плавный скролл к секции по её DOM id.
 */
export function scrollToAnchor(anchor: string, options?: ScrollToAnchorOptions) {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return
    }

    const element = document.getElementById(anchor)
    if (!element) {
        return
    }

    const behavior = options?.behavior ?? 'smooth'
    const offsetTop = resolveOffsetTop(options?.offsetTop)

    const rect = element.getBoundingClientRect()
    const targetTop = window.scrollY + rect.top - offsetTop

    if (options?.withTransitionPulse) {
        triggerScrollTransitionPulse()
    }

    window.scrollTo({
        top: targetTop,
        behavior
    })
}
