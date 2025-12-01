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
     * Текущий индекс активной секции.
     * Для UI это единственный источник правды:
     *   - подсветка секции;
     *   - состояния стрелок (canPrev/canNext).
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
 * - хранит currentIndex, основанный на реальной позиции скролла;
 * - при программных переходах (стрелки / подвкладки / hash) отмечает
 *   целевой индекс и не даёт scroll-обработчику дёргать currentIndex,
 *   пока не доедем до цели или пользователь не сорвёт анимацию;
 * - стрелки (handlePrev/handleNext) и canPrev/canNext работают ТОЛЬКО
 *   от currentIndex, без оглядки на "целевую" позицию, чтобы не было
 *   ситуации "первый клик ничего не делает".
 */
export function useSectionPager({
    sections,
    syncHash = true,
    offsetTop
}: UseSectionPagerOptions): UseSectionPagerResult {
    const location = useLocation()
    const navigate = useNavigate()

    /**
     * Логический текущий индекс (по факту позиции на странице).
     * Обновляется:
     * - из scroll-обработчика;
     * - из hash-эффекта при прямом переходе по якорю.
     */
    const [currentIndex, setCurrentIndex] = useState(0)

    /**
     * Цель программного перехода:
     * - не null → сейчас идёт программный скролл к этой секции;
     * - null     → программного скролла нет, можно свободно доверять scroll-позиции.
     *
     * ВАЖНО: это состояние используется ТОЛЬКО внутри scroll-обработчика
     * и hash-эффекта, стрелки на него не смотрят.
     */
    const programmaticTargetIndexRef = useRef<number | null>(null)

    // Держим currentIndex в допустимых границах при изменении списка секций.
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
     * - если есть активный программный переход:
     *     • пока мы "в пути" — не дёргаем currentIndex, чтобы стрелки не мигали;
     *     • как только доехали до цели или сильно уехали — сбрасываем цель;
     * - если цели нет — выбираем секцию, чей якорь ближе всего к anchorLine,
     *   и обновляем currentIndex.
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
                    // Порог "пользователь сорвал анимацию" — далеко от цели.
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
                    // Якорь целевой секции не найден (DOM ещё не смонтировался
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
     * - база для расчёта nextIndex — ТОЛЬКО currentIndex;
     * - programmaticTargetIndexRef используется только для того,
     *   чтобы scroll-обработчик не дёргал currentIndex во время
     *   плавного скролла.
     */
    const goToIndex = useCallback(
        (nextIndex: number) => {
            if (nextIndex < 0 || nextIndex >= sections.length) return

            const section = sections[nextIndex]
            if (!section?.anchor) return

            programmaticTargetIndexRef.current = nextIndex

            if (syncHash) {
                // Меняем hash — hash-эффект выше сделает scrollToAnchor.
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
        goToIndex(currentIndex - 1)
    }, [currentIndex, goToIndex])

    const handleNext = useCallback(() => {
        goToIndex(currentIndex + 1)
    }, [currentIndex, goToIndex])

    const canPrev = sections.length > 1 && currentIndex > 0
    const canNext = sections.length > 1 && currentIndex < sections.length - 1

    return {
        currentIndex,
        canPrev,
        canNext,
        handlePrev,
        handleNext
    }
}
