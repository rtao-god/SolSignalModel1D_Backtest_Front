export interface ScrollToAnchorOptions {
    behavior?: ScrollBehavior
    /**
     * Явное смещение сверху, px.
     * Если не задано, берём значение из CSS-переменной --anchor-offset.
     */
    offsetTop?: number

    /**
     * Включать ли визуальный эффект перехода (пульс фона / скроллбара).
     */
    withTransitionPulse?: boolean
}

/**
 * Текущий таймер для снятия класса scroll-transition-pulse.
 * Нужен, чтобы:
 * - не плодить несколько таймеров;
 * - уметь перезапускать эффект, если пользователь быстро листает секции.
 */
let scrollTransitionTimeoutId: number | null = null

/**
 * Разрешает offsetTop:
 * - если передан явно — используем его;
 * - иначе читаем CSS-переменную --anchor-offset
 *   и через временный div получаем реальное px-значение
 *   (работает и с calc(...), и с var(...)).
 */
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
 * Запускает визуальный эффект перехода:
 * - вешает на body класс scroll-transition-pulse;
 * - через ~600 мс снимает его;
 * - если эффект запускается повторно до окончания предыдущего —
 *   перезапускает таймер и анимацию.
 *
 * CSS-часть:
 * - body.scroll-transition-pulse подменяет CSS-переменные для скроллбара
 *   (фон трека и ручки → кровавый градиент);
 * - у .app::-webkit-scrollbar-* стоят transition'ы, поэтому смена цветов выглядит как пульс;
 * - опционально body.scroll-transition-pulse::before даёт лёгкий оверлей по центру экрана.
 */
function triggerScrollTransitionPulse() {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return
    }

    const body = document.body
    if (!body) {
        return
    }

    const CLASS = 'scroll-transition-pulse'

    // Если эффект уже активен — снимаем класс и таймер, чтобы перезапустить анимацию корректно.
    if (body.classList.contains(CLASS)) {
        body.classList.remove(CLASS)

        if (scrollTransitionTimeoutId !== null) {
            window.clearTimeout(scrollTransitionTimeoutId)
            scrollTransitionTimeoutId = null
        }

        // Форсируем reflow, чтобы последующее добавление класса точно перезапустило CSS-анимации.
        void body.offsetWidth
    }

    // Вешаем класс заново.
    body.classList.add(CLASS)

    // Снимаем класс через 600 мс (подогнано под длительность анимаций/transition в CSS).
    scrollTransitionTimeoutId = window.setTimeout(() => {
        body.classList.remove(CLASS)
        scrollTransitionTimeoutId = null
    }, 600)
}

/**
 * Плавный скролл к секции по её DOM id.
 * - если offsetTop не передан, используется CSS-переменная --anchor-offset;
 * - защищено от SSR и отсутствия элемента;
 * - скролл идёт по .app (scroll-root всего приложения);
 * - если .app не найден, используется fallback через window.scrollTo.
 */
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

    // Реальный scroll-root — .app (overflow-y: auto на .app).
    const scrollRoot = document.querySelector('.app') as HTMLElement | null

    // Визуальный эффект перехода (пульс фона/скроллбара).
    if (options?.withTransitionPulse) {
        triggerScrollTransitionPulse()
    }

    if (scrollRoot) {
        // Координаты контейнера и целевого элемента относительно окна.
        const containerRect = scrollRoot.getBoundingClientRect()
        const targetRect = element.getBoundingClientRect()

        // Позиция элемента относительно видимой области внутри .app.
        const relativeTop = targetRect.top - containerRect.top

        // Финальная позиция скролла внутри .app, с учётом offsetTop.
        const targetTop = scrollRoot.scrollTop + relativeTop - offsetTop

        scrollRoot.scrollTo({
            top: targetTop,
            behavior
        })

        return
    }

    // Fallback: если по какой-то причине .app не найден — скроллим окно.
    if (typeof window === 'undefined') {
        return
    }

    const rect = element.getBoundingClientRect()
    const targetTop = window.scrollY + rect.top - offsetTop

    window.scrollTo({
        top: targetTop,
        behavior
    })
}
