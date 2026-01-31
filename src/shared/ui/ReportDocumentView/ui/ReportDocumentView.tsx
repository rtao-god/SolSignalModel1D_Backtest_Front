import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import type {
    ReportDocumentDto,
    ReportSectionDto,
    KeyValueSectionDto,
    TableSectionDto
} from '@/shared/types/report.types'
import cls from './ReportDocumentView.module.scss'

interface ReportDocumentViewProps {
    report: ReportDocumentDto
    className?: string
}

/*
	Компонент отображения отчёта ReportDocumentDto.

	- Шапка с title/kind/id и временем генерации.
	- Универсальный рендер секций (KeyValue, таблицы, JSON-фолбэк).
	- Стили заточены под тёмную тему.
*/
export function ReportDocumentView({ report, className }: ReportDocumentViewProps) {
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

    const rootClassName = classNames(cls.ReportRoot, {}, [className ?? ''])

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>{report.title}</Text>
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
                :   <Text>Нет секций отчёта для отображения.</Text>}
            </div>
        </div>
    )
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

/*
	Эвристика для определения направления по строковому значению.

	- Нужна, чтобы подсветить значения типа "long"/"short"/"flat".
*/
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

/*
	Рендер одной секции отчёта.

	- KeyValue секции.
	- Табличные секции.
	- JSON-фолбэк для новых/неизвестных структур.
*/
function SectionRenderer({ section }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto
    const description = (section as any)?.description as string | undefined

    if (isKeyValueSection(section)) {
        return (
            <section className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h2' className={cls.sectionTitle}>
                        {kv.title}
                    </Text>

                    {description && <Text className={cls.sectionSubtitle}>{description}</Text>}
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
                    <Text type='h2' className={cls.sectionTitle}>
                        {tbl.title}
                    </Text>

                    {description && <Text className={cls.sectionSubtitle}>{description}</Text>}
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

