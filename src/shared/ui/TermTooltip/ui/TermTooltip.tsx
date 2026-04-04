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
import { Link as RouterLink } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { Element } from '@/shared/ui/Element'
import { Portal } from '@/shared/ui/portals'
import useClickOutside from '@/shared/lib/hooks/useClickOutside'
import { enrichTermTooltipDescription } from '../lib/enrichTermTooltipDescription'
import cls from './TermTooltip.module.scss'
import { TextTag } from '../../Text/ui/Text/types'

interface TermTooltipProps {
    term: string
    displayTerm?: ReactNode
    description: ReactNode | (() => ReactNode)
    tooltipTitle?: string
    type?: TextTag
    className?: string
    align?: 'left' | 'right'
    to?: string
    onWarmup?: () => void
}

const HOVER_OPEN_DELAY_MS = 170
const HOVER_HIDE_DELAY_MS = 120
const HOVER_OPEN_RETRY_DELAY_MS = 90

const OPEN_TOOLTIP_COUNT_BY_TREE = new Map<string, number>()
let ACTIVE_TOOLTIP_TREE_ID: string | null = null
const OPEN_DESCENDANT_COUNT_BY_INSTANCE = new Map<string, number>()
// Hover по любому overlay внутри одного root tree должен удерживать открытым всё вложенное дерево,
// чтобы переход между уровнями tooltip не зависел от микрозазоров между trigger и overlay.
const HOVERED_OVERLAY_COUNT_BY_TREE = new Map<string, number>()
const TREE_OVERLAY_HOVER_SUBSCRIBERS = new Map<string, Map<string, (count: number) => void>>()
const TOOLTIP_INSTANCE_CONTROLLERS = new Map<
    string,
    {
        setOpenDescendantCount: (count: number) => void
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

function notifyTreeOverlayHoverSubscribers(treeId: string): void {
    const hoveredOverlayCount = HOVERED_OVERLAY_COUNT_BY_TREE.get(treeId) ?? 0
    TREE_OVERLAY_HOVER_SUBSCRIBERS.get(treeId)?.forEach(setHoveredOverlayCount => {
        setHoveredOverlayCount(hoveredOverlayCount)
    })
}

function registerTreeOverlayHoverSubscriber(
    treeId: string,
    instanceId: string,
    setHoveredOverlayCount: (count: number) => void
): void {
    const subscribers = TREE_OVERLAY_HOVER_SUBSCRIBERS.get(treeId) ?? new Map<string, (count: number) => void>()
    subscribers.set(instanceId, setHoveredOverlayCount)
    TREE_OVERLAY_HOVER_SUBSCRIBERS.set(treeId, subscribers)
    setHoveredOverlayCount(HOVERED_OVERLAY_COUNT_BY_TREE.get(treeId) ?? 0)
}

function unregisterTreeOverlayHoverSubscriber(treeId: string, instanceId: string): void {
    const subscribers = TREE_OVERLAY_HOVER_SUBSCRIBERS.get(treeId)
    if (!subscribers) {
        return
    }

    subscribers.delete(instanceId)
    if (subscribers.size === 0) {
        TREE_OVERLAY_HOVER_SUBSCRIBERS.delete(treeId)
        return
    }

    TREE_OVERLAY_HOVER_SUBSCRIBERS.set(treeId, subscribers)
}

function registerTreeOverlayHover(treeId: string): void {
    HOVERED_OVERLAY_COUNT_BY_TREE.set(treeId, (HOVERED_OVERLAY_COUNT_BY_TREE.get(treeId) ?? 0) + 1)
    notifyTreeOverlayHoverSubscribers(treeId)
}

function unregisterTreeOverlayHover(treeId: string): void {
    const currentCount = HOVERED_OVERLAY_COUNT_BY_TREE.get(treeId)
    if (!currentCount) {
        return
    }

    if (currentCount <= 1) {
        HOVERED_OVERLAY_COUNT_BY_TREE.delete(treeId)
    } else {
        HOVERED_OVERLAY_COUNT_BY_TREE.set(treeId, currentCount - 1)
    }

    notifyTreeOverlayHoverSubscribers(treeId)
}

function registerTooltipInstanceController(
    instanceId: string,
    controller: {
        setOpenDescendantCount: (count: number) => void
        getParentInstanceId: () => string | null
    }
): void {
    TOOLTIP_INSTANCE_CONTROLLERS.set(instanceId, controller)
    controller.setOpenDescendantCount(OPEN_DESCENDANT_COUNT_BY_INSTANCE.get(instanceId) ?? 0)
}

function unregisterTooltipInstanceController(instanceId: string): void {
    TOOLTIP_INSTANCE_CONTROLLERS.delete(instanceId)
}

function propagateOpenStateToAncestors(instanceId: string | null, delta: 1 | -1): void {
    let currentInstanceId = instanceId

    while (currentInstanceId) {
        const currentCount = OPEN_DESCENDANT_COUNT_BY_INSTANCE.get(currentInstanceId) ?? 0
        const nextCount = Math.max(0, currentCount + delta)

        if (nextCount === 0) {
            OPEN_DESCENDANT_COUNT_BY_INSTANCE.delete(currentInstanceId)
        } else {
            OPEN_DESCENDANT_COUNT_BY_INSTANCE.set(currentInstanceId, nextCount)
        }

        TOOLTIP_INSTANCE_CONTROLLERS.get(currentInstanceId)?.setOpenDescendantCount(nextCount)
        currentInstanceId = TOOLTIP_INSTANCE_CONTROLLERS.get(currentInstanceId)?.getParentInstanceId() ?? null
    }
}

export default function TermTooltip({
    term,
    displayTerm,
    description,
    tooltipTitle,
    type = 'h3',
    className,
    align = 'left',
    to,
    onWarmup
}: TermTooltipProps) {
    const [hovered, setHovered] = useState(false)
    const [pinned, setPinned] = useState(false)
    const [openDescendantCount, setOpenDescendantCount] = useState(0)
    const [treeOverlayHoverCount, setTreeOverlayHoverCount] = useState(0)

    const instanceId = useId()
    const [treeIdState, setTreeIdState] = useState(instanceId)
    const rootRef = useRef<HTMLSpanElement | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)
    const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hoverIntentRef = useRef(false)
    const treeIdRef = useRef<string>(instanceId)
    const isNestedTooltipRef = useRef(false)
    const isRegisteredOpenRef = useRef(false)
    const parentTooltipInstanceIdRef = useRef<string | null>(null)
    const isSelfOpenPropagatedRef = useRef(false)
    const isOverlayHoveredRef = useRef(false)
    const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const selfOpen = hovered || pinned
    const open = selfOpen || openDescendantCount > 0 || treeOverlayHoverCount > 0
    const normalizedTermLabel = useMemo(() => term.replace(/\s+/g, ' ').trim(), [term])
    const resolvedDescription = useMemo(() => {
        if (!open) {
            return null
        }

        return enrichTermTooltipDescription(description)
    }, [description, open])
    const scheduleWarmup = useCallback(() => {
        if (warmupTimerRef.current || open) {
            return
        }

        // Превентивно разогреваем rich-text кэш, чтобы открытие tooltip не блокировалось разбором текста.
        const warmup = () => {
            warmupTimerRef.current = null
            enrichTermTooltipDescription(description, { term })
        }

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            ;(window as typeof window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(warmup)
            return
        }

        warmupTimerRef.current = setTimeout(warmup, 0)
    }, [description, open, term])

    const resolveTooltipTreeId = useCallback((): string => {
        const rootEl = rootRef.current
        if (!rootEl) {
            isNestedTooltipRef.current = false
            treeIdRef.current = instanceId
            setTreeIdState(prevTreeId => (prevTreeId === instanceId ? prevTreeId : instanceId))
            return instanceId
        }

        const parentTooltipOverlay = rootEl.closest('[data-term-tooltip-overlay]') as HTMLElement | null
        isNestedTooltipRef.current = Boolean(parentTooltipOverlay)
        parentTooltipInstanceIdRef.current = parentTooltipOverlay?.dataset.termTooltipInstanceId?.trim() ?? null
        const inheritedTreeId = parentTooltipOverlay?.dataset.termTooltipTreeId
        const nextTreeId = inheritedTreeId && inheritedTreeId.trim().length > 0 ? inheritedTreeId : instanceId
        treeIdRef.current = nextTreeId
        setTreeIdState(prevTreeId => (prevTreeId === nextTreeId ? prevTreeId : nextTreeId))
        return nextTreeId
    }, [instanceId])

    const tryActivateTooltipTree = useCallback((): boolean => {
        const treeId = resolveTooltipTreeId()
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

        const scheduleAttempt = (delayMs: number) => {
            showTimeoutRef.current = setTimeout(() => {
                if (!hoverIntentRef.current) {
                    return
                }

                if (!tryActivateTooltipTree()) {
                    // Если пользователь уже целенаправленно держит курсор на новом термине,
                    // не теряем это намерение из-за ещё не закрывшейся предыдущей подсказки.
                    scheduleAttempt(HOVER_OPEN_RETRY_DELAY_MS)
                    return
                }

                setHovered(true)
            }, delayMs)
        }

        scheduleAttempt(HOVER_OPEN_DELAY_MS)
    }, [cancelShow, tryActivateTooltipTree])

    const scheduleHide = useCallback(() => {
        cancelShow()
        cancelHide()

        const scheduleAttempt = () => {
            hideTimeoutRef.current = setTimeout(() => {
                const treeHasHoveredOverlay = (HOVERED_OVERLAY_COUNT_BY_TREE.get(treeIdRef.current) ?? 0) > 0

                // Неприкреплённый tooltip должен закрываться только после фактического ухода
                // из trigger, из собственного overlay и из всего root-tree основной подсказки.
                if (hoverIntentRef.current || isOverlayHoveredRef.current || treeHasHoveredOverlay) {
                    scheduleAttempt()
                    return
                }

                setHovered(false)
            }, HOVER_HIDE_DELAY_MS)
        }

        scheduleAttempt()
    }, [cancelHide, cancelShow])

    const handleTermEnter = useCallback(() => {
        hoverIntentRef.current = true
        onWarmup?.()
        scheduleWarmup()
        cancelHide()
        scheduleShow()
    }, [cancelHide, onWarmup, scheduleShow, scheduleWarmup])

    const handleTermLeave = useCallback(() => {
        hoverIntentRef.current = false
        scheduleHide()
    }, [scheduleHide])

    const handleTermFocus = useCallback(() => {
        onWarmup?.()
        scheduleWarmup()
        hoverIntentRef.current = true
        cancelShow()
        cancelHide()

        if (!tryActivateTooltipTree()) {
            return
        }

        setHovered(true)
    }, [cancelHide, cancelShow, onWarmup, scheduleWarmup, tryActivateTooltipTree])

    const handleTermBlur = useCallback(() => {
        hoverIntentRef.current = false
        scheduleHide()
    }, [scheduleHide])

    const releaseOverlayHover = useCallback(() => {
        if (!isOverlayHoveredRef.current) {
            return
        }

        isOverlayHoveredRef.current = false
        unregisterTreeOverlayHover(treeIdRef.current)
    }, [])

    const handleTooltipEnter = useCallback(() => {
        if (!isOverlayHoveredRef.current) {
            isOverlayHoveredRef.current = true
            registerTreeOverlayHover(treeIdRef.current)
        }

        cancelShow()
        cancelHide()
        setHovered(true)
    }, [cancelHide, cancelShow])

    const handleTooltipLeave = useCallback(() => {
        releaseOverlayHover()
        scheduleHide()
    }, [releaseOverlayHover, scheduleHide])

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
            hoverIntentRef.current = false
            cancelShow()
            cancelHide()
            releaseOverlayHover()
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
            setOpenDescendantCount: setOpenDescendantCount,
            getParentInstanceId: () => parentTooltipInstanceIdRef.current
        })

        return () => {
            unregisterTooltipInstanceController(instanceId)
        }
    }, [instanceId])

    useEffect(() => {
        if (!open) {
            setTreeOverlayHoverCount(0)
            return
        }

        registerTreeOverlayHoverSubscriber(treeIdState, instanceId, setTreeOverlayHoverCount)
        return () => {
            unregisterTreeOverlayHoverSubscriber(treeIdState, instanceId)
        }
    }, [instanceId, open, treeIdState])

    useEffect(() => {
        if (selfOpen && !isSelfOpenPropagatedRef.current) {
            // Открытый дочерний tooltip должен удерживать всех предков в дереве,
            // иначе переход курсора на следующий уровень вложенности схлопнет цепочку.
            propagateOpenStateToAncestors(parentTooltipInstanceIdRef.current, 1)
            isSelfOpenPropagatedRef.current = true
            return
        }

        if (!selfOpen && isSelfOpenPropagatedRef.current) {
            propagateOpenStateToAncestors(parentTooltipInstanceIdRef.current, -1)
            isSelfOpenPropagatedRef.current = false
        }
    }, [selfOpen])

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
            releaseOverlayHover()
        }
    }, [cancelHide, cancelShow, releaseOverlayHover])

    useEffect(() => {
        return () => {
            if (warmupTimerRef.current) {
                clearTimeout(warmupTimerRef.current)
                warmupTimerRef.current = null
            }
        }
    }, [])

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
            if (!isSelfOpenPropagatedRef.current) {
                return
            }

            propagateOpenStateToAncestors(parentTooltipInstanceIdRef.current, -1)
            isSelfOpenPropagatedRef.current = false
        }
    }, [])

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
                <Element type={type} className={cls.termText}>
                    {to ?
                        <RouterLink
                            to={to}
                            data-term-tooltip-instance-id={instanceId}
                            className={cls.termInner}
                            onMouseEnter={handleTermEnter}
                            onMouseLeave={handleTermLeave}
                            onFocus={handleTermFocus}
                            onBlur={handleTermBlur}
                            aria-label={normalizedTermLabel}
                            aria-expanded={open}>
                            {displayTerm ?? term}
                        </RouterLink>
                    :   <span
                            data-term-tooltip-instance-id={instanceId}
                            className={cls.termInner}
                            onMouseEnter={handleTermEnter}
                            onMouseLeave={handleTermLeave}
                            onFocus={handleTermFocus}
                            onBlur={handleTermBlur}
                            onClick={handleTermClick}
                            onKeyDown={handleKeyDown}
                            role='button'
                            tabIndex={0}
                            aria-label={`Что такое ${normalizedTermLabel}?`}
                            aria-expanded={open}>
                            {displayTerm ?? term}
                        </span>
                    }
                </Element>
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
                            <Element type='p' className={cls.tooltipTitle}>
                                {tooltipTitle ?? normalizedTermLabel}
                            </Element>
                            <div className={cls.tooltipBody}>{resolvedDescription}</div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    )
}
