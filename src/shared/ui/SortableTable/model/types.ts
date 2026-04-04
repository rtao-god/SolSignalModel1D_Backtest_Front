export type SortDir = 'asc' | 'desc'
export type SortKind = 'none' | 'asc' | 'desc' | 'default'
export type SortState = { colIdx: number | null; kind: SortKind }
export type TableRow = ReadonlyArray<unknown> | null | undefined
export type RowEntry = { row: TableRow; originalIndex: number }
export type ExportCell = string | number | boolean | null | undefined
export type TableSortValueResolver = (row: TableRow, rowIndex: number, colIdx: number, value: unknown) => unknown
export interface TableSortCellContext {
    row: TableRow
    rowIndex: number
    colIdx: number
    value: unknown
}
export type TableSortComparator = (
    left: TableSortCellContext,
    right: TableSortCellContext
) => number | null | undefined
