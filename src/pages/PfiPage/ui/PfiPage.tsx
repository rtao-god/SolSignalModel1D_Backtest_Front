import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import type { TableSectionDto } from '@/shared/types/report.types'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { buildPfiTabsFromSections } from '@/shared/utils/pfiTabs'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import { ViewModeToggle, type ViewMode } from '@/shared/ui/ViewModeToggle/ui/ViewModeToggle'
import cls from './PfiPage.module.scss'
import { usePfiPerModelReportQuery } from '@/shared/api/tanstackQueries/pfi'
import { Text } from '@/shared/ui'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'

/*
	PfiPage — отчёт важности признаков (PFI).

	Зачем:
		- Показывает вклад фичей по всем моделям.
		- Даёт экспорт таблиц и навигацию по секциям.

	Источники данных и сайд-эффекты:
		- usePfiPerModelReportQuery() (TanStack Query).

	Контракты:
		- Табличные секции обязаны иметь columns и rows.
*/

// Пропсы карточки таблицы PFI.
interface PfiTableCardProps {
    section: TableSectionDto
    domId: string
}

// Индексы колонок, которые показываются в бизнес-режиме.
const BUSINESS_COLUMN_INDEXES = [0, 1, 2, 4, 7, 9]

type SortDir = 'asc' | 'desc'
type SortKind = 'none' | 'asc' | 'desc' | 'default'

// Инвариант:
// - kind === 'none' => colIdx === null
// - kind !== 'none' => colIdx !== null
type SortState = { colIdx: number | null; kind: SortKind }

type ExportCell = string | number | boolean | null | undefined

type TableRow = ReadonlyArray<unknown> | null | undefined
type RowEntry = { row: TableRow; originalIndex: number }

function isNullish(v: unknown): v is null | undefined {
    return v === null || v === undefined
}

function toExportCell(v: unknown): ExportCell {
    if (isNullish(v)) {
        return ''
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        return v
    }
    return String(v)
}

function tryParseNumberFromString(value: string): number | null {
    const s = value.trim()
    if (s.length === 0) {
        return null
    }

    // Частые форматы: "3,0 %", "1 234,56"
    const normalized = s.replace(/\s+/g, '').replace('%', '').replace(',', '.')
    const num = Number(normalized)
    return Number.isFinite(num) ? num : null
}

function getCellValue(row: TableRow, colIdx: number): unknown {
    if (!Array.isArray(row)) {
        return undefined
    }
    return row[colIdx]
}

