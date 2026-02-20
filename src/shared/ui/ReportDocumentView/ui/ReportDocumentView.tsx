import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { ReportActualStatusCard, ReportTableTermsBlock, ReportViewControls, Text } from '@/shared/ui'
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
import {
    filterPolicyBranchMegaSectionsByBucketOrThrow,
    filterPolicyBranchMegaSectionsByMetricOrThrow,
    filterPolicyBranchMegaSectionsByTpSlModeOrThrow,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaMetricFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery
} from '@/shared/utils/policyBranchMegaTabs'
import {
    DEFAULT_REPORT_BUCKET_MODE,
    DEFAULT_REPORT_METRIC_MODE,
    DEFAULT_REPORT_TP_SL_MODE,
    resolveReportViewCapabilities,
    validateReportViewSelectionOrThrow
} from '@/shared/utils/reportViewCapabilities'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import { buildReportTermsFromSectionsOrThrow, type ReportTermItem } from '@/shared/utils/reportTerms'
import cls from './ReportDocumentView.module.scss'

interface ReportDocumentViewProps {
    report: ReportDocumentDto
    className?: string
}

export function ReportDocumentView({ report, className }: ReportDocumentViewProps) {
    const [searchParams, setSearchParams] = useSearchParams()
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
    const viewCapabilities = useMemo(() => resolveReportViewCapabilities(tableSections), [tableSections])

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(searchParams.get('bucket'), DEFAULT_REPORT_BUCKET_MODE)
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse report bucket query.')
            return { value: DEFAULT_REPORT_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(searchParams.get('metric'), DEFAULT_REPORT_METRIC_MODE)
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse report metric query.')
            return { value: DEFAULT_REPORT_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_REPORT_TP_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse report tpsl query.')
            return { value: DEFAULT_REPORT_TP_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const viewSelectionState = useMemo(() => {
        try {
            validateReportViewSelectionOrThrow(
                {
                    bucket: bucketState.value,
                    metric: metricState.value,
                    tpSl: tpSlState.value
                },
                viewCapabilities,
                'report-document-view'
            )

            return { error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to validate report view state.')
            return { error: safeError }
        }
    }, [bucketState.value, metricState.value, tpSlState.value, viewCapabilities])

    const filteredTableSectionsState = useMemo(() => {
        if (viewSelectionState.error) {
            return { sections: [] as TableSectionDto[], error: viewSelectionState.error }
        }

        try {
            let nextSections = tableSections

            if (viewCapabilities.supportsBucketFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByBucketOrThrow(nextSections, bucketState.value)
            }

            if (viewCapabilities.supportsMetricFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByMetricOrThrow(nextSections, metricState.value)
            }

            if (viewCapabilities.supportsTpSlFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByTpSlModeOrThrow(nextSections, tpSlState.value)
            }

            return { sections: nextSections, error: null as Error | null }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to filter report table sections by bucket/metric.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [bucketState.value, metricState.value, tableSections, tpSlState.value, viewCapabilities, viewSelectionState.error])

    const filteredTableSet = useMemo(() => new Set(filteredTableSectionsState.sections), [filteredTableSectionsState.sections])
    const termsState = useMemo(() => {
        if (filteredTableSectionsState.sections.length === 0) {
            return {
                terms: [] as ReportTermItem[],
                error: null as Error | null
            }
        }

        try {
            return {
                terms: buildReportTermsFromSectionsOrThrow({
                    sections: filteredTableSectionsState.sections,
                    reportKind: report.kind,
                    contextTag: 'report-document-view',
                    resolveSectionTitle: section => normalizeReportTitle(section.title) || section.title || 'report-table'
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
    }, [filteredTableSectionsState.sections, report.kind])

    const sectionsForView = useMemo(
        () =>
            report.sections.filter(section => {
                if (!isTableSection(section)) {
                    return true
                }

                return filteredTableSet.has(section)
            }),
        [filteredTableSet, report.sections]
    )

    const handleBucketChange = (next: typeof bucketState.value) => {
        if (next === bucketState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('bucket', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleMetricChange = (next: typeof metricState.value) => {
        if (next === metricState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('metric', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleTpSlModeChange = (next: typeof tpSlState.value) => {
        if (next === tpSlState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('tpsl', next)
        setSearchParams(nextParams, { replace: true })
    }

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

    if (bucketState.error) {
        return (
            <PageError
                title='Report bucket query is invalid'
                message='Query parameter \"bucket\" is invalid. Expected daily, intraday, delayed, or total.'
                error={bucketState.error}
            />
        )
    }

    if (metricState.error) {
        return (
            <PageError
                title='Report metric query is invalid'
                message='Query parameter \"metric\" is invalid. Expected real or no-biggest-liq-loss.'
                error={metricState.error}
            />
        )
    }

    if (tpSlState.error) {
        return (
            <PageError
                title='Report TP/SL query is invalid'
                message='Query parameter \"tpsl\" is invalid. Expected all, dynamic, or static.'
                error={tpSlState.error}
            />
        )
    }

    if (filteredTableSectionsState.error) {
        return (
            <PageError
                title='Report sections are missing'
                message='Report sections for the selected bucket/metric were not found or are tagged inconsistently.'
                error={filteredTableSectionsState.error}
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

    const hasSections = Array.isArray(sectionsForView) && sectionsForView.length > 0
    const hasTableSections = filteredTableSectionsState.sections.length > 0

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>{report.title}</Text>
                    <span className={cls.kindTag}>{report.kind}</span>
                    <ReportViewControls
                        bucket={bucketState.value}
                        metric={metricState.value}
                        tpSlMode={tpSlState.value}
                        capabilities={viewCapabilities}
                        onBucketChange={handleBucketChange}
                        onMetricChange={handleMetricChange}
                        onTpSlModeChange={handleTpSlModeChange}
                    />
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
                    sectionsForView.map((section, index) => (
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
