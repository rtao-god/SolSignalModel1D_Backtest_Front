import classNames from '@/shared/lib/helpers/classNames'
import cls from './CurrentMLModelPrediction.module.scss'
import { Text } from '@/shared/ui'
import type { ReportSectionDto, KeyValueSectionDto, TableSectionDto } from '@/shared/types/report.types'
import CurrentMLModelPredictionProps from './types'
import { useGetCurrentPredictionQuery } from '@/shared/api/api'

export default function CurrentMLModelPredictionPage({ className }: CurrentMLModelPredictionProps) {
    // RTK Query: тянем текущий прогноз
    const { data, isLoading, isError } = useGetCurrentPredictionQuery()

    // Базовый layout для всех состояний — чтобы страница не "прыгалась"
    const rootClassName = classNames(cls.CurrentPredictionPage, {}, [className ?? ''])

    if (isLoading) {
        // Простой state загрузки, без спиннера — на будущее можно заменить на Skeleton
        return (
            <div className={rootClassName}>
                <Text type='h2'>Загружаю текущий прогноз…</Text>
            </div>
        )
    }

    if (isError || !data) {
        // Ошибка/нет данных — единый аккуратный блок
        return (
            <div className={rootClassName}>
                <div className={cls.errorCard}>
                    <Text type='h2'>Не удалось загрузить текущий прогноз</Text>
                    <Text type='p'>
                        Попробуйте обновить страницу. Если проблема повторяется — проверьте, что бэкенд запущен и отчёт
                        по текущему прогнозу действительно генерируется.
                    </Text>
                </div>
            </div>
        )
    }

    // Форматирование времени генерации
    const generatedUtc = data.generatedAtUtc ? new Date(data.generatedAtUtc) : null

    // Форматируем UTC-время руками, без миллисекунд и без ISO-мусора
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

    const hasSections = Array.isArray(data.sections) && data.sections.length > 0

    return (
        <div className={rootClassName}>
            {/* Шапка отчёта: название + мета-информация */}
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>{data.title}</Text>

                    {/* Небольшой бейдж с типом отчёта, смотрится как "тег" */}
                    <span className={cls.kindTag}>{data.kind}</span>
                </div>

                <div className={cls.meta}>
                    <span className={cls.metaItem}>ID отчёта: {data.id}</span>
                    <span className={cls.metaItem}>Сгенерировано (UTC): {generatedUtcStr}</span>
                    <span className={cls.metaItem}>Сгенерировано (локальное время): {generatedLocalStr}</span>
                </div>
            </header>

            {/* Секции отчёта: каждая секция — отдельная карточка */}
            <div className={cls.sections}>
                {hasSections ?
                    data.sections.map((section, index) => <SectionRenderer key={index} section={section} />)
                :   <Text type='p'>Нет секций отчёта для отображения.</Text>}
            </div>
        </div>
    )
}

interface SectionRendererProps {
    section: ReportSectionDto
}

/**
 * Определение, является ли секция KeyValue-форматом.
 * Здесь нет жёсткой завязки на типы — просто проверка структуры.
 */
function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

/**
 * Определение, является ли секция табличной.
 */
function isTableSection(section: ReportSectionDto): section is TableSectionDto {
    const tbl = section as TableSectionDto
    return Array.isArray(tbl.columns) && Array.isArray(tbl.rows)
}

/**
 * Простая эвристика для определения направления (лонг/шорт/флэт)
 * по строковому значению. Нужна, чтобы красить значения в разные цвета.
 */
type DirectionKind = 'long' | 'short' | 'flat'

function detectDirection(value: unknown): DirectionKind | null {
    if (value === null || value === undefined) {
        return null
    }

    const v = String(value).toLowerCase()

    // Лонг
    if (v.includes('long') || v.includes('лонг') || v.includes('bull')) {
        return 'long'
    }

    // Шорт
    if (v.includes('short') || v.includes('шорт') || v.includes('bear')) {
        return 'short'
    }

    // Боковик / флэт
    if (v.includes('flat') || v.includes('флэт') || v.includes('боковик') || v.includes('sideways')) {
        return 'flat'
    }

    return null
}

/**
 * Попытка вытащить числовое значение из ячейки таблицы.
 * Нужна для подсветки положительных/отрицательных чисел (PnL, % и т.п.).
 */
function parseNumericCell(raw: string): number | null {
    if (!raw) {
        return null
    }

    // Убираем пробелы и знак процента, меняем запятую на точку
    const cleaned = raw.replace(/\s/g, '').replace('%', '').replace(',', '.')
    const num = Number.parseFloat(cleaned)

    if (Number.isNaN(num)) {
        return null
    }

    return num
}

/**
 * Универсальный рендер секций:
 * - если есть items → KeyValue секция (например, сводка по дню/режиму);
 * - если есть columns/rows → таблица (подробная статистика);
 * - иначе дамп JSON (защита от новых форматов секций).
 */
function SectionRenderer({ section }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto
    const description = (section as any)?.description as string | undefined

    // KeyValue секция
    if (isKeyValueSection(section)) {
        return (
            <section className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h2' className={cls.sectionTitle}>
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
                                    {/* 
                                        Для направлений (лонг/шорт/флэт) визуально делаем "бейдж".
                                        Для остальных значений — обычный текст с лёгким фоном.
                                     */}
                                    {item.value}
                                </dd>
                            </div>
                        )
                    })}
                </dl>
            </section>
        )
    }

    // Табличная секция (например, подробная статистика по моделям/политикам)
    if (isTableSection(section)) {
        return (
            <section className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h2' className={cls.sectionTitle}>
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
}
