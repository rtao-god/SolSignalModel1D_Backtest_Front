import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { ReportActualStatusCard, ReportTableTermsBlock, Text } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import {
    resolveReportColumnTooltip,
    resolveReportKeyTooltip,
    resolveReportTooltipSelfAliases
} from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import {
    localizeReportColumnTitle,
    localizeReportDocumentTitle,
    localizeReportKeyLabel,
    localizeReportKeyValue,
    localizeReportSectionTitle
} from '@/shared/utils/reportPresentationLocalization'
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
import { useTranslation } from 'react-i18next'
import cls from './ReportDocumentView.module.scss'

interface ReportDocumentViewProps {
    report: ReportDocumentDto
    className?: string
}

export function ReportDocumentView({ report, className }: ReportDocumentViewProps) {
    const { i18n } = useTranslation()
    const rootClassName = classNames(cls.ReportRoot, {}, [className ?? ''])
    const reportUiLanguage = i18n.resolvedLanguage ?? i18n.language

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
                    locale: reportUiLanguage,
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
    }, [report.kind, reportUiLanguage, tableSections])

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
    const localizedReportTitle = localizeReportDocumentTitle(report.kind, report.title, reportUiLanguage)

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1' className={cls.reportTitle}>
                        {localizedReportTitle}
                    </Text>
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
                        reportKind={report.kind}
                        terms={termsState.terms}
                        title='Термины таблиц отчёта'
                        subtitle='Подробные определения всех колонок, которые используются в текущем наборе таблиц.'
                        enhanceDomainTerms
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

    if (v.includes('long') || v.includes('лонг') || v.includes('bull') || v.includes('рост')) {
        return 'long'
    }

    if (
        v.includes('short') ||
        v.includes('шорт') ||
        v.includes('bear') ||
        v.includes('падение') ||
        v.includes('микро-падение')
    ) {
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
    const { i18n } = useTranslation()
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto
    const description = (section as any)?.description as string | undefined

    if (isKeyValueSection(section)) {
        const rawVisibleTitle = normalizeReportTitle(kv.title) || kv.title
        const visibleTitle = localizeReportSectionTitle(reportKind, rawVisibleTitle, i18n.language)
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
                        const localizedValue = localizeReportKeyValue(reportKind, item.key, item.value, i18n.language)
                        const localizedKey = localizeReportKeyLabel(reportKind, item.key, i18n.language)
                        const direction = detectDirection(localizedValue)
                        const keyTooltip = resolveReportKeyTooltip(reportKind, rawVisibleTitle, item.key)
                        const keySelfAliases = resolveReportTooltipSelfAliases(reportKind, item.key)
                        const renderedKey = renderTermTooltipTitle(localizedKey, keyTooltip, {
                            selfAliases: [item.key, ...keySelfAliases]
                        })

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
                                    {localizedValue}
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
        const rawVisibleTitle = normalizeReportTitle(tbl.title) || tbl.title || 'table'
        const visibleTitle = localizeReportSectionTitle(reportKind, rawVisibleTitle, i18n.language)
        const resolvedDescription = description ?? resolveReportSectionDescription(reportKind, tbl.title)
        const safeTitle = rawVisibleTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        const domId = `report-${safeTitle || 'table'}`

        const renderColumnTitle = (title: string) => {
            const tooltip = resolveReportColumnTooltip(reportKind, rawVisibleTitle, title)
            const localizedTitle = localizeReportColumnTitle(reportKind, title, i18n.language)
            const columnSelfAliases = resolveReportTooltipSelfAliases(reportKind, title)
            return renderTermTooltipTitle(localizedTitle, tooltip, {
                selfAliases: [title, ...columnSelfAliases]
            })
        }

        const localizedColumns = columns.map(column => localizeReportColumnTitle(reportKind, column, i18n.language))

        return (
            <section className={cls.section}>
                <ReportTableCard
                    title={visibleTitle}
                    description={resolvedDescription ?? undefined}
                    columns={localizedColumns}
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
