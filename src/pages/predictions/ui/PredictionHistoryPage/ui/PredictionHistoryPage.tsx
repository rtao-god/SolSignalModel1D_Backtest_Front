import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { useGetCurrentPredictionIndexQuery, useGetCurrentPredictionByDateQuery } from '@/shared/api/api'
import type {
    ReportDocumentDto,
    ReportSectionDto,
    KeyValueSectionDto,
    TableSectionDto
} from '@/shared/types/report.types'
import { selectArrivalDate, selectDepartureDate } from '@/entities/date'
import cls from './PredictionHistoryPage.module.scss'
import DatePicker from '@/features/datePicker/ui/DatePicker/DatePicker'

const PAGE_SIZE = 10

interface PredictionHistoryPageProps {
    className?: string
}

export default function PredictionHistoryPage({ className }: PredictionHistoryPageProps) {
    // 1) Индекс доступных прогнозов (только даты / id, без тяжёлых отчётов).
    // Берём достаточно широкий диапазон (например, 365 дней), чтобы не дёргать бэкенд лишний раз.
    const {
        data: index,
        isLoading: isIndexLoading,
        isError: isIndexError
    } = useGetCurrentPredictionIndexQuery({ days: 365 })

    // 2) Диапазон дат из Redux-слайса date, который управляется DatePicker/Calendar.
    // Предполагается, что .value уже в формате YYYY-MM-DD.
    const departure = useSelector(selectDepartureDate)
    const arrival = useSelector(selectArrivalDate)

    const fromDate = departure?.value ?? null
    const toDate = arrival?.value ?? null

    // 3) Сколько дней (отчётов) показываем на странице.
    // По умолчанию 10, при "Показать ещё" увеличиваем на PAGE_SIZE.
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

    // 4) Все уникальные даты (YYYY-MM-DD), отсортированные по убыванию.
    const allDatesDesc = useMemo(() => {
        if (!index || index.length === 0) {
            return [] as string[]
        }

        const dateSet = new Set<string>()

        for (const item of index) {
            // predictionDateUtc ожидается в ISO-формате, первые 10 символов — yyyy-MM-dd
            const dateKey = item.predictionDateUtc.substring(0, 10)
            dateSet.add(dateKey)
        }

        const dates = Array.from(dateSet)
        // Сортируем по убыванию: от новых дат к старым
        dates.sort((a, b) =>
            a < b ? 1
            : a > b ? -1
            : 0
        )

        return dates
    }, [index])

    // 5) Фильтрация дат по диапазону fromDate / toDate, если они заданы.
    const filteredDates = useMemo(() => {
        if (!allDatesDesc.length) {
            return [] as string[]
        }

        return allDatesDesc.filter(date => {
            if (fromDate && date < fromDate) {
                return false
            }
            if (toDate && date > toDate) {
                return false
            }
            return true
        })
    }, [allDatesDesc, fromDate, toDate])

    // 6) При изменении фильтра/набора дат — сбрасываем пагинацию на первую "страницу".
    useEffect(() => {
        if (!filteredDates.length) {
            setVisibleCount(PAGE_SIZE)
            return
        }

        // Если после фильтрации доступно меньше дней, чем было показано —
        // подрезаем visibleCount до разумного минимума (но не меньше PAGE_SIZE).
        setVisibleCount(prev => {
            if (prev <= PAGE_SIZE) {
                return PAGE_SIZE
            }
            return Math.min(prev, filteredDates.length)
        })
    }, [filteredDates])

    // 7) Даты, которые реально выводим сейчас (учитывая пагинацию).
    const visibleDates = useMemo(() => filteredDates.slice(0, visibleCount), [filteredDates, visibleCount])

    const canLoadMore = visibleDates.length < filteredDates.length
    const remainingCount = filteredDates.length - visibleDates.length

    const rootClassName = classNames(cls.HistoryPage, {}, [className ?? ''])

    if (isIndexLoading) {
        return (
            <div className={rootClassName}>
                <Text type='h2'>Загружаю индекс исторических прогнозов…</Text>
            </div>
        )
    }

    if (isIndexError || !allDatesDesc.length) {
        return (
            <div className={rootClassName}>
                <div className={cls.errorCard}>
                    <Text type='h2'>Не удалось загрузить историю прогнозов</Text>
                    <Text type='p'>
                        Проверьте, что бэкенд запущен и endpoint /current-prediction/dates отдаёт данные.
                    </Text>
                </div>
            </div>
        )
    }

    const totalCount = allDatesDesc.length
    const filteredCount = filteredDates.length

    return (
        <div className={rootClassName}>
            {/* Шапка страницы с общей информацией о количестве прогнозов */}
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>История прогнозов</Text>
                    <span className={cls.headerTag}>current_prediction</span>
                </div>

                <div className={cls.headerMeta}>
                    <span>Всего дней с прогнозами: {totalCount}</span>
                    <span>Сейчас в выборке (по фильтру): {filteredCount}</span>
                </div>
            </header>

            {/* Фильтры: DatePicker управляет Redux-слайсом date, который мы используем как диапазон */}
            <section className={cls.filters}>
                <div className={cls.filtersRow}>
                    <DatePicker className={cls.datePicker} />
                    <div className={cls.filtersInfo}>
                        <Text type='p'>
                            Диапазон задаётся через выбор начальной и конечной даты. Если диапазон не выбран, будут
                            показаны последние доступные дни.
                        </Text>
                        {fromDate && toDate && (
                            <Text type='p' className={cls.filtersRangeSummary}>
                                Текущий фильтр: {fromDate} — {toDate} (UTC)
                            </Text>
                        )}
                    </div>
                </div>
            </section>

            {/* Контент: список отчётов по дням + пагинация "Показать ещё" */}
            <section className={cls.content}>
                {filteredCount === 0 && (
                    <Text type='p'>В выбранном диапазоне нет прогнозов. Попробуйте изменить даты.</Text>
                )}

                {filteredCount > 0 && (
                    <>
                        <div className={cls.cards}>
                            {visibleDates.map(date => (
                                <PredictionHistoryReportCard key={date} dateUtc={date} />
                            ))}
                        </div>

                        {canLoadMore && (
                            <div className={cls.loadMore}>
                                <button
                                    type='button'
                                    className={cls.loadMoreButton}
                                    onClick={() =>
                                        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredDates.length))
                                    }>
                                    Показать ещё {remainingCount >= PAGE_SIZE ? PAGE_SIZE : remainingCount} дней
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}

interface PredictionHistoryReportCardProps {
    dateUtc: string
}

/**
 * Карточка одного отчёта за конкретный день.
 * Здесь происходит запрос тяжёлого ReportDocumentDto, но только для видимых дат.
 */
function PredictionHistoryReportCard({ dateUtc }: PredictionHistoryReportCardProps) {
    const { data, isLoading, isError } = useGetCurrentPredictionByDateQuery({ dateUtc })

    if (isLoading) {
        return (
            <div className={cls.reportCard}>
                <Text type='p'>Загружаю отчёт за {dateUtc}…</Text>
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className={cls.reportCard}>
                <div className={cls.errorCard}>
                    <Text type='h3'>Не удалось загрузить отчёт</Text>
                    <Text type='p'>Проверьте endpoint /current-prediction/by-date для даты {dateUtc}.</Text>
                </div>
            </div>
        )
    }

    return (
        <div className={cls.reportCard}>
            <PredictionReportView report={data} />
        </div>
    )
}

/* ===== Ниже — общий рендер ReportDocumentDto (аналогичный текущему прогнозу) ===== */

interface PredictionReportViewProps {
    report: ReportDocumentDto
}

interface SectionRendererProps {
    section: ReportSectionDto
}

// Определение, является ли секция KeyValue-форматом.
function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

// Определение, является ли секция табличной.
function isTableSection(section: ReportSectionDto): section is TableSectionDto {
    const tbl = section as TableSectionDto
    return Array.isArray(tbl.columns) && Array.isArray(tbl.rows)
}

type DirectionKind = 'long' | 'short' | 'flat'

// Эвристика для определения направления (лонг/шорт/флэт) по строковому значению.
function detectDirection(value: unknown): DirectionKind | null {
    if (value === null || value === undefined) {
        return null
    }

    const v = String(value).toLowerCase()

    if (v.includes('long') || v.includes('лонг') || v.includes('bull')) {
        return 'long'
    }

    if (v.includes('short') || v.includes('шорт') || v.includes('bear')) {
        return 'short'
    }

    if (v.includes('flat') || v.includes('флэт') || v.includes('боковик') || v.includes('sideways')) {
        return 'flat'
    }

    return null
}

// Парсинг числовых значений для подсветки плюса/минуса.
function parseNumericCell(raw: string): number | null {
    if (!raw) {
        return null
    }

    const cleaned = raw.replace(/\s/g, '').replace('%', '').replace(',', '.')
    const num = Number.parseFloat(cleaned)

    if (Number.isNaN(num)) {
        return null
    }

    return num
}

// Рендер одного отчёта: шапка + секции.
function PredictionReportView({ report }: PredictionReportViewProps) {
    const generatedUtc = report.generatedAtUtc ? new Date(report.generatedAtUtc) : null

    const formatUtc = (date: Date): string => {
        const year = date.getUTCFullYear()
        const month = String(date.getUTCMonth() + 1).padStart(2, '0')
        const day = String(date.getUTCDate()).padStart(2, '0')
        const hour = String(date.getUTCHours()).padStart(2, '0')
        const minute = String(date.getUTCMinutes()).padStart(2, '0')

        return `${year}-${month}-${day} ${hour}:${minute} UTC`
    }

    const generatedUtcStr = generatedUtc ? formatUtc(generatedUtc) : '—'

    const generatedLocalStr =
        generatedUtc ?
            generatedUtc.toLocaleString(undefined, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        :   '—'

    const hasSections = Array.isArray(report.sections) && report.sections.length > 0

    return (
        <div className={cls.reportRoot}>
            <header className={cls.reportHeader}>
                <div className={cls.reportHeaderMain}>
                    <Text type='h2'>{report.title}</Text>
                    <span className={cls.kindTag}>{report.kind}</span>
                </div>

                <div className={cls.meta}>
                    <span className={cls.metaItem}>ID отчёта: {report.id}</span>
                    <span className={cls.metaItem}>Сгенерировано (UTC): {generatedUtcStr}</span>
                    <span className={cls.metaItem}>Сгенерировано (локальное время): {generatedLocalStr}</span>
                </div>
            </header>

            <div className={cls.sections}>
                {hasSections ?
                    report.sections.map((section, index) => <SectionRenderer key={index} section={section} />)
                :   <Text type='p'>Нет секций отчёта для отображения.</Text>}
            </div>
        </div>
    )
}

// Рендер одной секции отчёта (KeyValue, таблица или JSON-фолбэк).
function SectionRenderer({ section }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto
    const description = (section as any)?.description as string | undefined

    if (isKeyValueSection(section)) {
        return (
            <section className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {kv.title}
                    </Text>

                    {description && (
                        <Text type='p' className={cls.sectionSubtitle}>
                            {description}
                        </Text>
                    )}
                </div>

                <dl className={cls.kvList}>
                    {kv.items!.map(item => {
                        const direction = detectDirection(item.value)

                        return (
                            <div key={item.key} className={cls.kvRow}>
                                <dt className={cls.kvKey}>{item.key}</dt>

                                <dd
                                    className={classNames(
                                        cls.kvValue,
                                        {
                                            [cls.valueLong]: direction === 'long',
                                            [cls.valueShort]: direction === 'short',
                                            [cls.valueFlat]: direction === 'flat'
                                        },
                                        []
                                    )}>
                                    {item.value}
                                </dd>
                            </div>
                        )
                    })}
                </dl>
            </section>
        )
    }

    if (isTableSection(section)) {
        return (
            <section className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {tbl.title}
                    </Text>

                    {description && (
                        <Text type='p' className={cls.sectionSubtitle}>
                            {description}
                        </Text>
                    )}
                </div>

                <div className={cls.tableWrapper}>
                    <table className={cls.table}>
                        <thead>
                            <tr>
                                {tbl.columns?.map(column => (
                                    <th key={column} className={cls.tableHeaderCell}>
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tbl.rows?.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => {
                                        const numeric = parseNumericCell(cell)
                                        const isPositive = numeric !== null && numeric > 0
                                        const isNegative = numeric !== null && numeric < 0

                                        return (
                                            <td
                                                key={cellIndex}
                                                className={classNames(
                                                    cls.tableCell,
                                                    {
                                                        [cls.positive]: isPositive,
                                                        [cls.negative]: isNegative
                                                    },
                                                    []
                                                )}>
                                                {cell}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        )
    }

    return (
        <section className={cls.section}>
            <pre className={cls.jsonDump}>{JSON.stringify(section, null, 2)}</pre>
        </section>
    )
}
