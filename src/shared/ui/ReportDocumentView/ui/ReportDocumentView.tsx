import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip, resolveReportKeyTooltip } from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import type {
    ReportDocumentDto,
    ReportSectionDto,
    KeyValueSectionDto,
    TableSectionDto
} from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import cls from './ReportDocumentView.module.scss'

interface ReportDocumentViewProps {
    report: ReportDocumentDto
    className?: string
}

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
                    report.sections.map((section, index) => (
                        <SectionRenderer key={index} section={section} reportKind={report.kind} />
                    ))
                :   <Text>Нет секций отчёта для отображения.</Text>}
            </div>
        </div>
    )
}

interface SectionRendererProps {
    section: ReportSectionDto
    reportKind?: string
}
function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}
function isTableSection(section: ReportSectionDto): section is TableSectionDto {
    const tbl = section as TableSectionDto
    return Array.isArray(tbl.columns) && Array.isArray(tbl.rows)
}

type DirectionKind = 'long' | 'short' | 'flat'

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

function normalizeReportTitle(title: string | undefined): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}

function SectionRenderer({ section, reportKind }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto
    const description = (section as any)?.description as string | undefined

    if (isKeyValueSection(section)) {
        const visibleTitle = normalizeReportTitle(kv.title) || kv.title
        const resolvedDescription = description ?? resolveReportSectionDescription(reportKind, kv.title)
        return (
            <section className={cls.section}>
                <div className={cls.sectionHeader}>
                    <Text type='h2' className={cls.sectionTitle}>
                        {visibleTitle}
                    </Text>

                    {resolvedDescription && <Text className={cls.sectionSubtitle}>{resolvedDescription}</Text>}
                </div>

                <dl className={cls.kvList}>
                    {kv.items!.map(item => {
                        const direction = detectDirection(item.value)
                        const keyTooltip = resolveReportKeyTooltip(reportKind, visibleTitle, item.key)
                        const renderedKey = renderTermTooltipTitle(item.key, keyTooltip)

                        return (
                            <div key={item.key} className={cls.kvRow}>
                                <dt className={cls.kvKey}>{renderedKey}</dt>

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
        const columns = tbl.columns ?? []
        const rows = tbl.rows ?? []
        const visibleTitle = normalizeReportTitle(tbl.title) || tbl.title || 'table'
        const resolvedDescription = description ?? resolveReportSectionDescription(reportKind, tbl.title)
        const safeTitle = visibleTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        const domId = `report-${safeTitle || 'table'}`

        const renderColumnTitle = (title: string) => {
            const tooltip = resolveReportColumnTooltip(reportKind, visibleTitle, title)
            return renderTermTooltipTitle(title, tooltip)
        }

        return (
            <ReportTableCard
                title={visibleTitle}
                description={resolvedDescription ?? undefined}
                columns={columns}
                rows={rows}
                domId={domId}
                renderColumnTitle={renderColumnTitle}
            />
        )
    }

    return (
        <section className={cls.section}>
            <pre className={cls.jsonDump}>{JSON.stringify(section, null, 2)}</pre>
        </section>
    )
}
