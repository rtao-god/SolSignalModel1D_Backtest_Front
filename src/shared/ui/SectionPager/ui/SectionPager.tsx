import { useCallback } from 'react'
import cls from './SectionPager.module.scss'

interface SectionPagerItem {
    id: string
    anchor: string
}

interface SectionPagerProps {
    sections: SectionPagerItem[]
    currentIndex: number
    canPrev?: boolean
    canNext?: boolean
    onPrev?: () => void
    onNext?: () => void

    /**
     * Старый вариант обратно-совместимого API:
     * только currentIndex + onNavigate.
     * Если onPrev/onNext не переданы, используем этот колбэк.
     */
    onNavigate?: (index: number) => void
}

export default function SectionPager({
    sections,
    currentIndex,
    canPrev,
    canNext,
    onPrev,
    onNext,
    onNavigate
}: SectionPagerProps) {
    if (sections.length <= 1) return null

    const hasPrev = typeof canPrev === 'boolean' ? canPrev : currentIndex > 0
    const hasNext = typeof canNext === 'boolean' ? canNext : currentIndex < sections.length - 1

    const handlePrevClick = useCallback(() => {
        if (!hasPrev) return

        if (onPrev) {
            onPrev()
        } else if (onNavigate) {
            onNavigate(currentIndex - 1)
        }
    }, [hasPrev, onPrev, onNavigate, currentIndex])

    const handleNextClick = useCallback(() => {
        if (!hasNext) return

        if (onNext) {
            onNext()
        } else if (onNavigate) {
            onNavigate(currentIndex + 1)
        }
    }, [hasNext, onNext, onNavigate, currentIndex])

    return (
        <div className={cls.pager}>
            {hasPrev && (
                <button className={cls.btn} type='button' onClick={handlePrevClick} aria-label='Предыдущий раздел'>
                    <span className={cls.arrow}>↑</span>
                </button>
            )}
            {hasNext && (
                <button className={cls.btn} type='button' onClick={handleNextClick} aria-label='Следующий раздел'>
                    <span className={cls.arrow}>↓</span>
                </button>
            )}
        </div>
    )
}
