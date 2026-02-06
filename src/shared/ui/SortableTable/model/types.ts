// Направление сортировки.
export type SortDir = 'asc' | 'desc'

// Тип сортировки: none — без сортировки, default — «как в исходных данных».
export type SortKind = 'none' | 'asc' | 'desc' | 'default'

// Инварианты:
// - kind === 'none' => colIdx === null
// - kind !== 'none' => colIdx !== null
export type SortState = { colIdx: number | null; kind: SortKind }

// Одна строка таблицы (сырой формат).
export type TableRow = ReadonlyArray<unknown> | null | undefined

// Строка + индекс для стабильной сортировки.
export type RowEntry = { row: TableRow; originalIndex: number }

// Значение для экспорта (CSV/PDF).
export type ExportCell = string | number | boolean | null | undefined
