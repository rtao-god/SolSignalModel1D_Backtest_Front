import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { ReportActualStatusCard, ReportTableTermsBlock, Text } from '@/shared/ui'
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
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import { buildReportTermsFromSectionsOrThrow, type ReportTermItem } from '@/shared/utils/reportTerms'
import cls from './ReportDocumentView.module.scss'

interface ReportDocumentViewProps {
    report: ReportDocumentDto
    className?: string
}

export function ReportDocumentView({ report, className }: ReportDocumentViewProps) {
    const rootClassName = classNames(cls.ReportRoot, {}, [className ?? ''])

    const generatedAtState = useMemo(() => {
        if (!report.generatedAtUtc) {
            return { error: new Error('[report-document-view] generatedAtUtc is missing.') }
        }

        const parsed = new Date(report.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return { error: new Error(`[report-document-view] generatedAtUtc is invalid: ${report.generatedAtUtc}`) }
        }

        return { error: null as Error | null }
    }, [report.generatedAtUtc])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpointOrThrow(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to resolve report source endpoint.')
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const tableSections = useMemo(
        () => report.sections.filter(section => isTableSection(section)) as TableSectionDto[],
        [report.sections]
    )
    const termsState = useMemo(() => {
        if (tableSections.length === 0) {
            return {
                terms: [] as ReportTermItem[],
                error: null as Error | null
            }
        }

        try {
            return {
                terms: buildReportTermsFromSectionsOrThrow({
                    sections: tableSections,
                    reportKind: report.kind,
                    contextTag: 'report-document-view',
                    resolveSectionTitle: section =>
                        normalizeReportTitle(section.title) || section.title || 'report-table'
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build report terms.')
            return {
                terms: [] as ReportTermItem[],
                error: safeError
            }
        }
    }, [report.kind, tableSections])

    if (generatedAtState.error) {
        return (
            <PageError
                title='Report has invalid generatedAtUtc'
                message='generatedAtUtc отсутствует или невалиден. Проверь сериализацию отчёта.'
                error={generatedAtState.error}
            />
        )
    }

    if (sourceEndpointState.error || !sourceEndpointState.value) {
        return (
            <PageError
                title='Report source is invalid'
                message='API source endpoint is missing or invalid. Проверь VITE_API_BASE_URL / VITE_DEV_API_PROXY_TARGET.'
                error={
                    sourceEndpointState.error ??
                    new Error('[report-document-view] report source endpoint is missing after validation.')
                }
            />
        )
    }

    if (termsState.error) {
        return (
            <PageError
                title='Report terms are invalid'
                message='Не удалось построить термины для таблиц отчёта. Проверь колонки и словарь подсказок.'
                error={termsState.error}
            />
        )
    }

    const hasSections = Array.isArray(report.sections) && report.sections.length > 0
    const hasTableSections = tableSections.length > 0

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>{report.title}</Text>
                    <span className={cls.kindTag}>{report.kind}</span>
                </div>

                <ReportActualStatusCard
                    statusMode='debug'
                    statusTitle='DEBUG: freshness not verified'
                    statusMessage={`Status endpoint для ${report.kind} не настроен: показываются metadata отчёта без freshness-проверки.`}
                    dataSource={sourceEndpointState.value}
                    reportTitle={report.title}
                    reportId={report.id}
                    reportKind={report.kind}
                    generatedAtUtc={report.generatedAtUtc}
                />
            </header>

            <div className={cls.sections}>
                {hasTableSections && (
                    <ReportTableTermsBlock
                        terms={termsState.terms}
                        title='Термины таблиц отчёта'
                        subtitle='Подробные определения всех колонок, которые используются в текущем наборе таблиц.'
                        className={cls.termsBlock}
                    />
                )}

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
    return title
        .replace(/^=+\s*/, '')
        .replace(/\s*=+$/, '')
        .trim()
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
            <section className={cls.section}>
                <ReportTableCard
                    title={visibleTitle}
                    description={resolvedDescription ?? undefined}
                    columns={columns}
                    rows={rows}
                    domId={domId}
                    renderColumnTitle={renderColumnTitle}
                />
            </section>
        )
    }

    return (
        <section className={cls.section}>
            <pre className={cls.jsonDump}>{JSON.stringify(section, null, 2)}</pre>
        </section>
    )
}
