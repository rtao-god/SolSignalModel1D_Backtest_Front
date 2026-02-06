import { useCallback } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './SectionPager.module.scss'
import { Btn } from '../../Btn'

interface SectionPagerItem {
    id: string
    anchor: string
}

type SectionPagerVariant = 'vertical' | 'dpad'

interface SectionPagerProps {
    sections: SectionPagerItem[]
    currentIndex: number
    canPrev?: boolean
    canNext?: boolean
    onPrev?: () => void
    onNext?: () => void

    /*
		Старый вариант обратно-совместимого API.

		- Только currentIndex + onNavigate.
		- Если onPrev/onNext не переданы, используем этот колбэк.
	*/
    onNavigate?: (index: number) => void

    /*
        Вариант UI.

        - vertical: текущие ↑/↓
        - dpad: 4-направления (↑/↓ секции, ←/→ "группы"/страницы)
    */
    variant?: SectionPagerVariant

    // Навигация по "группам" (например, страницы по 10 элементов).
    canGroupPrev?: boolean
    canGroupNext?: boolean
    onGroupPrev?: () => void
    onGroupNext?: () => void

    // Статус группы (показываем только при hover по ←/→).
    groupStatus?: { current: number; total: number }

    // Прижимает dpad-пейджер к правому краю (для плотных страниц).
    tightRight?: boolean
}

export default function SectionPager({
    sections,
    currentIndex,
    canPrev,
    canNext,
    onPrev,
    onNext,
    onNavigate,
    variant = 'vertical',
    canGroupPrev,
    canGroupNext,
    onGroupPrev,
    onGroupNext,
    groupStatus,
    tightRight = false
}: SectionPagerProps) {
    const hasPrev = typeof canPrev === 'boolean' ? canPrev : currentIndex > 0
    const hasNext = typeof canNext === 'boolean' ? canNext : currentIndex < sections.length - 1

    const hasGroupPrev = Boolean(canGroupPrev)
    const hasGroupNext = Boolean(canGroupNext)

    const pagerClassName = classNames(
        cls.pager,
        { [cls.pagerDpad]: variant === 'dpad', [cls.pagerTight]: tightRight },
        []
    )

    if (variant === 'vertical') {
        if (sections.length <= 1) return null

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
            <div className={pagerClassName}>
                {hasPrev && (
                    <Btn className={cls.btn} onClick={handlePrevClick} aria-label='Предыдущий раздел'>
                        <span className={cls.arrow}>↑</span>
                    </Btn>
                )}
                {hasNext && (
                    <Btn className={cls.btn} onClick={handleNextClick} aria-label='Следующий раздел'>
                        <span className={cls.arrow}>↓</span>
                    </Btn>
                )}
            </div>
        )
    }

    // dpad
    if (sections.length <= 1 && !hasGroupPrev && !hasGroupNext) {
        return null
    }

    const handleUp = useCallback(() => {
        if (!hasPrev) return
        if (onPrev) {
            onPrev()
            return
        }
        if (onNavigate) {
            onNavigate(Math.max(0, currentIndex - 1))
        }
    }, [hasPrev, onPrev, onNavigate, currentIndex])

    const handleDown = useCallback(() => {
        if (!hasNext) return
        if (onNext) {
            onNext()
            return
        }
        if (onNavigate) {
            onNavigate(Math.min(sections.length - 1, currentIndex + 1))
        }
    }, [hasNext, onNext, onNavigate, currentIndex, sections.length])

    const handleLeft = useCallback(() => {
        if (!hasGroupPrev || !onGroupPrev) return
        onGroupPrev()
    }, [hasGroupPrev, onGroupPrev])

    const handleRight = useCallback(() => {
        if (!hasGroupNext || !onGroupNext) return
        onGroupNext()
    }, [hasGroupNext, onGroupNext])

    const statusText =
        groupStatus && groupStatus.total > 0 ? `${groupStatus.current}/${groupStatus.total}` : null

    return (
        <div className={pagerClassName}>
            <div className={cls.dpad} aria-label='Навигация по отчётам'>
                <div className={cls.dpadBase} aria-hidden='true' />

                <div className={cls.dpadUpWrap}>
                    <Btn
                        className={classNames(cls.btn, { [cls.btnDisabled]: !hasPrev }, [])}
                        onClick={handleUp}
                        aria-label='Выше (внутри текущих отчётов)'
                        disabled={!hasPrev}
                    >
                        <span className={cls.arrow}>↑</span>
                    </Btn>
                </div>

                <div className={cls.dpadDownWrap}>
                    <Btn
                        className={classNames(cls.btn, { [cls.btnDisabled]: !hasNext }, [])}
                        onClick={handleDown}
                        aria-label='Ниже (внутри текущих отчётов)'
                        disabled={!hasNext}
                    >
                        <span className={cls.arrow}>↓</span>
                    </Btn>
                </div>

                <div className={classNames(cls.dpadLeftWrap, {}, [])}>
                    <span className={cls.groupStatus} aria-hidden='true'>
                        {statusText}
                    </span>
                    <Btn
                        className={classNames(cls.btn, { [cls.btnDisabled]: !hasGroupPrev }, [])}
                        onClick={handleLeft}
                        aria-label='Предыдущая страница отчётов'
                        disabled={!hasGroupPrev}
                    >
                        <span className={cls.arrow}>←</span>
                    </Btn>
                </div>

                <div className={classNames(cls.dpadRightWrap, {}, [])}>
                    <span className={cls.groupStatus} aria-hidden='true'>
                        {statusText}
                    </span>
                    <Btn
                        className={classNames(cls.btn, { [cls.btnDisabled]: !hasGroupNext }, [])}
                        onClick={handleRight}
                        aria-label='Следующая страница отчётов'
                        disabled={!hasGroupNext}
                    >
                        <span className={cls.arrow}>→</span>
                    </Btn>
                </div>
            </div>
        </div>
    )
}
