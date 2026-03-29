import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
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
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { buildReportTermsFromSections, type ReportTermItem } from '@/shared/utils/reportTerms'
import { useTranslation } from 'react-i18next'
import cls from './ReportDocumentView.module.scss'

export interface ReportDocumentFreshnessInfo {
    statusMode: 'actual' | 'debug'
    statusTitle: string
    statusMessage: string
    statusLagMinutes?: number | null
    statusLines?: Array<{ label: string; value: string }>
}

interface ReportDocumentViewProps {
    report: ReportDocumentDto
    freshness: ReportDocumentFreshnessInfo
    className?: string
    showTableTermsBlock?: boolean
    sectionDomIdPrefix?: string
}

export function ReportDocumentView({
    report,
    freshness,
    className,
    showTableTermsBlock = true,
    sectionDomIdPrefix
}: ReportDocumentViewProps) {
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
                value: resolveReportSourceEndpoint(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve report source endpoint.', {
                source: 'report-document-view-source-endpoint',
                domain: 'ui_section',
                owner: 'report-document-view',
                expected: 'Report document view should resolve a non-empty report source endpoint.',
                requiredAction: 'Inspect API base URL configuration and report source endpoint resolver.'
            })
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const tableSections = useMemo(
        () =>
            showTableTermsBlock ?
                (report.sections.filter(section => isTableSection(section)) as TableSectionDto[])
            :   ([] as TableSectionDto[]),
        [report.sections, showTableTermsBlock]
    )
    const termsState = useMemo(() => {
        if (!showTableTermsBlock || tableSections.length === 0) {
            return {
                terms: [] as ReportTermItem[],
                error: null as Error | null
            }
        }

        try {
            return {
                terms: buildReportTermsFromSections({
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
            const safeError = normalizeErrorLike(err, 'Failed to build report terms.', {
                source: 'report-document-view-terms',
                domain: 'ui_section',
                owner: 'report-document-view',
                expected: 'Report document view should build terms from published sections and shared glossary.',
                requiredAction: 'Inspect report sections and report terms resolver for missing owner term metadata.'
            })
            return {
                terms: [] as ReportTermItem[],
                error: safeError
            }
        }
    }, [report.kind, reportUiLanguage, showTableTermsBlock, tableSections])

    if (generatedAtState.error) {
        return (
            <PageError
                title='Report has invalid generatedAtUtc'
                message='generatedAtUtc отсутствует или невалиден. Проверь сериализацию отчёта.'
                error={generatedAtState.error}
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
    const hasTableSections = showTableTermsBlock && tableSections.length > 0
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

                {sourceEndpointState.value && (
                    <ReportActualStatusCard
                        statusMode={freshness.statusMode}
                        statusTitle={freshness.statusTitle}
                        statusMessage={freshness.statusMessage}
                        statusLagMinutes={freshness.statusLagMinutes ?? null}
                        dataSource={sourceEndpointState.value}
                        reportTitle={report.title}
                        reportId={report.id}
                        reportKind={report.kind}
                        generatedAtUtc={report.generatedAtUtc}
                        statusLines={freshness.statusLines}
                    />
                )}
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
                        <SectionRenderer
                            key={index}
                            section={section}
                            reportKind={report.kind}
                            sectionDomId={sectionDomIdPrefix ? `${sectionDomIdPrefix}-section-${index}` : undefined}
                        />
                    ))
                :   <Text>Нет секций отчёта для отображения.</Text>}
            </div>
        </div>
    )
}

interface SectionRendererProps {
    section: ReportSectionDto
    reportKind?: string
    sectionDomId?: string
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

    // Карточки отчёта приходят уже с пользовательскими подписями, поэтому направление
    // распознаётся по видимому тексту, а не по одному фиксированному backend-токену.
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

    if (v.includes('flat') || v.includes('боковик') || v.includes('sideways')) {
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

function SectionRenderer({ section, reportKind, sectionDomId }: SectionRendererProps) {
    const { i18n } = useTranslation()
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto
    const description = (section as any)?.description as string | undefined

    if (isKeyValueSection(section)) {
        const rawVisibleTitle = normalizeReportTitle(kv.title) || kv.title
        const visibleTitle = localizeReportSectionTitle(reportKind, rawVisibleTitle, i18n.language)
        const resolvedDescription = description ?? resolveReportSectionDescription(reportKind, kv.title)
        return (
            <section id={sectionDomId} className={cls.section}>
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
        const domId = sectionDomId ?? `report-${safeTitle || 'table'}`

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
                    rowEvaluations={tbl.rowEvaluations ?? []}
                    domId={domId}
                    renderColumnTitle={renderColumnTitle}
                />
            </section>
        )
    }

    return (
        <section id={sectionDomId} className={cls.section}>
            <pre className={cls.jsonDump}>{JSON.stringify(section, null, 2)}</pre>
        </section>
    )
}
