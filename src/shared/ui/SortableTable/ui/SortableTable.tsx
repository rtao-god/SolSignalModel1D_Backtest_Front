import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './SortableTable.module.scss'
import type {
    RowEntry,
    SortDir,
    SortKind,
    SortState,
    TableRow,
    TableSortComparator,
    TableSortValueResolver
} from '../model/types'
import {
    defaultDirForColumn,
    effectiveAriaSort,
    getCellValue,
    oppositeDir,
    resolveDir,
    stableSortByCol,
    toExportCell
} from '../model/utils'
import { useTranslation } from 'react-i18next'
import { logError } from '@/shared/lib/logging/logError'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'

export type TableDensity = 'simple' | 'medium' | 'dense'

interface SortableTableProps {
    columns: string[]
    rows: TableRow[]
    visibleColumnIndexes?: number[]
    storageKey?: string
    className?: string
    tableClassName?: string
    density?: TableDensity
    virtualizeRows?: boolean
    maxBodyHeight?: CSSProperties['maxHeight']
    getRowClassName?: (row: TableRow, rowIndex: number) => string | undefined
    getRowTitle?: (row: TableRow, rowIndex: number) => string | undefined
    getCellClassName?: (value: unknown, rowIndex: number, colIdx: number) => string | undefined
    renderCell?: (value: unknown, rowIndex: number, colIdx: number) => ReactNode
    getSortValue?: TableSortValueResolver
    getSortComparator?: TableSortComparator
    onSortedRowsChange?: (rows: TableRow[]) => void
    renderColumnTitle?: (title: string, colIdx: number) => ReactNode
}

const CHUNK_RENDER_THRESHOLD_ROWS = 250
const INITIAL_RENDERED_ROWS = 120
const CHUNK_RENDER_STEP_ROWS = 180
const VIRTUALIZATION_THRESHOLD_ROWS = 180
const VIRTUALIZATION_OVERSCAN_ROWS = 14
const ROW_HEIGHT_BY_DENSITY: Record<TableDensity, number> = {
    simple: 44,
    medium: 38,
    dense: 34
}

function ChevronUpIcon({ className }: { className: string }) {
    return (
        <svg className={className} viewBox='0 0 20 20' fill='none' aria-hidden='true'>
            <path d='M5.5 12.25L10 7.75L14.5 12.25' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
        </svg>
    )
}

function ChevronDownIcon({ className }: { className: string }) {
    return (
        <svg className={className} viewBox='0 0 20 20' fill='none' aria-hidden='true'>
            <path d='M5.5 7.75L10 12.25L14.5 7.75' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
        </svg>
    )
}
function storageKeyFor(rawKey?: string): string | null {
    if (!rawKey) {
        return null
    }
    return rawKey.trim() ? rawKey : null
}
function safeLoadSortState(key: string, columnsLen: number): SortState | null {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const raw = window.localStorage.getItem(key)
        if (!raw) {
            return null
        }

        const parsed = JSON.parse(raw) as Partial<SortState> | null
        if (!parsed || typeof parsed !== 'object') {
            return null
        }

        const colIdx = typeof parsed.colIdx === 'number' ? parsed.colIdx : null
        const kind = parsed.kind

        const validKinds: SortKind[] = ['none', 'asc', 'desc', 'default']
        if (!validKinds.includes(kind as SortKind)) {
            return null
        }

        if (kind === 'none') {
            return { colIdx: null, kind: 'none' }
        }

        if (colIdx === null || colIdx < 0 || colIdx >= columnsLen) {
            return { colIdx: null, kind: 'none' }
        }

        return { colIdx, kind: kind as SortKind }
    } catch (e) {
        const normalizedError = normalizeErrorLike(e, 'Unknown sort state load error.', {
            source: 'sortable-table-sort-load',
            domain: 'app_runtime',
            extra: { key }
        })

        logError(normalizedError, undefined, {
            source: 'sortable-table-sort-load',
            domain: 'app_runtime',
            severity: 'warning',
            extra: { key }
        })
        return null
    }
}
function safeSaveSortState(key: string, state: SortState) {
    if (typeof window === 'undefined') {
        return
    }

    try {
        window.localStorage.setItem(key, JSON.stringify(state))
    } catch (e) {
        const normalizedError = normalizeErrorLike(e, 'Unknown sort state save error.', {
            source: 'sortable-table-sort-save',
            domain: 'app_runtime',
            extra: { key }
        })

        logError(normalizedError, undefined, {
            source: 'sortable-table-sort-save',
            domain: 'app_runtime',
            severity: 'warning',
            extra: { key }
        })
    }
}

