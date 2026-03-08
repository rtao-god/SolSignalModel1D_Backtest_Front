import {
    KeyboardEvent,
    MouseEvent,
    ReactNode,
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
} from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Portal, Text } from '@/shared/ui'
import useClickOutside from '@/shared/lib/hooks/useClickOutside'
import cls from './TermTooltip.module.scss'
import { TextTag } from '../../Text/ui/Text/types'

interface TermTooltipProps {
    term: string
    description: ReactNode | (() => ReactNode)
    tooltipTitle?: string
    type?: TextTag
    className?: string
    align?: 'left' | 'right'
}

function resolveTooltipDescription(description: ReactNode | (() => ReactNode)): ReactNode {
    return typeof description === 'function' ? description() : description
}

const HOVER_OPEN_DELAY_MS = 170
const HOVER_HIDE_DELAY_MS = 120

const OPEN_TOOLTIP_COUNT_BY_TREE = new Map<string, number>()
let ACTIVE_TOOLTIP_TREE_ID: string | null = null
const ACTIVE_NESTED_TOOLTIP_BY_TREE = new Map<string, { instanceId: string; close: () => void }>()
const PINNED_DESCENDANT_COUNT_BY_INSTANCE = new Map<string, number>()
const TOOLTIP_INSTANCE_CONTROLLERS = new Map<
    string,
    {
        setPinnedDescendantCount: (count: number) => void
        getParentInstanceId: () => string | null
    }
>()

function canActivateTooltipTree(treeId: string): boolean {
    if (ACTIVE_TOOLTIP_TREE_ID !== null && !OPEN_TOOLTIP_COUNT_BY_TREE.has(ACTIVE_TOOLTIP_TREE_ID)) {
        ACTIVE_TOOLTIP_TREE_ID = null
    }

    return ACTIVE_TOOLTIP_TREE_ID === null || ACTIVE_TOOLTIP_TREE_ID === treeId
}

function registerTooltipOpen(treeId: string): void {
    ACTIVE_TOOLTIP_TREE_ID = treeId
    OPEN_TOOLTIP_COUNT_BY_TREE.set(treeId, (OPEN_TOOLTIP_COUNT_BY_TREE.get(treeId) ?? 0) + 1)
}

function registerTooltipClose(treeId: string): void {
    const currentCount = OPEN_TOOLTIP_COUNT_BY_TREE.get(treeId)
    if (!currentCount) {
        return
    }

    if (currentCount <= 1) {
        OPEN_TOOLTIP_COUNT_BY_TREE.delete(treeId)
    } else {
        OPEN_TOOLTIP_COUNT_BY_TREE.set(treeId, currentCount - 1)
    }

    if (ACTIVE_TOOLTIP_TREE_ID === treeId && !OPEN_TOOLTIP_COUNT_BY_TREE.has(treeId)) {
        ACTIVE_TOOLTIP_TREE_ID = null
    }
}

function registerTooltipInstanceController(
    instanceId: string,
    controller: {
        setPinnedDescendantCount: (count: number) => void
        getParentInstanceId: () => string | null
    }
): void {
    TOOLTIP_INSTANCE_CONTROLLERS.set(instanceId, controller)
    controller.setPinnedDescendantCount(PINNED_DESCENDANT_COUNT_BY_INSTANCE.get(instanceId) ?? 0)
}

function unregisterTooltipInstanceController(instanceId: string): void {
    TOOLTIP_INSTANCE_CONTROLLERS.delete(instanceId)
}

function propagatePinnedStateToAncestors(instanceId: string | null, delta: 1 | -1): void {
    let currentInstanceId = instanceId

    while (currentInstanceId) {
        const currentCount = PINNED_DESCENDANT_COUNT_BY_INSTANCE.get(currentInstanceId) ?? 0
        const nextCount = Math.max(0, currentCount + delta)

        if (nextCount === 0) {
            PINNED_DESCENDANT_COUNT_BY_INSTANCE.delete(currentInstanceId)
        } else {
            PINNED_DESCENDANT_COUNT_BY_INSTANCE.set(currentInstanceId, nextCount)
        }

        TOOLTIP_INSTANCE_CONTROLLERS.get(currentInstanceId)?.setPinnedDescendantCount(nextCount)
        currentInstanceId = TOOLTIP_INSTANCE_CONTROLLERS.get(currentInstanceId)?.getParentInstanceId() ?? null
    }
}

