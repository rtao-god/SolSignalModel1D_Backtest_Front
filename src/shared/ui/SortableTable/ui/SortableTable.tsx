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

interface SortableTableProps {
    columns: string[]
    rows: TableRow[]
    visibleColumnIndexes?: number[]
    storageKey?: string
    className?: string
    tableClassName?: string
    getRowClassName?: (row: TableRow, rowIndex: number) => string | undefined
    getCellClassName?: (value: unknown, rowIndex: number, colIdx: number) => string | undefined
    onSortedRowsChange?: (rows: TableRow[]) => void
    renderColumnTitle?: (title: string, colIdx: number) => ReactNode
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
        console.warn('[SortableTable] Failed to load sort state', { key, e })
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
        console.warn('[SortableTable] Failed to save sort state', { key, e })
    }
}

export default function SortableTable({
    columns,
    rows,
    visibleColumnIndexes,
    storageKey,
    className,
    tableClassName,
    getRowClassName,
    getCellClassName,
    onSortedRowsChange,
    renderColumnTitle
}: SortableTableProps) {
    const [sort, setSort] = useState<SortState>({ colIdx: null, kind: 'none' })

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

    const tableRootClass = classNames(cls.tableScroll, {}, [className ?? ''])
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
                                !isActive
                                    ? 'Сортировать'
                                    : isAsc
                                        ? 'Сортировка: по возрастанию'
                                        : isDesc
                                            ? 'Сортировка: по убыванию'
                                            : 'Сортировать'

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
                    {displayEntries.map((entry, rowIndex) => {
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
