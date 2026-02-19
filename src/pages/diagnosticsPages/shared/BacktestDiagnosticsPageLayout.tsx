import classNames from '@/shared/lib/helpers/classNames'
import { ReportActualStatusCard, ReportTableTermsBlock, ReportViewControls, Text } from '@/shared/ui'
import { ReactNode, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import type { ReportDocumentDto, TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import { resolveBacktestDiagnosticsDescription } from '@/shared/utils/backtestDiagnosticsDescriptions'
import {
    filterPolicyBranchMegaSectionsByBucketOrThrow,
    filterPolicyBranchMegaSectionsByMetricOrThrow,
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
import { applyReportTpSlModeToSectionsOrThrow } from '@/shared/utils/reportTpSlMode'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { buildReportTermsFromSectionsOrThrow, type ReportTermItem } from '@/shared/utils/reportTerms'
import cls from './BacktestDiagnosticsPageLayout.module.scss'

interface BacktestDiagnosticsPageLayoutProps {
    report: ReportDocumentDto
    sections: TableSectionDto[]
    pageTitle: string
    pageSubtitle: string
    emptyMessage: string
    className?: string
    renderColumnTitle?: (title: string, colIdx: number) => ReactNode
}

function normalizeReportTitle(title: string | undefined): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}

function sectionDomId(index: number): string {
    return `diag-section-${index + 1}`
}

export default function BacktestDiagnosticsPageLayout({
    report,
    sections,
    pageTitle,
    pageSubtitle,
    emptyMessage,
    className,
    renderColumnTitle
}: BacktestDiagnosticsPageLayoutProps) {
    const [searchParams, setSearchParams] = useSearchParams()

    const rootClassName = classNames(cls.root, {}, [className ?? ''])
    const viewCapabilities = useMemo(() => resolveReportViewCapabilities(sections), [sections])

    const generatedAtState = useMemo(() => {
        if (!report.generatedAtUtc) {
            return {
                value: null as Date | null,
                error: new Error('[diagnostics-layout] generatedAtUtc is missing.')
            }
        }

        const parsed = new Date(report.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null as Date | null,
                error: new Error(`[diagnostics-layout] generatedAtUtc is invalid: ${report.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null as Error | null }
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

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(searchParams.get('bucket'), DEFAULT_REPORT_BUCKET_MODE)
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse diagnostics bucket query.')
            return { value: DEFAULT_REPORT_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(searchParams.get('metric'), DEFAULT_REPORT_METRIC_MODE)
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse diagnostics metric query.')
            return { value: DEFAULT_REPORT_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_REPORT_TP_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse diagnostics tpsl query.')
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
                'backtest-diagnostics'
            )

            return { error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to validate diagnostics view state.')
            return { error: safeError }
        }
    }, [bucketState.value, metricState.value, tpSlState.value, viewCapabilities])

    const filteredSectionsState = useMemo(() => {
        if (viewSelectionState.error) {
            return { sections: [] as TableSectionDto[], error: viewSelectionState.error }
        }

        try {
            let nextSections = sections

            if (viewCapabilities.supportsBucketFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByBucketOrThrow(nextSections, bucketState.value)
            }

            if (viewCapabilities.supportsMetricFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByMetricOrThrow(nextSections, metricState.value)
            }

            if (viewCapabilities.supportsTpSlFiltering) {
                nextSections = applyReportTpSlModeToSectionsOrThrow(
                    nextSections,
                    tpSlState.value,
                    'backtest-diagnostics'
                )
            }

            return { sections: nextSections, error: null as Error | null }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to filter diagnostics sections by bucket/metric.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [bucketState.value, metricState.value, sections, tpSlState.value, viewCapabilities, viewSelectionState.error])

    const termsState = useMemo(() => {
        if (filteredSectionsState.sections.length === 0) {
            return {
                terms: [] as ReportTermItem[],
                error: null as Error | null
            }
        }

        try {
            return {
                terms: buildReportTermsFromSectionsOrThrow({
                    sections: filteredSectionsState.sections,
                    reportKind: report.kind,
                    contextTag: 'backtest-diagnostics',
                    resolveSectionTitle: section =>
                        normalizeReportTitle(section.title) || section.title || 'diagnostics-table'
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build diagnostics terms.')
            return {
                terms: [] as ReportTermItem[],
                error: safeError
            }
        }
    }, [filteredSectionsState.sections, report.kind])

    const pagerSections = useMemo(
        () =>
            filteredSectionsState.sections.map((section, index) => ({
                id: sectionDomId(index),
                anchor: sectionDomId(index),
                label: normalizeReportTitle(section.title) || section.title || `Секция ${index + 1}`
            })),
        [filteredSectionsState.sections]
    )

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pagerSections,
        syncHash: true
    })

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

    if (generatedAtState.error || !generatedAtState.value) {
        return (
            <PageError
                title='Diagnostics report has invalid generatedAtUtc'
                message='generatedAtUtc отсутствует или невалиден. Проверь сериализацию diagnostics отчёта.'
                error={generatedAtState.error ?? new Error('[diagnostics-layout] generatedAtUtc is invalid.')}
            />
        )
    }

    if (sourceEndpointState.error || !sourceEndpointState.value) {
        return (
            <PageError
                title='Diagnostics report source is invalid'
                message='API source endpoint is missing or invalid. Проверь VITE_API_BASE_URL / VITE_DEV_API_PROXY_TARGET.'
                error={
                    sourceEndpointState.error ??
                    new Error('[diagnostics-layout] report source endpoint is missing after validation.')
                }
            />
        )
    }

    if (bucketState.error) {
        return (
            <PageError
                title='Diagnostics bucket query is invalid'
                message='Query parameter \"bucket\" is invalid. Expected daily, intraday, delayed, or total.'
                error={bucketState.error}
            />
        )
    }

    if (metricState.error) {
        return (
            <PageError
                title='Diagnostics metric query is invalid'
                message='Query parameter \"metric\" is invalid. Expected real or no-biggest-liq-loss.'
                error={metricState.error}
            />
        )
    }

    if (tpSlState.error) {
        return (
            <PageError
                title='Diagnostics TP/SL query is invalid'
                message='Query parameter \"tpsl\" is invalid. Expected all, dynamic, or static.'
                error={tpSlState.error}
            />
        )
    }

    if (filteredSectionsState.error) {
        return (
            <PageError
                title='Diagnostics sections are missing'
                message='Report sections for the selected bucket/metric were not found or are tagged inconsistently.'
                error={filteredSectionsState.error}
            />
        )
    }

    if (termsState.error) {
        return (
            <PageError
                title='Diagnostics terms are invalid'
                message='Не удалось построить термины для diagnostics таблиц. Проверь колонки и словарь подсказок.'
                error={termsState.error}
            />
        )
    }

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div>
                    <Text type='h1'>{pageTitle}</Text>
                    <Text className={cls.subtitle}>{pageSubtitle}</Text>
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
                    statusMessage='Status endpoint для backtest_diagnostics не настроен: показываются metadata отчёта без freshness-проверки.'
                    dataSource={sourceEndpointState.value}
                    reportTitle={report.title}
                    reportId={report.id}
                    reportKind={report.kind}
                    generatedAtUtc={report.generatedAtUtc}
                />
            </header>

            {filteredSectionsState.sections.length === 0 ? (
                <Text>{emptyMessage}</Text>
            ) : (
                <>
                    <ReportTableTermsBlock
                        terms={termsState.terms}
                        title='Термины diagnostics'
                        subtitle='Подробные определения всех колонок, которые используются в текущем наборе diagnostics-таблиц.'
                        className={cls.termsBlock}
                    />

                    <div className={cls.tableGrid}>
                        {filteredSectionsState.sections.map((section, index) => (
                            <div key={`${section.title}-${index}`} className={cls.sectionBlock} id={sectionDomId(index)}>
                                <ReportTableCard
                                    title={normalizeReportTitle(section.title) || section.title || `Секция ${index + 1}`}
                                    description={resolveBacktestDiagnosticsDescription(section.title) ?? undefined}
                                    columns={section.columns ?? []}
                                    rows={section.rows ?? []}
                                    domId={`${sectionDomId(index)}-table`}
                                    renderColumnTitle={renderColumnTitle}
                                />
                            </div>
                        ))}
                    </div>

                    {pagerSections.length > 1 && (
                        <SectionPager
                            sections={pagerSections}
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
    )
}
