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
     * Текущий индекс активной секции:
     * - отражает фактическое положение скролла;
     * - используется для подсветки и для стрелок.
     */
    currentIndex: number
    canPrev: boolean
    canNext: boolean
    handlePrev: () => void
    handleNext: () => void
}

/**
 * Локальное чтение anchor-отступа для расчёта "линии якоря" при скролле.
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
 * - currentIndex всегда обновляется от реального скролла;
 * - programmaticTargetIndexRef используется ТОЛЬКО как "цель" для UI,
 *   чтобы стрелки не мигали во время плавного перехода;
 * - стрелки всегда опираются на "эффективный" индекс
 *   (целевой, если переход в пути, иначе текущий).
 */
export function useSectionPager({
    sections,
    syncHash = true,
    offsetTop
}: UseSectionPagerOptions): UseSectionPagerResult {
    const location = useLocation()
    const navigate = useNavigate()

    // Индекс секции, ближайшей к "линии якоря" (scrollTop + anchorOffset).
    const [currentIndex, setCurrentIndex] = useState(0)

    /**
     * Целевой индекс при программном переходе (стрелки / hash / подвкладки).
     * Используется:
     * - чтобы UI показывал "куда едем" (effectiveIndex);
     * - чтобы понять, когда мы доехали и можно сбрасывать цель.
     * НЕ блокирует обновление currentIndex.
     */
    const programmaticTargetIndexRef = useRef<number | null>(null)

    // Страхуемся от выхода currentIndex за границы при смене списка секций.
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
     * - вычисляем индекс секции по anchor;
     * - выставляем целевой индекс;
     * - запускаем scrollToAnchor.
     *
     * Важный момент:
     * - даже если роутер не перерисовал hash (navigate на тот же самый),
     *   переход по якорю для стрелок мы делаем напрямую (в goToIndex),
     *   а тут — по "внешним" изменениям hash (клики по Link'ам).
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
     * Синхронизация currentIndex с РУЧНЫМ и программным скроллом:
     * - слушаем scroll на .app;
     * - считаем "линию якоря" (scrollTop + anchorOffset);
     * - находим секцию, чей top ближе всего к этой линии;
     * - обновляем currentIndex.
     *
     * Никаких early-return'ов из-за programmaticTargetIndexRef здесь нет:
     * currentIndex всегда описывает фактическую позицию.
     * Это гарантирует, что стрелки никогда не будут "зависать".
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

        // Синхронизация при первом рендере (если страница уже проскроллена).
        handleScroll()

        return () => {
            scrollRoot.removeEventListener('scroll', handleScroll)
        }
    }, [sections, syncHash, offsetTop])

    /**
     * Сбрасываем "целевой" индекс, когда фактический currentIndex доехал до него.
     * Это нужно, чтобы effectiveIndex в UI переключился обратно
     * на обычный currentIndex после окончания анимации.
     */
    useEffect(() => {
        const target = programmaticTargetIndexRef.current
        if (target === null) return

        if (target === currentIndex) {
            programmaticTargetIndexRef.current = null
        }
    }, [currentIndex])

    /**
     * Программный переход по секциям (стрелки):
     * - база всегда currentIndex (эффективный индекс мы считаем отдельно);
     * - выставляем целевой индекс;
     * - обязательно вызываем scrollToAnchor НАПРЯМУЮ;
     * - при syncHash также обновляем hash через navigate, чтобы
     *   URL / подсветки в сайдбаре были в консистентном состоянии.
     *
     * Таким образом, даже если navigate на тот же hash не триггерит
     * rerender location, переход не "ломается" — scrollToAnchor уже вызван.
     */
    const goToIndex = useCallback(
        (nextIndex: number) => {
            if (nextIndex < 0 || nextIndex >= sections.length) return

            const section = sections[nextIndex]
            if (!section?.anchor) return

            programmaticTargetIndexRef.current = nextIndex

            if (syncHash) {
                // Обновляем hash (для URL/сайдбара)...
                navigate(`#${section.anchor}`)
                // ...но НЕ полагаемся на useEffect по hash,
                // сразу делаем реальный скролл.
                scrollToAnchor(section.anchor, {
                    behavior: 'smooth',
                    offsetTop,
                    withTransitionPulse: true
                })
            } else {
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
        // База — currentIndex, который всегда описывает реальное положение.
        goToIndex(currentIndex - 1)
    }, [currentIndex, goToIndex])

    const handleNext = useCallback(() => {
        goToIndex(currentIndex + 1)
    }, [currentIndex, goToIndex])

    /**
     * Эффективный индекс:
     * - если есть целевой программный переход → показываем его (стрелки/подсветка),
     * - иначе → обычный currentIndex.
     *
     * Это убирает мигание стрелок во время анимации: UI "знает", что цель уже другая.
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
