import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { scrollToAnchor } from '../lib/scrollToAnchor'

export interface SectionConfig {
    id: string
    anchor: string
}

interface UseSectionPagerOptions {
    /*
		Логические секции страницы.

		- id — внутренний идентификатор.
		- anchor — DOM-id секции (<section id="...">).
	*/
    sections: SectionConfig[]

    // Синхронизировать ли активную секцию с hash в URL.
    syncHash?: boolean

    /*
		Трекинг currentIndex от реального скролла (без обязательной синхронизации hash).

        - По умолчанию повторяет поведение старого syncHash:
          trackScroll по умолчанию = syncHash (чтобы не менять поведение старых вызовов).
	*/
    trackScroll?: boolean

    /*
		Шаг переключения секций для стрелок.

        - 1 = как раньше.
        - Для “внутренней” навигации по карточкам можно поставить 5.
	*/
    step?: number

    /*
		Переопределение смещения сверху.

		- Если не задано, используется глобальная CSS-переменная --anchor-offset.
	*/
    offsetTop?: number
}

interface UseSectionPagerResult {
    /*
		Текущий индекс активной секции.

		- Отражает фактическое положение скролла.
		- Используется для подсветки и для стрелок.
	*/
    currentIndex: number
    canPrev: boolean
    canNext: boolean
    handlePrev: () => void
    handleNext: () => void
}

/*
	Локальное чтение anchor-отступа для расчёта "линии якоря" при скролле.

	- Логика аналогична resolveOffsetTop из scrollToAnchor.
*/
function resolveAnchorOffsetForScroll(offsetTop?: number): number {
    if (typeof offsetTop === 'number') {
        return offsetTop
    }

    if (typeof document === 'undefined') return 0

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

function resolveStep(step?: number): number {
    if (typeof step === 'undefined') {
        return 1
    }

    const isValid = Number.isFinite(step) && step > 0
    if (!isValid) {
        console.warn('[useSectionPager] Invalid step; fallback to 1', { step })
        return 1
    }

    return Math.max(1, Math.floor(step))
}

/*
	Общая логика пагинации скролла по секциям.

	- currentIndex всегда обновляется от реального скролла (если trackScroll=true).
	- programmaticTargetIndexRef используется только как "цель" для UI, чтобы стрелки не мигали во время плавного перехода.
	- Стрелки всегда опираются на "эффективный" индекс (целевой, если переход в пути, иначе текущий).
*/
export function useSectionPager({
    sections,
    syncHash = true,
    trackScroll,
    step,
    offsetTop
}: UseSectionPagerOptions): UseSectionPagerResult {
    const location = useLocation()
    const navigate = useNavigate()

    const trackScrollEffective = typeof trackScroll === 'boolean' ? trackScroll : syncHash
    const stepEffective = resolveStep(step)

    // Индекс секции, ближайшей к "линии якоря" (scrollTop + anchorOffset).
    const [currentIndex, setCurrentIndex] = useState(0)

    /*
		Целевой индекс при программном переходе (стрелки / hash / подвкладки).

		- UI показывает "куда едем" через effectiveIndex.
		- Понимаем, когда мы доехали, и можно сбрасывать цель.
		- НЕ блокирует обновление currentIndex.
	*/
    const programmaticTargetIndexRef = useRef<number | null>(null)
    const lastHandledHashRef = useRef<string | null>(null)

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

    /*
		Реакция на изменение hash (подвкладки / прямые ссылки).

		- Вычисляем индекс секции по anchor.
		- Выставляем целевой индекс.
		- Запускаем scrollToAnchor.
		- Здесь реагируем только на "внешние" изменения hash (клики по Link'ам).
	*/
    useEffect(() => {
        if (!syncHash || sections.length === 0) return

        const hash = location.hash.replace('#', '')
        if (!hash) {
            lastHandledHashRef.current = null
            return
        }

        if (lastHandledHashRef.current === hash) {
            return
        }

        const idx = sections.findIndex(s => s.anchor === hash)
        if (idx < 0) return

        programmaticTargetIndexRef.current = idx
        lastHandledHashRef.current = hash

        scrollToAnchor(hash, {
            behavior: 'smooth',
            offsetTop,
            withTransitionPulse: true
        })
    }, [location.hash, sections, syncHash, offsetTop])

    /*
		Синхронизация currentIndex с ручным и программным скроллом.

		- Слушаем scroll на .app.
		- Считаем "линию якоря" (scrollTop + anchorOffset).
		- Находим секцию, чей top ближе всего к этой линии.
		- Обновляем currentIndex.
	*/
    useEffect(() => {
        if (!trackScrollEffective || sections.length === 0) {
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
    }, [sections, trackScrollEffective, offsetTop])

    /*
		Сбрасываем "целевой" индекс, когда фактический currentIndex доехал до него.
	*/
    useEffect(() => {
        const target = programmaticTargetIndexRef.current
        if (target === null) return

        if (target === currentIndex) {
            programmaticTargetIndexRef.current = null
        }
    }, [currentIndex])

    /*
		Программный переход по секциям (стрелки).
	*/
    const goToIndex = useCallback(
        (nextIndex: number) => {
            if (nextIndex < 0 || nextIndex >= sections.length) return

            const section = sections[nextIndex]
            if (!section?.anchor) return

            programmaticTargetIndexRef.current = nextIndex

            if (syncHash) {
                navigate(`#${section.anchor}`)
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
        goToIndex(currentIndex - stepEffective)
    }, [currentIndex, goToIndex, stepEffective])

    const handleNext = useCallback(() => {
        goToIndex(currentIndex + stepEffective)
    }, [currentIndex, goToIndex, stepEffective])

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
