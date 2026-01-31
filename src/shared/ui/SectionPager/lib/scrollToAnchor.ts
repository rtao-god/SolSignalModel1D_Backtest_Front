export interface ScrollToAnchorOptions {
    behavior?: ScrollBehavior
    /*
		Явное смещение сверху, px.

		- Если не задано, берём значение из CSS-переменной --anchor-offset.
	*/
    offsetTop?: number

    /*
		Включать ли визуальный эффект перехода (пульс фона / скроллбара).
	*/
    withTransitionPulse?: boolean
}

/*
	Текущий таймер для снятия класса scroll-transition-pulse.

	- Не плодим несколько таймеров.
	- Перезапускаем эффект, если пользователь быстро листает секции.
*/
let scrollTransitionTimeoutId: number | null = null

/*
	Разрешает нижний guard, чтобы при якорном скролле не показывать футер.

	- Читает CSS-переменную --anchor-bottom-guard.
	- Поддерживает значения вроде "40px" или "calc(40px + 8px)".
*/
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

/*
	Разрешает offsetTop.

	- Если передан явно — используем его.
	- Иначе читаем CSS-переменную --anchor-offset и через временный div получаем px-значение
	  (работает и с calc(...), и с var(...)).
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

/*
	Запускает визуальный эффект перехода.

	- Вешает на body класс scroll-transition-pulse.
	- Через ~600 мс снимает его.
	- Если эффект запускается повторно до окончания предыдущего — перезапускает таймер и анимацию.
	- CSS: body.scroll-transition-pulse подменяет CSS-переменные скроллбара (фон трека и ручки → градиент).
	- CSS: у .app::-webkit-scrollbar-* стоят transition, поэтому смена цветов выглядит как пульс.
	- CSS: опционально body.scroll-transition-pulse::before даёт лёгкий оверлей по центру экрана.
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

/*
	Плавный скролл к секции по её DOM id.

	- Если offsetTop не передан, используется CSS-переменная --anchor-offset.
	- Защищено от SSR и отсутствия элемента.
	- Скролл идёт по .app (scroll-root всего приложения).
	- Если .app не найден, используется fallback через window.scrollTo.
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
    const bottomGuard = resolveBottomGuard()

    const scrollRoot = document.querySelector('.app') as HTMLElement | null

    if (options?.withTransitionPulse) {
        triggerScrollTransitionPulse()
    }

    if (scrollRoot) {
        const containerRect = scrollRoot.getBoundingClientRect()
        const targetRect = element.getBoundingClientRect()

        const relativeTop = targetRect.top - containerRect.top

        // Желаемая позиция с учётом offsetTop.
        let targetTop = scrollRoot.scrollTop + relativeTop - offsetTop

        // Максимум: не доезжать до самого низа на bottomGuard пикселей.
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

    // Fallback для случая, если по какой-то причине .app не найден.
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

/*
	Универсальный скролл страницы в самый верх.

	- Скроллит .app как единый scroll-root.
	- Если .app нет — fallback на window.
	- Опционально включает тот же "пульс", что и якорная пагинация.
*/
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