function compareCells(a: unknown, b: unknown): number {
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

function stableSortByCol(entries: RowEntry[], colIdx: number, dir: SortDir): RowEntry[] {
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

function orderSignature(entries: RowEntry[]): string {
    return entries.map(e => String(e.originalIndex)).join(',')
}

function hasColumnVariance(entries: RowEntry[], colIdx: number): boolean {
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

// Если исходный порядок уже полностью совпадает с asc/desc по колонке — включаем 2-режимный цикл.
// defaultDir = направление, совпадающее с исходным порядком.
function defaultDirForColumn(entries: RowEntry[], colIdx: number): SortDir | null {
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

function oppositeDir(dir: SortDir): SortDir {
    return dir === 'asc' ? 'desc' : 'asc'
}

function resolveDir(kind: SortKind, defaultDir: SortDir | null): SortDir | null {
    if (kind === 'asc') return 'asc'
    if (kind === 'desc') return 'desc'
    if (kind === 'default' && defaultDir) return defaultDir
    return null
}

function effectiveAriaSort(
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

function storageKeyFor(domId: string): string {
    return `pfi.sort.${domId}`
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
        console.warn('[PfiTableCard] Failed to load sort state', { key, e })
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
        console.warn('[PfiTableCard] Failed to save sort state', { key, e })
    }
}

/*
	Карточка таблицы PFI.

	- Показывает таблицу по одной секции отчёта.
	- Даёт переключатель business/technical и экспорт.
*/
function PfiTableCard({ section, domId }: PfiTableCardProps) {
    const [mode, setMode] = useState<ViewMode>('business')
    const [sort, setSort] = useState<SortState>({ colIdx: null, kind: 'none' })

    const columns = section.columns ?? []

    const visibleColumnIndexes = useMemo(() => {
        if (columns.length === 0) {
            return [] as number[]
        }

        if (mode === 'technical') {
            return columns.map((_, idx: number) => idx)
        }

        return BUSINESS_COLUMN_INDEXES.filter(idx => idx < columns.length)
    }, [mode, columns])

    if (!section.columns || section.columns.length === 0) {
        return null
    }

    const rowEntries: RowEntry[] = useMemo(() => {
        const rows = section.rows ?? []
        return rows.map((row, originalIndex) => ({ row: row as TableRow, originalIndex }))
    }, [section.rows])

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

    const key = useMemo(() => storageKeyFor(domId), [domId])

    useEffect(() => {
        const loaded = safeLoadSortState(key, columns.length)
        if (loaded) {
            setSort(loaded)
        }
    }, [key, columns.length])

    // Нормализация старого состояния kind:'default' в direction.
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
        safeSaveSortState(key, sort)
    }, [key, sort])

    const isSortColVisible = sort.colIdx !== null && visibleColumnIndexes.includes(sort.colIdx)

    const displayEntries = useMemo(() => {
        // Сортировка по скрытой колонке — состояние сохраняем, но на текущую таблицу не применяем.
        if (!isSortColVisible) {
            return rowEntries
        }

        if (sort.colIdx === null || sort.kind === 'none') {
            return rowEntries
        }

        const defaultDir = defaultDirByColIdx.get(sort.colIdx) ?? null
        const resolved = resolveDir(sort.kind, defaultDir)

        // Для defaultable-колонок: direction == defaultDir означает "как есть".
        if (defaultDir && resolved === defaultDir) {
            return rowEntries
        }

        if (!resolved) {
            return rowEntries
        }

        return stableSortByCol(rowEntries, sort.colIdx, resolved)
    }, [rowEntries, sort, isSortColVisible, defaultDirByColIdx])

    const exportColumns = visibleColumnIndexes.map(colIdx => columns[colIdx] ?? `col_${colIdx}`)
    const exportRows: ExportCell[][] = useMemo(
        () =>
            displayEntries.map(entry =>
                visibleColumnIndexes.map(colIdx => toExportCell(getCellValue(entry.row, colIdx)))
            ),
        [displayEntries, visibleColumnIndexes]
    )

    const fileBaseName = section.title || domId

    const handleSortToggle = (colIdx: number) => {
        const defaultDir = defaultDirByColIdx.get(colIdx) ?? null
        const isDefaultable = defaultDir !== null

        setSort(prev => {
            // Новая колонка
            if (prev.colIdx !== colIdx) {
                if (isDefaultable) {
                    // Первый клик = противоположное дефолту, чтобы пользователь видел изменение.
                    return { colIdx, kind: oppositeDir(defaultDir!) }
                }
                return { colIdx, kind: 'asc' }
            }

            // Тоггл по текущей колонке
            if (isDefaultable) {
                const def = defaultDir!
                const currentDir = resolveDir(prev.kind, def) ?? def
                const nextDir = currentDir === def ? oppositeDir(def) : def
                return { colIdx, kind: nextDir }
            }

            // Обычная колонка: none -> asc -> desc -> none
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

    return (
        <section id={domId} className={cls.tableCard}>
            <header className={cls.cardHeader}>
                <div>
                    <Text type='h3' className={cls.cardTitle}>
                        {section.title}
                    </Text>
                    <ViewModeToggle mode={mode} onChange={setMode} className={cls.modeToggle} />
                </div>

                <TableExportButton
                    columns={exportColumns}
                    rows={exportRows}
                    fileBaseName={fileBaseName}
                    defaultFormat='pdf'
                />
            </header>

            <div className={cls.tableScroll}>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            {visibleColumnIndexes.map(colIdx => {
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
                                            title={titleHint}
                                        >
                                            <span>{title}</span>

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
                        {displayEntries.map(entry => (
                            <tr key={entry.originalIndex}>
                                {visibleColumnIndexes.map(colIdx => (
                                    <td key={colIdx}>{toExportCell(getCellValue(entry.row, colIdx)) as any}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

// Пропсы страницы PFI.
interface PfiPageProps {
    className?: string
}

export default function PfiPage({ className }: PfiPageProps) {
    const { data, isError, error, refetch } = usePfiPerModelReportQuery()

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                (section): section is TableSectionDto =>
                    Array.isArray((section as TableSectionDto).columns) &&
                    (section as TableSectionDto).columns!.length > 0
            ),
        [data]
    )

    const tabs = useMemo(() => buildPfiTabsFromSections(tableSections), [tableSections])

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
        syncHash: true
    })

    const rootClassName = classNames(cls.PfiPage, {}, [className ?? ''])

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить PFI отчёт'>
            {data && (
                <div className={rootClassName}>
                    <header className={cls.headerRow}>
                        <div>
                            <Text type='h2'>{data.title || 'PFI по моделям'}</Text>
                            <Text className={cls.subtitle}>
                                Отчёт по важности признаков (Permutation Feature Importance) для всех бинарных моделей
                                (move / dir / micro / SL и т.п.).
                            </Text>
                        </div>
                        <div className={cls.meta}>
                            <Text>Generated at: {new Date(data.generatedAtUtc).toLocaleString()}</Text>
                            <Text>Kind: {data.kind}</Text>
                        </div>
                    </header>

                    {tableSections.length === 0 ? (
                        <div>
                            <Text type='h2'>PFI отчёт пустой</Text>
                            <Text>
                                Бэкенд вернул отчёт без табличных секций. Имеет смысл проверить конфигурацию генерации
                                PFI или данные в базе.
                            </Text>
                        </div>
                    ) : (
                        <>
                            <div className={cls.tablesGrid}>
                                {tableSections.map((section, index) => {
                                    const tab = tabs[index]
                                    const domId = tab?.anchor ?? `pfi-model-${index + 1}`

                                    return <PfiTableCard key={section.title ?? domId} section={section} domId={domId} />
                                })}
                            </div>

                            {tabs.length > 1 && (
                                <SectionPager
                                    sections={tabs}
                                    currentIndex={currentIndex}
                                    canPrev={canPrev}
                                    canNext={canNext}
                                    onPrev={handlePrev}
                                    onNext={handleNext}
                                />
                            )}
                        </>
                    )}
                </div>
            )}
        </PageDataBoundary>
    )
}
