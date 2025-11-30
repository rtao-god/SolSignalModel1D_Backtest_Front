import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { scrollToAnchor } from '../lib/scrollToAnchor'

export interface SectionConfig {
    id: string
    anchor: string
}

interface UseSectionPagerOptions {
    /**
     * Логические секции страницы:
     * id — внутренний идентификатор;
     * anchor — DOM-id секции (<section id="...">).
     */
    sections: SectionConfig[]

    /**
     * Синхронизировать ли активную секцию с hash в URL.
     */
    syncHash?: boolean

    /**
     * Переопределение смещения сверху.
     * Если не задано, используется глобальная CSS-переменная --anchor-offset.
     */
    offsetTop?: number
}

interface UseSectionPagerResult {
    /**
     * Текущий "эффективный" индекс:
     * - во время программного скролла → целевая секция;
     * - при ручном скролле → секция, ближайшая к "линии якоря".
     */
    currentIndex: number
    canPrev: boolean
    canNext: boolean
    handlePrev: () => void
    handleNext: () => void
}

/**
 * Локальное разрешение anchor-отступа для логики
 * "какая секция активна при скролле".
 * Логика аналогична resolveOffsetTop из scrollToAnchor.
 */
function resolveAnchorOffsetForScroll(offsetTop?: number): number {
    if (typeof offsetTop === 'number') {
        return offsetTop
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
 * Общая логика пагинации по секциям:
 * - хранит логический currentIndex (по факту позиции на странице);
 * - во время программного скролла (стрелки / подвкладки / hash) держит
 *   "целевой" индекс и не даёт скроллу дёргать состояние,
 *   пока не доедем до нужной секции или пока пользователь не сорвёт анимацию;
 * - наружу отдаёт "эффективный" индекс:
 *   - либо целевой (если переход ещё в пути),
 *   - либо текущий вычисленный по scroll.
 */
export function useSectionPager({
    sections,
    syncHash = true,
    offsetTop
}: UseSectionPagerOptions): UseSectionPagerResult {
    const location = useLocation()
    const navigate = useNavigate()

    /**
     * Логический текущий индекс.
     * Его обновляет только scroll-обработчик (и только когда
     * нет активного программного перехода).
     */
    const [currentIndex, setCurrentIndex] = useState(0)

    /**
     * Цель программного перехода:
     * - не null → сейчас идёт программный скролл к этой секции;
     * - null     → программного скролла нет, можно свободно доверять scroll-позиции.
     */
    const programmaticTargetIndexRef = useRef<number | null>(null)

    // Держим currentIndex в допустимых границах при изменении списка секций
    useEffect(() => {
        if (sections.length === 0) {
            if (currentIndex !== 0) {
                setCurrentIndex(0)
            }
            programmaticTargetIndexRef.current = null
            return
        }

        if (currentIndex >= sections.length) {
            setCurrentIndex(sections.length - 1)
        }
    }, [sections.length, currentIndex])

    /**
     * Реакция на изменение hash (подвкладки / прямые ссылки):
     * - выставляем целевой индекс программного перехода;
     * - запускаем плавный скролл к якорю.
     */
    useEffect(() => {
        if (!syncHash || sections.length === 0) return

        const hash = location.hash.replace('#', '')
        if (!hash) return

        const idx = sections.findIndex(s => s.anchor === hash)
        if (idx < 0) return

        // Помечаем, что начинается программный переход к секции idx.
        programmaticTargetIndexRef.current = idx

        scrollToAnchor(hash, {
            behavior: 'smooth',
            offsetTop,
            withTransitionPulse: true
        })
    }, [location.hash, sections, syncHash, offsetTop])

    /**
     * Синхронизация currentIndex с РУЧНЫМ скроллом:
     * - слушаем scroll на .app (глобальный scroll-root);
     * - вычисляем линию якоря: scrollTop + anchorOffset;
     * - когда нет активного программного перехода → выбираем
     *   секцию, чей якорь ближе всего к этой линии;
     * - пока есть программный переход:
     *   - следим за расстоянием до целевой секции;
     *   - как только "приехали" или пользователь далеко уехал сам —
     *     сбрасываем флаг и разрешаем обычную логику.
     */
    useEffect(() => {
        if (!syncHash || sections.length === 0) {
            return
        }

        if (typeof document === 'undefined') {
            return
        }

        const scrollRoot = document.querySelector('.app') as HTMLElement | null
        if (!scrollRoot) {
            return
        }

        const anchorOffset = resolveAnchorOffsetForScroll(offsetTop)

        const handleScroll = () => {
            if (sections.length === 0) {
                return
            }

            const scrollTop = scrollRoot.scrollTop
            const containerRect = scrollRoot.getBoundingClientRect()
            const anchorLine = scrollTop + anchorOffset

            const targetIndex = programmaticTargetIndexRef.current

            if (targetIndex !== null && targetIndex >= 0 && targetIndex < sections.length) {
                // Пока есть целевая секция — проверяем, не доехали ли до неё.
                const targetSection = sections[targetIndex]
                const targetEl = targetSection.anchor ? document.getElementById(targetSection.anchor) : null

                if (targetEl) {
                    const rectTarget = targetEl.getBoundingClientRect()
                    const elementTopTarget = rectTarget.top - containerRect.top + scrollTop
                    const distanceToTarget = Math.abs(elementTopTarget - anchorLine)

                    // Порог "приехали" — несколько пикселей.
                    const EPS = 4
                    // Порог "пользователь сорвал анимацию" — очень далеко от цели.
                    const CANCEL_DIST = scrollRoot.clientHeight * 1.5

                    if (distanceToTarget <= EPS) {
                        // Считаем, что доехали: фиксируем индекс и снимаем флаг.
                        programmaticTargetIndexRef.current = null
                        setCurrentIndex(prev => (prev === targetIndex ? prev : targetIndex))
                        return
                    }

                    if (distanceToTarget > CANCEL_DIST) {
                        // Пользователь сильно уехал от целевой секции —
                        // больше не считаем скролл программным.
                        programmaticTargetIndexRef.current = null
                        // Ниже отработает обычная логика и выберет ближайшую секцию.
                    } else {
                        // Программный скролл ещё в пути — не дёргаем currentIndex,
                        // чтобы стрелки не мигали.
                        return
                    }
                } else {
                    // Якорь целевой секции не найден (например, DOM ещё не успел смонтироваться
                    // или секцию скрыли). Сбрасываем программное состояние.
                    programmaticTargetIndexRef.current = null
                    // Далее — обычная логика выбора секции.
                }
            }

            // Обычная логика: выбираем секцию, чья "линия якоря" ближе всего к anchorLine.
            let bestIndex = 0
            let bestDistance = Number.POSITIVE_INFINITY

            for (let i = 0; i < sections.length; i += 1) {
                const section = sections[i]
                const el = section.anchor ? document.getElementById(section.anchor) : null
                if (!el) continue

                const rect = el.getBoundingClientRect()
                const elementTop = rect.top - containerRect.top + scrollTop
                const distance = Math.abs(elementTop - anchorLine)

                if (distance < bestDistance) {
                    bestDistance = distance
                    bestIndex = i
                }
            }

            if (bestDistance === Number.POSITIVE_INFINITY) {
                return
            }

            setCurrentIndex(prev => (prev === bestIndex ? prev : bestIndex))
        }

        scrollRoot.addEventListener('scroll', handleScroll, { passive: true })

        return () => {
            scrollRoot.removeEventListener('scroll', handleScroll)
        }
    }, [sections, syncHash, offsetTop])

    /**
     * Программный переход по секциям (стрелки).
     * Важно:
     * - не трогаем currentIndex напрямую;
     * - помечаем только целевой индекс и запускаем scroll / смену hash;
     * - currentIndex синхронизируется скроллом, когда действительно "доехали".
     */
    const goToIndex = useCallback(
        (nextIndex: number) => {
            if (nextIndex < 0 || nextIndex >= sections.length) return

            const section = sections[nextIndex]
            if (!section?.anchor) return

            programmaticTargetIndexRef.current = nextIndex

            if (syncHash) {
                // Меняем hash — эффект выше сделает scrollToAnchor.
                navigate(`#${section.anchor}`)
            } else {
                // Локальная пагинация без hash — сразу скроллим.
                scrollToAnchor(section.anchor, {
                    behavior: 'smooth',
                    offsetTop,
                    withTransitionPulse: true
                })
            }
        },
        [sections, syncHash, offsetTop, navigate]
    )

    const handlePrev = useCallback(() => {
        const effectiveIndex = programmaticTargetIndexRef.current ?? currentIndex
        goToIndex(effectiveIndex - 1)
    }, [currentIndex, goToIndex])

    const handleNext = useCallback(() => {
        const effectiveIndex = programmaticTargetIndexRef.current ?? currentIndex
        goToIndex(effectiveIndex + 1)
    }, [currentIndex, goToIndex])

    /**
     * Эффективный индекс — то, что реально видит UI:
     * - если идёт программный переход → целевая секция;
     * - иначе → вычисленный currentIndex.
     * Это убирает мигание стрелок: даже если scroll временно "думает"
     * за нас, стрелки пока смотрят на активную цель.
     */
    const effectiveIndex = programmaticTargetIndexRef.current ?? currentIndex

    const canPrev = sections.length > 1 && effectiveIndex > 0
    const canNext = sections.length > 1 && effectiveIndex < sections.length - 1

    return {
        currentIndex: effectiveIndex,
        canPrev,
        canNext,
        handlePrev,
        handleNext
    }
}
