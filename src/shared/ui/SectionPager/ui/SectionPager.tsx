import { useCallback } from 'react'
import cls from './SectionPager.module.scss'

interface SectionPagerProps {
    sections: { id: string; anchor: string }[]
    currentIndex: number
    onNavigate: (index: number) => void
}

export default function SectionPager({ sections, currentIndex, onNavigate }: SectionPagerProps) {
    const handlePrev = useCallback(() => {
        if (currentIndex > 0) onNavigate(currentIndex - 1)
    }, [currentIndex, onNavigate])

    const handleNext = useCallback(() => {
        if (currentIndex < sections.length - 1) onNavigate(currentIndex + 1)
    }, [currentIndex, onNavigate])

    if (sections.length <= 1) return null

    return (
        <div className={cls.pager}>
            {currentIndex > 0 && (
                <button className={cls.btn} onClick={handlePrev} aria-label='Предыдущий раздел'>
                    ↑
                </button>
            )}
            {currentIndex < sections.length - 1 && (
                <button className={cls.btn} onClick={handleNext} aria-label='Следующий раздел'>
                    ↓
                </button>
            )}
        </div>
    )
}