export default function TermTooltip({
    term,
    description,
    tooltipTitle,
    type = 'h3',
    className,
    align = 'left'
}: TermTooltipProps) {
    const [hovered, setHovered] = useState(false)
    const [pinned, setPinned] = useState(false)
    const [pinnedDescendantCount, setPinnedDescendantCount] = useState(0)

    const instanceId = useId()
    const rootRef = useRef<HTMLSpanElement | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)
    const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const treeIdRef = useRef<string>(instanceId)
    const isNestedTooltipRef = useRef(false)
    const isRegisteredOpenRef = useRef(false)
    const parentTooltipInstanceIdRef = useRef<string | null>(null)
    const isPinnedPropagatedRef = useRef(false)

    const open = hovered || pinned || pinnedDescendantCount > 0
    const resolvedDescription = useMemo(() => {
        if (!open) {
            return null
        }

        return resolveTooltipDescription(description)
    }, [description, open])

    const resolveTooltipTreeId = useCallback((): string => {
        const rootEl = rootRef.current
        if (!rootEl) {
            isNestedTooltipRef.current = false
            return instanceId
        }

        const parentTooltipOverlay = rootEl.closest('[data-term-tooltip-overlay]') as HTMLElement | null
        isNestedTooltipRef.current = Boolean(parentTooltipOverlay)
        parentTooltipInstanceIdRef.current = parentTooltipOverlay?.dataset.termTooltipInstanceId?.trim() ?? null
        const inheritedTreeId = parentTooltipOverlay?.dataset.termTooltipTreeId
        return inheritedTreeId && inheritedTreeId.trim().length > 0 ? inheritedTreeId : instanceId
    }, [instanceId])

    const tryActivateTooltipTree = useCallback((): boolean => {
        const treeId = resolveTooltipTreeId()
        treeIdRef.current = treeId
        return canActivateTooltipTree(treeId)
    }, [resolveTooltipTreeId])

    const cancelHide = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current)
            hideTimeoutRef.current = null
        }
    }, [])

    const cancelShow = useCallback(() => {
        if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current)
            showTimeoutRef.current = null
        }
    }, [])

    const scheduleShow = useCallback(() => {
        cancelShow()
        showTimeoutRef.current = setTimeout(() => {
            if (!tryActivateTooltipTree()) {
                return
            }

            setHovered(true)
        }, HOVER_OPEN_DELAY_MS)
    }, [cancelShow, tryActivateTooltipTree])

    const scheduleHide = useCallback(() => {
        cancelShow()
        cancelHide()
        hideTimeoutRef.current = setTimeout(() => {
            setHovered(false)
        }, HOVER_HIDE_DELAY_MS)
    }, [cancelHide, cancelShow])

    const handleTermEnter = useCallback(() => {
        cancelHide()
        if (!tryActivateTooltipTree()) {
            return
        }
        scheduleShow()
    }, [cancelHide, tryActivateTooltipTree, scheduleShow])

    const handleTermLeave = useCallback(() => {
        scheduleHide()
    }, [scheduleHide])

    const handleTooltipEnter = useCallback(() => {
        cancelShow()
        cancelHide()
        setHovered(true)
    }, [cancelHide, cancelShow])

    const handleTooltipLeave = useCallback(() => {
        scheduleHide()
    }, [scheduleHide])

    const togglePinned = useCallback(() => {
        cancelShow()
        cancelHide()
        setPinned(prev => {
            if (prev) {
                if (isNestedTooltipRef.current) {
                    // Для вложенных подсказок повторный клик оставляет закрепление.
                    // Снятие закрепления происходит только внешним кликом/переключением на другой термин.
                    return true
                }
                return false
            }

            if (!tryActivateTooltipTree()) {
                return prev
            }

            return true
        })
    }, [cancelHide, cancelShow, tryActivateTooltipTree])

    const closeTooltipImmediately = useCallback(() => {
        cancelShow()
        cancelHide()
        setHovered(false)
        setPinned(false)
    }, [cancelHide, cancelShow])

    const pinTooltipIfNested = useCallback(() => {
        if (!isNestedTooltipRef.current) {
            return
        }

        cancelShow()
        cancelHide()
        setPinned(true)
    }, [cancelHide, cancelShow])

    const clickParentButtonIfExists = useCallback((target: HTMLElement): boolean => {
        const parentButton = target.closest('button')
        if (!parentButton) {
            return false
        }

        parentButton.click()
        return true
    }, [])

    const handleTermClick = useCallback(
        (event: MouseEvent<HTMLSpanElement>) => {
            if (clickParentButtonIfExists(event.currentTarget)) {
                return
            }

            togglePinned()
        },
        [clickParentButtonIfExists, togglePinned]
    )

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLSpanElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                if (clickParentButtonIfExists(event.currentTarget)) {
                    return
                }

                togglePinned()
            }
        },
        [clickParentButtonIfExists, togglePinned]
    )

    const handleTooltipClick = useCallback(() => {
        pinTooltipIfNested()
    }, [pinTooltipIfNested])

    useClickOutside(
        rootRef,
        () => {
            cancelShow()
            cancelHide()
            setHovered(false)
            setPinned(false)
        },
        tooltipRef,
        event => {
            const target = event.target
            if (!(target instanceof HTMLElement)) {
                return false
            }

            const overlay = target.closest('[data-term-tooltip-overlay]') as HTMLElement | null
            return overlay?.dataset.termTooltipTreeId === treeIdRef.current
        }
    )

    useEffect(() => {
        registerTooltipInstanceController(instanceId, {
            setPinnedDescendantCount: setPinnedDescendantCount,
            getParentInstanceId: () => parentTooltipInstanceIdRef.current
        })

        return () => {
            unregisterTooltipInstanceController(instanceId)
        }
    }, [instanceId])

    useEffect(() => {
        if (pinned && !isPinnedPropagatedRef.current) {
            // Закреплённая вложенная подсказка должна удерживать открытыми все свои
            // родительские overlay в текущем tooltip-tree, иначе дочерний tooltip исчезнет
            // при обычном mouseleave родителя.
            propagatePinnedStateToAncestors(parentTooltipInstanceIdRef.current, 1)
            isPinnedPropagatedRef.current = true
            return
        }

        if (!pinned && isPinnedPropagatedRef.current) {
            propagatePinnedStateToAncestors(parentTooltipInstanceIdRef.current, -1)
            isPinnedPropagatedRef.current = false
        }
    }, [pinned])

    useEffect(() => {
        if (open && isNestedTooltipRef.current) {
            activateNestedTooltip(treeIdRef.current, instanceId, closeTooltipImmediately)
            return
        }

        if (!open && isNestedTooltipRef.current) {
            releaseNestedTooltip(treeIdRef.current, instanceId)
        }
    }, [closeTooltipImmediately, instanceId, open])

    useEffect(() => {
        if (open && !isRegisteredOpenRef.current) {
            registerTooltipOpen(treeIdRef.current)
            isRegisteredOpenRef.current = true
            return
        }

        if (!open && isRegisteredOpenRef.current) {
            registerTooltipClose(treeIdRef.current)
            isRegisteredOpenRef.current = false
        }
    }, [open])

    useEffect(() => {
        return () => {
            cancelShow()
            cancelHide()
        }
    }, [cancelHide, cancelShow])

    useEffect(() => {
        return () => {
            if (!isRegisteredOpenRef.current) {
                return
            }

            registerTooltipClose(treeIdRef.current)
            isRegisteredOpenRef.current = false
        }
    }, [])

    useEffect(() => {
        return () => {
            if (!isPinnedPropagatedRef.current) {
                return
            }

            propagatePinnedStateToAncestors(parentTooltipInstanceIdRef.current, -1)
            isPinnedPropagatedRef.current = false
        }
    }, [])

    useEffect(() => {
        return () => {
            releaseNestedTooltip(treeIdRef.current, instanceId)
        }
    }, [instanceId])

    useLayoutEffect(() => {
        if (!open) return
        if (typeof window === 'undefined') return

        const handle = () => {
            if (!rootRef.current || !tooltipRef.current) return
            const viewportWidth = document.documentElement.clientWidth
            const viewportHeight = document.documentElement.clientHeight
            const tooltipEl = tooltipRef.current
            const rootEl = rootRef.current
            const parentTooltipOverlay = rootEl.closest('[data-term-tooltip-overlay]') as HTMLDivElement | null
            const isNestedTooltip = Boolean(parentTooltipOverlay)

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
            const minTop = bounds.top
            const maxTop = Math.max(minTop, bounds.bottom - tooltipRect.height)

            let desiredLeft = 0
            let desiredTop = 0

            if (isNestedTooltip) {
                // Для вложенного tooltip привязываемся к контейнеру основной подсказки:
                // размещаем сразу за её правой/левой границей.
                const sideGap = 8
                const parentRect = parentTooltipOverlay ? parentTooltipOverlay.getBoundingClientRect() : rootRect
                const rightSpace = bounds.right - parentRect.right
                const leftSpace = parentRect.left - bounds.left
                const canPlaceRight = parentRect.right + sideGap + tooltipRect.width <= bounds.right
                const canPlaceLeft = parentRect.left - sideGap - tooltipRect.width >= bounds.left

                if (canPlaceRight && (!canPlaceLeft || rightSpace >= leftSpace)) {
                    desiredLeft = parentRect.right + sideGap
                } else if (canPlaceLeft) {
                    desiredLeft = parentRect.left - sideGap - tooltipRect.width
                } else {
                    desiredLeft =
                        rightSpace >= leftSpace ?
                            parentRect.right + sideGap
                        :   parentRect.left - sideGap - tooltipRect.width
                }

                desiredTop = parentRect.top
            } else {
                const termCenterX = rootRect.left + rootRect.width / 2
                desiredLeft = termCenterX - tooltipRect.width / 2

                const gap = 6
                const fitsBelow = rootRect.bottom + gap + tooltipRect.height <= bounds.bottom
                const fitsAbove = rootRect.top - gap - tooltipRect.height >= bounds.top
                desiredTop = rootRect.bottom + gap
                if (!fitsBelow && fitsAbove) {
                    desiredTop = rootRect.top - gap - tooltipRect.height
                }
            }

            if (desiredLeft < minLeft) desiredLeft = minLeft
            if (desiredLeft > maxLeft) desiredLeft = maxLeft
            if (desiredTop < minTop) desiredTop = minTop
            if (desiredTop > maxTop) desiredTop = maxTop

            const docLeft = desiredLeft + window.scrollX
            const docTop = desiredTop + window.scrollY

            tooltipEl.style.position = 'absolute'
            tooltipEl.style.zIndex = isNestedTooltip ? '2200' : '2000'
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
                        data-term-tooltip-instance-id={instanceId}
                        className={cls.termInner}
                        onMouseEnter={handleTermEnter}
                        onMouseLeave={handleTermLeave}
                        onClick={handleTermClick}
                        onKeyDown={handleKeyDown}
                        role='button'
                        tabIndex={0}
                        aria-label={`Что такое ${term}?`}
                        aria-expanded={open}>
                        {term}
                    </span>
                </Text>
            </span>

            {open && (
                <Portal>
                    <div
                        ref={tooltipRef}
                        className={classNames(cls.tooltip, { [cls.tooltipVisible]: open }, [tooltipAlignClass])}
                        data-term-tooltip-overlay
                        data-term-tooltip-instance-id={instanceId}
                        data-term-tooltip-tree-id={treeIdRef.current}
                        role='tooltip'
                        onMouseEnter={handleTooltipEnter}
                        onMouseLeave={handleTooltipLeave}
                        onClick={handleTooltipClick}>
                        <div className={cls.tooltipContent}>
                            <Text type='p' className={cls.tooltipTitle}>
                                {tooltipTitle ?? term}
                            </Text>
                            <div className={cls.tooltipBody}>{resolvedDescription}</div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    )
}

function activateNestedTooltip(treeId: string, instanceId: string, close: () => void): void {
    const currentNestedTooltip = ACTIVE_NESTED_TOOLTIP_BY_TREE.get(treeId)
    if (currentNestedTooltip && currentNestedTooltip.instanceId !== instanceId) {
        currentNestedTooltip.close()
    }

    ACTIVE_NESTED_TOOLTIP_BY_TREE.set(treeId, { instanceId, close })
}

function releaseNestedTooltip(treeId: string, instanceId: string): void {
    const currentNestedTooltip = ACTIVE_NESTED_TOOLTIP_BY_TREE.get(treeId)
    if (!currentNestedTooltip || currentNestedTooltip.instanceId !== instanceId) {
        return
    }

    ACTIVE_NESTED_TOOLTIP_BY_TREE.delete(treeId)
}
