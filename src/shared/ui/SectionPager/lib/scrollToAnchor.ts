export interface ScrollToAnchorOptions {
    behavior?: ScrollBehavior

    offsetTop?: number


    withTransitionPulse?: boolean
}

let scrollTransitionTimeoutId: number | null = null

function resolveBottomGuard(): number {
    if (typeof document === 'undefined') {
        return 0
    }

    try {
        const root = document.documentElement
        const cssValue = getComputedStyle(root).getPropertyValue('--anchor-bottom-guard').trim()

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

function triggerScrollTransitionPulse() {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return
    }

    const body = document.body
    if (!body) {
        return
    }

    const CLASS = 'scroll-transition-pulse'
    if (body.classList.contains(CLASS)) {
        body.classList.remove(CLASS)

        if (scrollTransitionTimeoutId !== null) {
            window.clearTimeout(scrollTransitionTimeoutId)
            scrollTransitionTimeoutId = null
        }
        void body.offsetWidth
    }
    body.classList.add(CLASS)
    scrollTransitionTimeoutId = window.setTimeout(() => {
        body.classList.remove(CLASS)
        scrollTransitionTimeoutId = null
    }, 600)
}

export function scrollToAnchor(anchor: string, options?: ScrollToAnchorOptions) {
    if (typeof document === 'undefined') {
        return
    }

    const element = document.getElementById(anchor)
    if (!element) {
        return
    }

    const behavior: ScrollBehavior = options?.behavior ?? 'smooth'
    const offsetTop = resolveOffsetTop(options?.offsetTop)
    const bottomGuard = resolveBottomGuard()

    const scrollRoot = document.querySelector('.app') as HTMLElement | null

    if (options?.withTransitionPulse) {
        triggerScrollTransitionPulse()
    }

    if (scrollRoot) {
        const containerRect = scrollRoot.getBoundingClientRect()
        const targetRect = element.getBoundingClientRect()

        const relativeTop = targetRect.top - containerRect.top
        let targetTop = scrollRoot.scrollTop + relativeTop - offsetTop
        const maxScrollTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight - bottomGuard)

        if (targetTop > maxScrollTop) {
            targetTop = maxScrollTop
        }
        if (targetTop < 0) {
            targetTop = 0
        }

        scrollRoot.scrollTo({
            top: targetTop,
            behavior
        })

        return
    }
    if (typeof window === 'undefined') {
        return
    }

    const rect = element.getBoundingClientRect()
    let targetTop = window.scrollY + rect.top - offsetTop

    const doc = document.documentElement
    const docScrollHeight = Math.max(doc.scrollHeight, document.body.scrollHeight)
    const maxScrollTop = Math.max(0, docScrollHeight - window.innerHeight - bottomGuard)

    if (targetTop > maxScrollTop) {
        targetTop = maxScrollTop
    }
    if (targetTop < 0) {
        targetTop = 0
    }

    window.scrollTo({
        top: targetTop,
        behavior
    })
}

export function scrollToTop(options?: { behavior?: ScrollBehavior; withTransitionPulse?: boolean }) {
    if (typeof document === 'undefined') {
        return
    }

    const behavior: ScrollBehavior = options?.behavior ?? 'smooth'
    const scrollRoot = document.querySelector('.app') as HTMLElement | null

    if (options?.withTransitionPulse) {
        triggerScrollTransitionPulse()
    }

    if (scrollRoot) {
        scrollRoot.scrollTo({
            top: 0,
            behavior
        })
        return
    }

    if (typeof window === 'undefined') {
        return
    }

    window.scrollTo({
        top: 0,
        behavior
    })
}

