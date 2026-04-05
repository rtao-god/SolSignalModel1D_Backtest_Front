import type {
    ExportCell,
    RowEntry,
    SortDir,
    SortKind,
    TableRow,
    TableSortCellContext,
    TableSortComparator,
    TableSortValueResolver
} from './types'
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

function resolveSortContext(
    row: TableRow,
    rowIndex: number,
    colIdx: number,
    getSortValue: TableSortValueResolver | undefined
): TableSortCellContext {
    const value = getCellValue(row, colIdx)
    return {
        row,
        rowIndex,
        colIdx,
        value: getSortValue ? getSortValue(row, rowIndex, colIdx, value) : value
    }
}

function compareSortContexts(
    left: TableSortCellContext,
    right: TableSortCellContext,
    getSortComparator: TableSortComparator | undefined
): number {
    const customResult = getSortComparator?.(left, right)
    if (customResult !== null && customResult !== undefined && Number.isFinite(customResult)) {
        return customResult
    }

    return compareCells(left.value, right.value)
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

    let normalized = value.trim()
    if (!normalized) {
        return null
    }

    let sign = 1
    if (normalized.startsWith('(') && normalized.endsWith(')')) {
        sign = -1
        normalized = normalized.slice(1, -1)
    }

    normalized = normalized
        .replace(/\s+/g, '')
        .replace(/[%$€£₽¥]/g, '')
        .replace(',', '.')

    if (!normalized) {
        return null
    }

    let multiplier = 1
    const suffixMatch = normalized.match(/([kmb])$/i)
    if (suffixMatch?.[1]) {
        const suffix = suffixMatch[1].toLowerCase()
        if (suffix === 'k') multiplier = 1_000
        else if (suffix === 'm') multiplier = 1_000_000
        else if (suffix === 'b') multiplier = 1_000_000_000

        normalized = normalized.slice(0, -1)
    }

    if (!normalized) {
        return null
    }

    if (normalized.startsWith('+')) {
        normalized = normalized.slice(1)
    } else if (normalized.startsWith('-')) {
        sign *= -1
        normalized = normalized.slice(1)
    }

    if (!normalized) {
        return null
    }

    const num = Number(normalized)
    if (!Number.isFinite(num)) {
        return null
    }

    return sign * num * multiplier
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
        return (
            a === b ? 0
            : a < b ? -1
            : 1
        )
    }

    const aNum = typeof a === 'string' ? tryParseNumberFromString(a) : null
    const bNum = typeof b === 'string' ? tryParseNumberFromString(b) : null
    if (aNum !== null && bNum !== null) {
        return (
            aNum === bNum ? 0
            : aNum < bNum ? -1
            : 1
        )
    }

    const aStr = String(a)
    const bStr = String(b)
    return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' })
}
export function stableSortByCol(
    entries: RowEntry[],
    colIdx: number,
    dir: SortDir,
    getSortValue?: TableSortValueResolver,
    getSortComparator?: TableSortComparator
): RowEntry[] {
    const dirMul = dir === 'asc' ? 1 : -1

    const withStableIndex = entries.map((e, stableIndex) => ({ e, stableIndex }))
    withStableIndex.sort((x, y) => {
        const left = resolveSortContext(x.e.row, x.e.originalIndex, colIdx, getSortValue)
        const right = resolveSortContext(y.e.row, y.e.originalIndex, colIdx, getSortValue)

        const cmp = compareSortContexts(left, right, getSortComparator)
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
export function hasColumnVariance(
    entries: RowEntry[],
    colIdx: number,
    getSortValue?: TableSortValueResolver,
    getSortComparator?: TableSortComparator
): boolean {
    const originalSignature = orderSignature(entries)
    const ascSignature = orderSignature(stableSortByCol(entries, colIdx, 'asc', getSortValue, getSortComparator))
    if (ascSignature !== originalSignature) {
        return true
    }

    const descSignature = orderSignature(stableSortByCol(entries, colIdx, 'desc', getSortValue, getSortComparator))
    return descSignature !== originalSignature
}
export function defaultDirForColumn(
    entries: RowEntry[],
    colIdx: number,
    getSortValue?: TableSortValueResolver,
    getSortComparator?: TableSortComparator
): SortDir | null {
    if (!hasColumnVariance(entries, colIdx, getSortValue, getSortComparator)) {
        return null
    }

    const orig = orderSignature(entries)

    const asc = orderSignature(stableSortByCol(entries, colIdx, 'asc', getSortValue, getSortComparator))
    if (asc === orig) {
        return 'asc'
    }

    const desc = orderSignature(stableSortByCol(entries, colIdx, 'desc', getSortValue, getSortComparator))
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
