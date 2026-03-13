import { ReactNode, useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './SortableTable.module.scss'
import type { RowEntry, SortDir, SortKind, SortState, TableRow } from '../model/types'
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

export type TableDensity = 'simple' | 'medium' | 'dense'

interface SortableTableProps {
    columns: string[]
    rows: TableRow[]
    visibleColumnIndexes?: number[]
    storageKey?: string
    className?: string
    tableClassName?: string
    density?: TableDensity
    getRowClassName?: (row: TableRow, rowIndex: number) => string | undefined
    getCellClassName?: (value: unknown, rowIndex: number, colIdx: number) => string | undefined
    onSortedRowsChange?: (rows: TableRow[]) => void
    renderColumnTitle?: (title: string, colIdx: number) => ReactNode
}

const CHUNK_RENDER_THRESHOLD_ROWS = 250
const INITIAL_RENDERED_ROWS = 120
const CHUNK_RENDER_STEP_ROWS = 180

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
        const normalizedError = e instanceof Error ? e : new Error(String(e ?? 'Unknown sort state load error.'))

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
        const normalizedError = e instanceof Error ? e : new Error(String(e ?? 'Unknown sort state save error.'))

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
    getRowClassName,
    getCellClassName,
    onSortedRowsChange,
    renderColumnTitle
}: SortableTableProps) {
    const { t } = useTranslation('common')
    const [sort, setSort] = useState<SortState>({ colIdx: null, kind: 'none' })
    const [renderedRowCount, setRenderedRowCount] = useState(0)

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
            const d = defaultDirForColumn(rowEntries, colIdx)
            if (d) {
                map.set(colIdx, d)
            }
        }
        return map
    }, [columns.length, rowEntries])
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

        return stableSortByCol(rowEntries, sort.colIdx, resolved)
    }, [rowEntries, sort, isSortColVisible, defaultDirByColIdx])

    // Для больших таблиц отдаем строки батчами через rAF, чтобы первый рендер не блокировал main thread.
    useEffect(() => {
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
    }, [displayEntries])

    const effectiveRenderedRowCount = useMemo(() => {
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
    }, [displayEntries.length, renderedRowCount])

    const visibleEntries = useMemo(
        () => displayEntries.slice(0, effectiveRenderedRowCount),
        [displayEntries, effectiveRenderedRowCount]
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
            [cls.densityDense]: density === 'dense'
        },
        [className ?? '']
    )
    const tableClass = classNames(cls.table, {}, [tableClassName ?? ''])

    return (
        <div className={tableRootClass}>
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
                    {visibleEntries.map((entry, rowIndex) => {
                        const rowClass = getRowClassName?.(entry.row, rowIndex)

                        return (
                            <tr key={entry.originalIndex} className={rowClass}>
                                {resolvedVisibleIndexes.map(colIdx => {
                                    const value = getCellValue(entry.row, colIdx)
                                    const cellClass = getCellClassName?.(value, rowIndex, colIdx)

                                    return (
                                        <td key={colIdx} className={cellClass}>
                                            {toExportCell(value) as any}
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
