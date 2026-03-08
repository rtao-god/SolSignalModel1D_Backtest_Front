import classNames from '@/shared/lib/helpers/classNames'
import {
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    Text,
    buildMegaTpSlControlGroup,
    buildMegaZonalControlGroup
} from '@/shared/ui'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import type { ReportDocumentDto, TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import { resolveBacktestDiagnosticsDescription } from '@/shared/utils/backtestDiagnosticsDescriptions'
import {
    resolvePolicyBranchMegaTpSlModeFromQuery,
    resolvePolicyBranchMegaZonalModeFromQuery
} from '@/shared/utils/policyBranchMegaTabs'
import { DEFAULT_REPORT_TP_SL_MODE, DEFAULT_REPORT_ZONAL_MODE } from '@/shared/utils/reportViewCapabilities'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { buildReportTermsFromSectionsOrThrow, type ReportTermItem } from '@/shared/utils/reportTerms'
import { useTranslation } from 'react-i18next'
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
    return title
        .replace(/^=+\s*/, '')
        .replace(/\s*=+$/, '')
        .trim()
}

function sectionDomId(index: number): string {
    return `diag-section-${index + 1}`
}

function isVariantDiagnosticsSection(section: TableSectionDto): boolean {
    return Boolean(section.metadata?.tpSlMode && section.metadata?.zonalMode)
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
    const { t } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

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

    const tpSlState = useMemo(() => {
        try {
            return {
                value: resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_REPORT_TP_SL_MODE),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse diagnostics tpsl query.')
            return {
                value: DEFAULT_REPORT_TP_SL_MODE,
                error: safeError
            }
        }
    }, [searchParams])

    const zonalState = useMemo(() => {
        try {
            return {
                value: resolvePolicyBranchMegaZonalModeFromQuery(searchParams.get('zonal'), DEFAULT_REPORT_ZONAL_MODE),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse diagnostics zonal query.')
            return {
                value: DEFAULT_REPORT_ZONAL_MODE,
                error: safeError
            }
        }
    }, [searchParams])

    const sharedSections = useMemo(
        () => sections.filter(section => !isVariantDiagnosticsSection(section)),
        [sections]
    )
    const variantSections = useMemo(
        () => sections.filter(isVariantDiagnosticsSection),
        [sections]
    )
    const sectionsForView = useMemo(() => [...variantSections, ...sharedSections], [sharedSections, variantSections])

    const termsState = useMemo(() => {
        if (sectionsForView.length === 0) {
            return {
                terms: [] as ReportTermItem[],
                error: null as Error | null
            }
        }

        try {
            return {
                terms: buildReportTermsFromSectionsOrThrow({
                    sections: sectionsForView,
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
    }, [report.kind, sectionsForView])

    const pagerSections = useMemo(
        () =>
            sectionsForView.map((section, index) => ({
                id: sectionDomId(index),
                anchor: sectionDomId(index),
                label:
                    normalizeReportTitle(section.title) ||
                    section.title ||
                    t('diagnosticsReport.layout.sectionFallback', { index: index + 1 })
            })),
        [sectionsForView, t]
    )

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pagerSections,
        syncHash: true
    })

    const controlGroups = useMemo(() => {
        if (variantSections.length === 0) {
            return []
        }

        return [
            buildMegaTpSlControlGroup({
                value: tpSlState.value,
                onChange: next => {
                    if (next === tpSlState.value) return
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('tpsl', next)
                    setSearchParams(nextParams, { replace: true })
                }
            }),
            buildMegaZonalControlGroup({
                value: zonalState.value,
                onChange: next => {
                    if (next === zonalState.value) return
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('zonal', next)
                    setSearchParams(nextParams, { replace: true })
                }
            })
        ]
    }, [searchParams, setSearchParams, tpSlState.value, variantSections.length, zonalState.value])

    if (generatedAtState.error || !generatedAtState.value) {
        return (
            <PageError
                title={t('diagnosticsReport.layout.errors.generatedAt.title')}
                message={t('diagnosticsReport.layout.errors.generatedAt.message')}
                error={generatedAtState.error ?? new Error('[diagnostics-layout] generatedAtUtc is invalid.')}
            />
        )
    }

    if (sourceEndpointState.error || !sourceEndpointState.value) {
        return (
            <PageError
                title={t('diagnosticsReport.layout.errors.sourceEndpoint.title')}
                message={t('diagnosticsReport.layout.errors.sourceEndpoint.message')}
                error={
                    sourceEndpointState.error ??
                    new Error('[diagnostics-layout] report source endpoint is missing after validation.')
                }
            />
        )
    }

    if (tpSlState.error) {
        return (
            <PageError
                title={t('diagnosticsReport.layout.errors.tpSlQuery.title')}
                message={t('diagnosticsReport.layout.errors.tpSlQuery.message')}
                error={tpSlState.error}
            />
        )
    }

    if (zonalState.error) {
        return (
            <PageError
                title={t('diagnosticsReport.layout.errors.zonalQuery.title')}
                message={t('diagnosticsReport.layout.errors.zonalQuery.message')}
                error={zonalState.error}
            />
        )
    }

    if (termsState.error) {
        return (
            <PageError
                title={t('diagnosticsReport.layout.errors.terms.title')}
                message={t('diagnosticsReport.layout.errors.terms.message')}
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
                    <ReportViewControls groups={controlGroups} />
                </div>

                <ReportActualStatusCard
                    statusMode='debug'
                    statusTitle={t('diagnosticsReport.layout.status.title')}
                    statusMessage={t('diagnosticsReport.layout.status.message')}
                    dataSource={sourceEndpointState.value}
                    reportTitle={report.title}
                    reportId={report.id}
                    reportKind={report.kind}
                    generatedAtUtc={report.generatedAtUtc}
                />
            </header>

            {sectionsForView.length === 0 ?
                <Text>{emptyMessage}</Text>
            :   <>
                    <ReportTableTermsBlock
                        terms={termsState.terms}
                        title={t('diagnosticsReport.layout.terms.title')}
                        subtitle={t('diagnosticsReport.layout.terms.subtitle')}
                        className={cls.termsBlock}
                    />

                    {variantSections.length > 0 && (
                        <div className={cls.tableGrid}>
                            {variantSections.map((section, index) => (
                                <div
                                    key={`${section.title}-${index}`}
                                    className={cls.sectionBlock}
                                    id={sectionDomId(index)}>
                                    <ReportTableCard
                                        title={
                                            normalizeReportTitle(section.title) ||
                                            section.title ||
                                            t('diagnosticsReport.layout.sectionFallback', { index: index + 1 })
                                        }
                                        description={resolveBacktestDiagnosticsDescription(section.title) ?? undefined}
                                        columns={section.columns ?? []}
                                        rows={section.rows ?? []}
                                        domId={`${sectionDomId(index)}-table`}
                                        renderColumnTitle={renderColumnTitle}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {sharedSections.length > 0 && (
                        <section className={cls.sharedBlock}>
                            <Text type='h3' className={cls.sharedTitle}>
                                Общие таблицы
                            </Text>
                            <Text className={cls.sharedSubtitle}>
                                Эти секции не зависят от выбранного режима tp/sl и zonal risk.
                            </Text>

                            <div className={cls.tableGrid}>
                                {sharedSections.map((section, index) => {
                                    const domIndex = variantSections.length + index

                                    return (
                                        <div
                                            key={`${section.title}-${domIndex}`}
                                            className={cls.sectionBlock}
                                            id={sectionDomId(domIndex)}>
                                            <ReportTableCard
                                                title={
                                                    normalizeReportTitle(section.title) ||
                                                    section.title ||
                                                    t('diagnosticsReport.layout.sectionFallback', {
                                                        index: domIndex + 1
                                                    })
                                                }
                                                description={
                                                    resolveBacktestDiagnosticsDescription(section.title) ?? undefined
                                                }
                                                columns={section.columns ?? []}
                                                rows={section.rows ?? []}
                                                domId={`${sectionDomId(domIndex)}-table`}
                                                renderColumnTitle={renderColumnTitle}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )}

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
            }
        </div>
    )
}
