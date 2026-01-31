import { KeyboardEvent, ReactNode, useCallback, useLayoutEffect, useRef, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import useClickOutside from '@/shared/lib/hooks/useClickOutside'
import cls from './TermTooltip.module.scss'
import { TextTag } from '../../Text/ui/Text/types'

interface TermTooltipProps {
    term: string
    description: ReactNode
    type?: TextTag
    className?: string
    align?: 'left' | 'right'
}

/*
	Термин с подсказкой.

	- Слово подчёркнуто пунктиром и кликабельно.
	- По hover/клику открывается тултип.
	- На узких экранах позиция тултипа клампится по viewport с учётом отступов .main.
*/
export default function TermTooltip({ term, description, type = 'h3', className, align = 'left' }: TermTooltipProps) {
    const [hovered, setHovered] = useState(false)
    const [pinned, setPinned] = useState(false)

    const rootRef = useRef<HTMLSpanElement | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const open = hovered || pinned

    const cancelHide = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current)
            hideTimeoutRef.current = null
        }
    }, [])

    const scheduleHide = useCallback(() => {
        cancelHide()
        hideTimeoutRef.current = setTimeout(() => {
            setHovered(false)
        }, 120)
    }, [cancelHide])

    const handleTermEnter = useCallback(() => {
        cancelHide()
        setHovered(true)
    }, [cancelHide])

    const handleTermLeave = useCallback(() => {
        scheduleHide()
    }, [scheduleHide])

    const handleTooltipEnter = useCallback(() => {
        cancelHide()
        setHovered(true)
    }, [cancelHide])

    const handleTooltipLeave = useCallback(() => {
        scheduleHide()
    }, [scheduleHide])

    const togglePinned = useCallback(() => {
        setPinned(prev => !prev)
    }, [])

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLSpanElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                togglePinned()
            }
        },
        [togglePinned]
    )

    useClickOutside(rootRef, () => {
        cancelHide()
        setHovered(false)
        setPinned(false)
    })

    // Кламп по горизонтали на узких экранах, чтобы тултип не вылезал за страницу.
    useLayoutEffect(() => {
        if (!open) return
        if (!rootRef.current || !tooltipRef.current) return
        if (typeof window === 'undefined') return

        const viewportWidth = document.documentElement.clientWidth
        const isNarrow = viewportWidth <= 576 // В синхроне с .main @media.

        const tooltipEl = tooltipRef.current

        if (!isNarrow) {
            // На десктопе полагаемся на классы tooltipLeft/tooltipRight.
            tooltipEl.style.left = ''
            tooltipEl.style.right = ''
            return
        }

        const MAIN_PADDING = 15 // Как в .main для max-width: 576px.

        const rootRect = rootRef.current.getBoundingClientRect()

        // Сбрасываем inline-координаты, чтобы корректно измерить ширину.
        tooltipEl.style.left = ''
        tooltipEl.style.right = ''

        const tooltipRect = tooltipEl.getBoundingClientRect()

        const minLeft = MAIN_PADDING
        const maxLeft = viewportWidth - MAIN_PADDING - tooltipRect.width

        const termCenterX = rootRect.left + rootRect.width / 2
        let desiredLeft = termCenterX - tooltipRect.width / 2

        if (desiredLeft < minLeft) desiredLeft = minLeft
        if (desiredLeft > maxLeft) desiredLeft = maxLeft

        const relativeLeft = desiredLeft - rootRect.left

        tooltipEl.style.left = `${relativeLeft}px`
        tooltipEl.style.right = 'auto'
    }, [open])

    const tooltipAlignClass = align === 'right' ? cls.tooltipRight : cls.tooltipLeft

    return (
        <span ref={rootRef} className={classNames(cls.TermTooltip, {}, [className ?? ''])}>
            <Text type={type} className={cls.termText}>
                <span
                    className={cls.termInner}
                    onMouseEnter={handleTermEnter}
                    onMouseLeave={handleTermLeave}
                    onClick={togglePinned}
                    onKeyDown={handleKeyDown}
                    role='button'
                    tabIndex={0}
                    aria-label={`Что такое ${term}?`}
                    aria-expanded={open}>
                    {term}
                </span>
            </Text>

            <div
                ref={tooltipRef}
                className={classNames(cls.tooltip, { [cls.tooltipVisible]: open }, [tooltipAlignClass])}
                role='tooltip'
                onMouseEnter={handleTooltipEnter}
                onMouseLeave={handleTooltipLeave}>
                <div className={cls.tooltipContent}>
                    <Text type='p' className={cls.tooltipTitle}>
                        {term}
                    </Text>
                    <div className={cls.tooltipBody}>{description}</div>
                </div>
            </div>
        </span>
    )
}

