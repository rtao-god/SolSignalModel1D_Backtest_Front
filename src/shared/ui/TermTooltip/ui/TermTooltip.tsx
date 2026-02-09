import { KeyboardEvent, ReactNode, useCallback, useLayoutEffect, useRef, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Portal, Text } from '@/shared/ui'
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
    }, tooltipRef)
    useLayoutEffect(() => {
        if (!open) return
        if (typeof window === 'undefined') return

        const handle = () => {
            if (!rootRef.current || !tooltipRef.current) return
            const viewportWidth = document.documentElement.clientWidth
            const viewportHeight = document.documentElement.clientHeight
            const tooltipEl = tooltipRef.current
            const rootEl = rootRef.current

            const isNarrow = viewportWidth <= 576
            const MAIN_PADDING = isNarrow ? 15 : 12

            const rootRect = rootEl.getBoundingClientRect()

            tooltipEl.style.left = ''
            tooltipEl.style.right = ''
            tooltipEl.style.top = ''

            const tooltipRect = tooltipEl.getBoundingClientRect()

            const resolveClampBounds = () => {
                const boundary = rootEl.closest('[data-tooltip-boundary]') as HTMLElement | null
                if (!boundary) {
                    return {
                        left: MAIN_PADDING,
                        right: viewportWidth - MAIN_PADDING,
                        top: MAIN_PADDING,
                        bottom: viewportHeight - MAIN_PADDING
                    }
                }

                const boundaryRect = boundary.getBoundingClientRect()
                const style = window.getComputedStyle(boundary)
                const padLeft = parseFloat(style.paddingLeft || '0') || 0
                const padRight = parseFloat(style.paddingRight || '0') || 0
                const padTop = parseFloat(style.paddingTop || '0') || 0
                const padBottom = parseFloat(style.paddingBottom || '0') || 0

                const left = boundaryRect.left + padLeft
                const right = boundaryRect.right - padRight
                const top = boundaryRect.top + padTop
                const bottom = boundaryRect.bottom - padBottom

                if (right <= left || bottom <= top) {
                    return {
                        left: MAIN_PADDING,
                        right: viewportWidth - MAIN_PADDING,
                        top: MAIN_PADDING,
                        bottom: viewportHeight - MAIN_PADDING
                    }
                }

                return {
                    left: Math.max(left, MAIN_PADDING),
                    right: Math.min(right, viewportWidth - MAIN_PADDING),
                    top: Math.max(top, MAIN_PADDING),
                    bottom: Math.min(bottom, viewportHeight - MAIN_PADDING)
                }
            }

            const bounds = resolveClampBounds()

            const minLeft = bounds.left
            const maxLeft = Math.max(minLeft, bounds.right - tooltipRect.width)

            const termCenterX = rootRect.left + rootRect.width / 2
            let desiredLeft = termCenterX - tooltipRect.width / 2

            if (desiredLeft < minLeft) desiredLeft = minLeft
            if (desiredLeft > maxLeft) desiredLeft = maxLeft

            const gap = 6
            const fitsBelow = rootRect.bottom + gap + tooltipRect.height <= bounds.bottom
            const fitsAbove = rootRect.top - gap - tooltipRect.height >= bounds.top
            let desiredTop = rootRect.bottom + gap
            if (!fitsBelow && fitsAbove) {
                desiredTop = rootRect.top - gap - tooltipRect.height
            }

            if (desiredTop + tooltipRect.height > bounds.bottom) {
                desiredTop = bounds.bottom - tooltipRect.height
            }
            if (desiredTop < bounds.top) desiredTop = bounds.top

            const docLeft = desiredLeft + window.scrollX
            const docTop = desiredTop + window.scrollY

            tooltipEl.style.position = 'absolute'
            tooltipEl.style.left = `${docLeft}px`
            tooltipEl.style.top = `${docTop}px`
            tooltipEl.style.right = 'auto'
        }

        handle()

        window.addEventListener('resize', handle)
        window.addEventListener('scroll', handle, true)

        return () => {
            window.removeEventListener('resize', handle)
            window.removeEventListener('scroll', handle, true)
        }
    }, [open])

    const tooltipAlignClass = align === 'right' ? cls.tooltipRight : cls.tooltipLeft

    return (
        <>
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
            </span>

            <Portal>
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
            </Portal>
        </>
    )
}
