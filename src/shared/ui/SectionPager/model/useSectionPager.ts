import { useCallback, useEffect, useState } from 'react'
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
    currentIndex: number
    canPrev: boolean
    canNext: boolean
    handlePrev: () => void
    handleNext: () => void
}

/**
 * Общая логика пагинации по секциям:
 * - хранит currentIndex;
 * - реагирует на смену hash;
 * - при стрелках либо меняет hash через navigate (и скролл делает эффект),
 *   либо скроллит локально без изменения URL (syncHash=false).
 */
export function useSectionPager({
    sections,
    syncHash = true,
    offsetTop
}: UseSectionPagerOptions): UseSectionPagerResult {
    const location = useLocation()
    const navigate = useNavigate()
    const [currentIndex, setCurrentIndex] = useState(0)

    // Держим currentIndex в допустимых границах при изменении списка секций
    useEffect(() => {
        if (sections.length === 0) {
            if (currentIndex !== 0) {
                setCurrentIndex(0)
            }
            return
        }

        if (currentIndex >= sections.length) {
            setCurrentIndex(sections.length - 1)
        }
    }, [sections.length, currentIndex])

    // Реакция на изменение hash (подвкладки / прямые ссылки).
      useEffect(() => {
          if (!syncHash || sections.length === 0) return

          const hash = location.hash.replace('#', '')
          if (!hash) return

          const idx = sections.findIndex(s => s.anchor === hash)
          if (idx < 0) return

          setCurrentIndex(idx)

          scrollToAnchor(hash, {
              behavior: 'smooth',
              offsetTop,
              // Включаем визуальный переход при смене hash (переход по подвкладке).
              withTransitionPulse: true
          })
      }, [location.hash, sections, syncHash, offsetTop])


    const goToIndex = useCallback(
        (nextIndex: number) => {
            if (nextIndex < 0 || nextIndex >= sections.length) return

            const section = sections[nextIndex]
            if (!section?.anchor) return

            setCurrentIndex(nextIndex)

            if (syncHash) {
                // Меняем hash → useEffect выше сам сделает scrollToAnchor.
                navigate(`#${section.anchor}`)
            } else {
                // Локальная пагинация без hash — сразу скроллим.
                scrollToAnchor(section.anchor, { behavior: 'smooth', offsetTop, withTransitionPulse: true })
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
