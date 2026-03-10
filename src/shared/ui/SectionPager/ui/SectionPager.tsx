import { useCallback } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './SectionPager.module.scss'
import { Btn } from '../../Btn'
import { useTranslation } from 'react-i18next'

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

    onNavigate?: (index: number) => void

    variant?: SectionPagerVariant
    canGroupPrev?: boolean
    canGroupNext?: boolean
    onGroupPrev?: () => void
    onGroupNext?: () => void
    groupStatus?: { current: number; total: number }
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
    const { t } = useTranslation('common')

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
                    <Btn
                        className={cls.btn}
                        onClick={handlePrevClick}
                        aria-label={t('sectionPager.vertical.prevAria', {
                            defaultValue: 'Previous section'
                        })}>
                        <span className={cls.arrow}>↑</span>
                    </Btn>
                )}
                {hasNext && (
                    <Btn
                        className={cls.btn}
                        onClick={handleNextClick}
                        aria-label={t('sectionPager.vertical.nextAria', {
                            defaultValue: 'Next section'
                        })}>
                        <span className={cls.arrow}>↓</span>
                    </Btn>
                )}
            </div>
        )
    }
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

    const statusText = groupStatus && groupStatus.total > 0 ? `${groupStatus.current}/${groupStatus.total}` : null

    return (
        <div className={pagerClassName}>
            <div
                className={cls.dpad}
                aria-label={t('sectionPager.dpad.ariaLabel', {
                    defaultValue: 'Report navigation'
                })}>
                <div className={cls.dpadBase} aria-hidden='true' />

                <div className={cls.dpadUpWrap}>
                    <Btn
                        className={classNames(cls.btn, { [cls.btnDisabled]: !hasPrev }, [])}
                        onClick={handleUp}
                        aria-label={t('sectionPager.dpad.upAria', {
                            defaultValue: 'Up (inside current reports)'
                        })}
                        disabled={!hasPrev}>
                        <span className={cls.arrow}>↑</span>
                    </Btn>
                </div>

                <div className={cls.dpadDownWrap}>
                    <Btn
                        className={classNames(cls.btn, { [cls.btnDisabled]: !hasNext }, [])}
                        onClick={handleDown}
                        aria-label={t('sectionPager.dpad.downAria', {
                            defaultValue: 'Down (inside current reports)'
                        })}
                        disabled={!hasNext}>
                        <span className={cls.arrow}>↓</span>
                    </Btn>
                </div>

                {hasGroupPrev && (
                    <div className={classNames(cls.dpadLeftWrap, {}, [])}>
                        <span className={cls.groupStatus} aria-hidden='true'>
                            {statusText}
                        </span>
                        <Btn
                            className={cls.btn}
                            onClick={handleLeft}
                            aria-label={t('sectionPager.dpad.prevPageAria', {
                                defaultValue: 'Previous report page'
                            })}>
                            <span className={cls.arrow}>←</span>
                        </Btn>
                    </div>
                )}

                {hasGroupNext && (
                    <div className={classNames(cls.dpadRightWrap, {}, [])}>
                        <span className={cls.groupStatus} aria-hidden='true'>
                            {statusText}
                        </span>
                        <Btn
                            className={cls.btn}
                            onClick={handleRight}
                            aria-label={t('sectionPager.dpad.nextPageAria', {
                                defaultValue: 'Next report page'
                            })}>
                            <span className={cls.arrow}>→</span>
                        </Btn>
                    </div>
                )}
            </div>
        </div>
    )
}
