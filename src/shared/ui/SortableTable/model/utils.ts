

import type { ExportCell, RowEntry, SortDir, SortKind, TableRow } from './types'
const NULLISH_TEXT = new Set(['', '—', '-', 'n/a', 'na', 'null', 'undefined'])
export function isNullish(v: unknown): v is null | undefined {
    return v === null || v === undefined
}
function isNullishText(v: string): boolean {
    return NULLISH_TEXT.has(v.trim().toLowerCase())
}
export function getCellValue(row: TableRow, colIdx: number): unknown {
    if (!Array.isArray(row)) {
        return undefined
    }
    return row[colIdx]
}
export function toExportCell(v: unknown): ExportCell {
    if (isNullish(v)) {
        return ''
    }
    if (typeof v === 'string') {
        return v
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
        return v
    }
    return String(v)
}
export function tryParseNumberFromString(value: string): number | null {
    if (!value) {
        return null
    }

    if (isNullishText(value)) {
        return null
    }

    const normalized = value.trim().replace(/\s+/g, '').replace('%', '').replace(',', '.')
    if (!normalized) {
        return null
    }

    const num = Number(normalized)
    return Number.isFinite(num) ? num : null
}
export function compareCells(a: unknown, b: unknown): number {
    if (isNullish(a) && isNullish(b)) {
        return 0
    }
    if (isNullish(a)) {
        return 1 // null/undefined вниз
    }
    if (isNullish(b)) {
        return -1
    }

    if (typeof a === 'number' && typeof b === 'number') {
        return a === b ? 0 : a < b ? -1 : 1
    }

    const aNum = typeof a === 'string' ? tryParseNumberFromString(a) : null
    const bNum = typeof b === 'string' ? tryParseNumberFromString(b) : null
    if (aNum !== null && bNum !== null) {
        return aNum === bNum ? 0 : aNum < bNum ? -1 : 1
    }

    const aStr = String(a)
    const bStr = String(b)
    return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' })
}
export function stableSortByCol(entries: RowEntry[], colIdx: number, dir: SortDir): RowEntry[] {
    const dirMul = dir === 'asc' ? 1 : -1

    const withStableIndex = entries.map((e, stableIndex) => ({ e, stableIndex }))
    withStableIndex.sort((x, y) => {
        const ax = getCellValue(x.e.row, colIdx)
        const by = getCellValue(y.e.row, colIdx)

        const cmp = compareCells(ax, by)
        if (cmp !== 0) {
            return cmp * dirMul
        }
        return x.stableIndex - y.stableIndex
    })

    return withStableIndex.map(x => x.e)
}
export function orderSignature(entries: RowEntry[]): string {
    return entries.map(e => String(e.originalIndex)).join(',')
}
export function hasColumnVariance(entries: RowEntry[], colIdx: number): boolean {
    const set = new Set<string>()
    for (const e of entries) {
        const v = getCellValue(e.row, colIdx)
        if (isNullish(v)) {
            continue
        }
        if (typeof v === 'number') {
            set.add(`n:${v}`)
        } else if (typeof v === 'string') {
            const n = tryParseNumberFromString(v)
            set.add(n !== null ? `n:${n}` : `s:${v.trim().toLowerCase()}`)
        } else {
            set.add(`s:${String(v).trim().toLowerCase()}`)
        }

        if (set.size >= 2) {
            return true
        }
    }
    return false
}
export function defaultDirForColumn(entries: RowEntry[], colIdx: number): SortDir | null {
    if (!hasColumnVariance(entries, colIdx)) {
        return null
    }

    const orig = orderSignature(entries)

    const asc = orderSignature(stableSortByCol(entries, colIdx, 'asc'))
    if (asc === orig) {
        return 'asc'
    }

    const desc = orderSignature(stableSortByCol(entries, colIdx, 'desc'))
    if (desc === orig) {
        return 'desc'
    }

    return null
}
export function oppositeDir(dir: SortDir): SortDir {
    return dir === 'asc' ? 'desc' : 'asc'
}
export function resolveDir(kind: SortKind, defaultDir: SortDir | null): SortDir | null {
    if (kind === 'asc') return 'asc'
    if (kind === 'desc') return 'desc'
    if (kind === 'default' && defaultDir) return defaultDir
    return null
}
export function effectiveAriaSort(
    isActive: boolean,
    kind: SortKind,
    defaultDir: SortDir | null
): 'none' | 'ascending' | 'descending' {
    if (!isActive) return 'none'
    const dir = resolveDir(kind, defaultDir)
    if (dir === 'asc') return 'ascending'
    if (dir === 'desc') return 'descending'
    return 'none'
}
