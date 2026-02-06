/*
    SortableTable utils — утилиты сортировки и форматирования.

    Зачем:
        - Единая логика парсинга чисел/пустых значений.
        - Стабильная сортировка для табличных отчётов.
*/

import type { ExportCell, RowEntry, SortDir, SortKind, TableRow } from './types'

// Набор строк, которые трактуем как «пустое/неопределено».
const NULLISH_TEXT = new Set(['', '—', '-', 'n/a', 'na', 'null', 'undefined'])

// Проверка null/undefined.
export function isNullish(v: unknown): v is null | undefined {
    return v === null || v === undefined
}

// Проверка строковых «пустых» значений.
function isNullishText(v: string): boolean {
    return NULLISH_TEXT.has(v.trim().toLowerCase())
}

// Достаём значение ячейки.
export function getCellValue(row: TableRow, colIdx: number): unknown {
    if (!Array.isArray(row)) {
        return undefined
    }
    return row[colIdx]
}

// Приводим значение ячейки к экспорту (CSV/PDF).
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

// Пробуем распарсить число из строки (учитываем запятые/проценты/пробелы).
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

// Сравнение значений ячеек с учётом null/undefined и строковых чисел.
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

// Стабильная сортировка по колонке.
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

// Сигнатура порядка (для поиска «дефолтной» сортировки).
export function orderSignature(entries: RowEntry[]): string {
    return entries.map(e => String(e.originalIndex)).join(',')
}

// Проверяем, есть ли вариативность в колонке.
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

// Если исходный порядок уже совпадает с asc/desc, считаем это «дефолтом».
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

// Направление, противоположное заданному.
export function oppositeDir(dir: SortDir): SortDir {
    return dir === 'asc' ? 'desc' : 'asc'
}

// Разрешаем default в конкретное направление.
export function resolveDir(kind: SortKind, defaultDir: SortDir | null): SortDir | null {
    if (kind === 'asc') return 'asc'
    if (kind === 'desc') return 'desc'
    if (kind === 'default' && defaultDir) return defaultDir
    return null
}

// ARIA-значение для сортируемого столбца.
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