export default function SortableTable({
    columns,
    rows,
    visibleColumnIndexes,
    storageKey,
    className,
    tableClassName,
    density = 'medium',
    virtualizeRows = false,
    maxBodyHeight,
    getRowClassName,
    getRowTitle,
    getCellClassName,
    renderCell,
    getSortValue,
    getSortComparator,
    onSortedRowsChange,
    renderColumnTitle
}: SortableTableProps) {
    const { t } = useTranslation('common')
    const [sort, setSort] = useState<SortState>({ colIdx: null, kind: 'none' })
    const [renderedRowCount, setRenderedRowCount] = useState(0)
    const [virtualScrollTop, setVirtualScrollTop] = useState(0)
    const [virtualViewportHeight, setVirtualViewportHeight] = useState(0)
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)

    const resolvedVisibleIndexes = useMemo(() => {
        if (!columns || columns.length === 0) {
            return [] as number[]
        }
        if (!visibleColumnIndexes || visibleColumnIndexes.length === 0) {
            return columns.map((_, idx) => idx)
        }
        return visibleColumnIndexes.filter(idx => idx >= 0 && idx < columns.length)
    }, [columns, visibleColumnIndexes])

    const rowEntries: RowEntry[] = useMemo(() => {
        const src = rows ?? []
        return src.map((row, originalIndex) => ({ row, originalIndex }))
    }, [rows])

    const defaultDirByColIdx = useMemo(() => {
        const map = new Map<number, SortDir>()
        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
            const d = defaultDirForColumn(rowEntries, colIdx, getSortValue, getSortComparator)
            if (d) {
                map.set(colIdx, d)
            }
        }
        return map
    }, [columns.length, getSortComparator, getSortValue, rowEntries])
    useEffect(() => {
        const key = storageKeyFor(storageKey)
        if (!key) {
            return
        }
        const loaded = safeLoadSortState(key, columns.length)
        if (loaded) {
            setSort(loaded)
        }
    }, [storageKey, columns.length])
    useEffect(() => {
        if (sort.colIdx === null || sort.kind !== 'default') {
            return
        }
        const def = defaultDirByColIdx.get(sort.colIdx) ?? null
        if (!def) {
            setSort({ colIdx: null, kind: 'none' })
            return
        }
        setSort({ colIdx: sort.colIdx, kind: def })
    }, [defaultDirByColIdx, sort.colIdx, sort.kind])
    useEffect(() => {
        const key = storageKeyFor(storageKey)
        if (!key) {
            return
        }
        safeSaveSortState(key, sort)
    }, [storageKey, sort])

    const isSortColVisible = sort.colIdx !== null && resolvedVisibleIndexes.includes(sort.colIdx)

    const displayEntries = useMemo(() => {
        if (!isSortColVisible) {
            return rowEntries
        }

        if (sort.colIdx === null || sort.kind === 'none') {
            return rowEntries
        }

        const defaultDir = defaultDirByColIdx.get(sort.colIdx) ?? null
        const resolved = resolveDir(sort.kind, defaultDir)
        if (defaultDir && resolved === defaultDir) {
            return rowEntries
        }

        if (!resolved) {
            return rowEntries
        }

        return stableSortByCol(rowEntries, sort.colIdx, resolved, getSortValue, getSortComparator)
    }, [rowEntries, sort, isSortColVisible, defaultDirByColIdx, getSortComparator, getSortValue])

    const shouldVirtualize =
        virtualizeRows &&
        maxBodyHeight != null &&
        displayEntries.length > VIRTUALIZATION_THRESHOLD_ROWS &&
        typeof window !== 'undefined'

    const estimatedRowHeight = ROW_HEIGHT_BY_DENSITY[density]

    useEffect(() => {
        if (!shouldVirtualize) {
            setVirtualScrollTop(0)
            setVirtualViewportHeight(0)
            return
        }

        const container = scrollContainerRef.current
        if (!container) {
            return
        }

        const syncViewportMetrics = () => {
            setVirtualViewportHeight(container.clientHeight)
            setVirtualScrollTop(container.scrollTop)
        }

        syncViewportMetrics()

        const handleScroll = () => {
            setVirtualScrollTop(container.scrollTop)
        }

        container.addEventListener('scroll', handleScroll, { passive: true })

        const resizeObserver =
            typeof ResizeObserver === 'function' ? new ResizeObserver(() => syncViewportMetrics()) : null

        resizeObserver?.observe(container)
        window.addEventListener('resize', syncViewportMetrics)

        return () => {
            container.removeEventListener('scroll', handleScroll)
            resizeObserver?.disconnect()
            window.removeEventListener('resize', syncViewportMetrics)
        }
    }, [shouldVirtualize])

    useEffect(() => {
        if (!shouldVirtualize) {
            return
        }

        const container = scrollContainerRef.current
        if (!container) {
            return
        }

        container.scrollTop = 0
        setVirtualScrollTop(0)
    }, [displayEntries, shouldVirtualize])

    // Для экранов без внутреннего viewport сохраняется постепенный рендер,
    // чтобы не ухудшить первый paint обычных таблиц.
    useEffect(() => {
        if (shouldVirtualize) {
            setRenderedRowCount(displayEntries.length)
            return
        }

        const totalRows = displayEntries.length
        if (totalRows === 0) {
            setRenderedRowCount(0)
            return
        }

        if (totalRows <= CHUNK_RENDER_THRESHOLD_ROWS || typeof window === 'undefined') {
            setRenderedRowCount(totalRows)
            return
        }

        let animationFrameId: number | null = null
        let cancelled = false

        setRenderedRowCount(Math.min(INITIAL_RENDERED_ROWS, totalRows))

        const renderNextChunk = () => {
            if (cancelled) {
                return
            }

            setRenderedRowCount(prevCount => {
                const nextCount = Math.min(prevCount + CHUNK_RENDER_STEP_ROWS, totalRows)
                if (nextCount < totalRows) {
                    animationFrameId = window.requestAnimationFrame(renderNextChunk)
                }
                return nextCount
            })
        }

        animationFrameId = window.requestAnimationFrame(renderNextChunk)

        return () => {
            cancelled = true
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId)
            }
        }
    }, [displayEntries, shouldVirtualize])

    const effectiveRenderedRowCount = useMemo(() => {
        if (shouldVirtualize) {
            return displayEntries.length
        }

        if (displayEntries.length === 0) {
            return 0
        }

        if (displayEntries.length <= CHUNK_RENDER_THRESHOLD_ROWS) {
            return displayEntries.length
        }

        if (renderedRowCount > 0) {
            return Math.min(renderedRowCount, displayEntries.length)
        }

        return Math.min(INITIAL_RENDERED_ROWS, displayEntries.length)
    }, [displayEntries.length, renderedRowCount, shouldVirtualize])

    const virtualWindowState = useMemo(() => {
        if (!shouldVirtualize) {
            return {
                startIndex: 0,
                endIndex: effectiveRenderedRowCount,
                topSpacerHeight: 0,
                bottomSpacerHeight: 0
            }
        }

        const safeViewportHeight = virtualViewportHeight > 0 ? virtualViewportHeight : estimatedRowHeight * 12
        const viewportRowCount = Math.max(1, Math.ceil(safeViewportHeight / estimatedRowHeight))
        const startIndex = Math.max(0, Math.floor(virtualScrollTop / estimatedRowHeight) - VIRTUALIZATION_OVERSCAN_ROWS)
        const endIndex = Math.min(
            displayEntries.length,
            startIndex + viewportRowCount + VIRTUALIZATION_OVERSCAN_ROWS * 2
        )

        return {
            startIndex,
            endIndex,
            topSpacerHeight: startIndex * estimatedRowHeight,
            bottomSpacerHeight: Math.max(0, (displayEntries.length - endIndex) * estimatedRowHeight)
        }
    }, [
        displayEntries.length,
        effectiveRenderedRowCount,
        estimatedRowHeight,
        shouldVirtualize,
        virtualScrollTop,
        virtualViewportHeight
    ])

    const visibleEntries = useMemo(
        () => displayEntries.slice(virtualWindowState.startIndex, virtualWindowState.endIndex),
        [displayEntries, virtualWindowState.endIndex, virtualWindowState.startIndex]
    )

    useEffect(() => {
        if (!onSortedRowsChange) {
            return
        }
        onSortedRowsChange(displayEntries.map(e => e.row))
    }, [displayEntries, onSortedRowsChange])

    const handleSortToggle = (colIdx: number) => {
        const defaultDir = defaultDirByColIdx.get(colIdx) ?? null
        const isDefaultable = defaultDir !== null

        setSort(prev => {
            if (prev.colIdx !== colIdx) {
                if (isDefaultable) {
                    return { colIdx, kind: oppositeDir(defaultDir!) }
                }
                return { colIdx, kind: 'asc' }
            }
            if (isDefaultable) {
                const def = defaultDir!
                const currentDir = resolveDir(prev.kind, def) ?? def
                const nextDir = currentDir === def ? oppositeDir(def) : def
                return { colIdx, kind: nextDir }
            }
            if (prev.kind === 'none') {
                return { colIdx, kind: 'asc' }
            }
            if (prev.kind === 'asc') {
                return { colIdx, kind: 'desc' }
            }
            if (prev.kind === 'desc') {
                return { colIdx: null, kind: 'none' }
            }

            return { colIdx: null, kind: 'none' }
        })
    }

    const tableRootClass = classNames(
        cls.tableScroll,
        {
            [cls.densitySimple]: density === 'simple',
            [cls.densityMedium]: density === 'medium',
            [cls.densityDense]: density === 'dense',
            [cls.tableScrollVirtualized]: shouldVirtualize
        },
        [className ?? '']
    )
    const tableClass = classNames(cls.table, { [cls.tableVirtualized]: shouldVirtualize }, [tableClassName ?? ''])
    const tableRootStyle =
        maxBodyHeight == null ? undefined : ({ '--sortable-table-max-height': maxBodyHeight } as CSSProperties)

    return (
        <div ref={scrollContainerRef} className={tableRootClass} style={tableRootStyle}>
            <table className={tableClass}>
                <thead>
                    <tr>
                        {resolvedVisibleIndexes.map(colIdx => {
                            const title = columns[colIdx] ?? `col_${colIdx}`

                            const defaultDir = defaultDirByColIdx.get(colIdx) ?? null

                            const isActive = sort.colIdx === colIdx && isSortColVisible
                            const kind: SortKind = isActive ? sort.kind : 'none'
                            const resolved = isActive ? resolveDir(kind, defaultDir) : null

                            const isAsc = resolved === 'asc'
                            const isDesc = resolved === 'desc'

                            const ariaSort = effectiveAriaSort(isActive, kind, defaultDir)

                            const titleHint =
                                !isActive ? t('sortableTable.sort', { defaultValue: 'Sort' })
                                : isAsc ? t('sortableTable.sortAsc', { defaultValue: 'Sort: ascending' })
                                : isDesc ? t('sortableTable.sortDesc', { defaultValue: 'Sort: descending' })
                                : t('sortableTable.sort', { defaultValue: 'Sort' })

                            const renderedTitle = renderColumnTitle ? renderColumnTitle(title, colIdx) : title

                            return (
                                <th key={colIdx} aria-sort={ariaSort}>
                                    <button
                                        type='button'
                                        className={classNames(
                                            cls.thButton,
                                            { [cls.thButtonSorted]: isActive && kind !== 'none' },
                                            []
                                        )}
                                        onClick={() => handleSortToggle(colIdx)}
                                        title={titleHint}>
                                        <span>{renderedTitle}</span>

                                        <span className={cls.sortIcons} aria-hidden='true'>
                                            <ChevronUpIcon
                                                className={classNames(
                                                    cls.sortIcon,
                                                    {
                                                        [cls.sortIconActive]: isAsc,
                                                        [cls.sortIconMuted]: isDesc
                                                    },
                                                    []
                                                )}
                                            />
                                            <ChevronDownIcon
                                                className={classNames(
                                                    cls.sortIcon,
                                                    {
                                                        [cls.sortIconActive]: isDesc,
                                                        [cls.sortIconMuted]: isAsc
                                                    },
                                                    []
                                                )}
                                            />
                                        </span>
                                    </button>
                                </th>
                            )
                        })}
                    </tr>
                </thead>
                <tbody>
                    {shouldVirtualize && virtualWindowState.topSpacerHeight > 0 && (
                        <tr aria-hidden='true' className={cls.spacerRow}>
                            <td
                                colSpan={resolvedVisibleIndexes.length}
                                style={{ height: `${virtualWindowState.topSpacerHeight}px` }}
                            />
                        </tr>
                    )}

                    {visibleEntries.map(entry => {
                        const rowIndex = entry.originalIndex
                        const rowClass = getRowClassName?.(entry.row, rowIndex)
                        const rowTitle = getRowTitle?.(entry.row, rowIndex)

                        return (
                            <tr key={entry.originalIndex} className={rowClass} title={rowTitle}>
                                {resolvedVisibleIndexes.map(colIdx => {
                                    const value = getCellValue(entry.row, colIdx)
                                    const cellClass = getCellClassName?.(value, rowIndex, colIdx)

                                    return (
                                        <td key={colIdx} className={cellClass}>
                                            {
                                                (renderCell ?
                                                    renderCell(value, rowIndex, colIdx)
                                                :   toExportCell(value)) as any
                                            }
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}

                    {shouldVirtualize && virtualWindowState.bottomSpacerHeight > 0 && (
                        <tr aria-hidden='true' className={cls.spacerRow}>
                            <td
                                colSpan={resolvedVisibleIndexes.length}
                                style={{ height: `${virtualWindowState.bottomSpacerHeight}px` }}
                            />
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
