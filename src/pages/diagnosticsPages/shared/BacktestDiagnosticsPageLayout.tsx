import classNames from '@/shared/lib/helpers/classNames'
import {
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    Text,
    buildMegaSlModeControlGroup,
    buildMegaTpSlControlGroup,
    buildPredictionPolicyBucketControlGroup,
    buildMegaZonalControlGroup
} from '@/shared/ui'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import type { ReportDocumentDto, TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import { resolveBacktestDiagnosticsDescription } from '@/shared/utils/backtestDiagnosticsDescriptions'
import { resolveBacktestDiagnosticsSearchSelection } from '@/shared/utils/backtestDiagnosticsQuery'
import type { BacktestDiagnosticsControlAxis } from '@/shared/utils/backtestDiagnosticsPageAxes'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { buildReportTermsFromSections, type ReportTermItem } from '@/shared/utils/reportTerms'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { useTranslation } from 'react-i18next'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { localizeReportSectionCompactTitle } from '@/shared/utils/reportPresentationLocalization'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import {
    buildPublishedReportVariantCompatibleOptions,
    type PublishedReportVariantCatalogDto
} from '@/shared/api/tanstackQueries/reportVariants'
import cls from './BacktestDiagnosticsPageLayout.module.scss'

interface BacktestDiagnosticsPageLayoutProps {
    report: ReportDocumentDto | null
    sections: TableSectionDto[]
    pageTitle: string
    pageSubtitle: string
    emptyMessage: string
    errorTitle: string
    className?: string
    availableAxes?: readonly BacktestDiagnosticsControlAxis[]
    variantCatalog?: PublishedReportVariantCatalogDto | null
    isLoading?: boolean
    error?: unknown
    onRetry?: () => void
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
    return Boolean(
        section.metadata?.tpSlMode || section.metadata?.zonalMode || section.metadata?.mode || section.metadata?.bucket
    )
}

function hasDiagnosticsAxis(sections: TableSectionDto[], axis: 'tpSlMode' | 'zonalMode' | 'mode' | 'bucket'): boolean {
    return sections.some(section => {
        const value = section.metadata?.[axis]
        return typeof value === 'string' && value.trim().length > 0
    })
}

export default function BacktestDiagnosticsPageLayout({
    report,
    sections,
    pageTitle,
    pageSubtitle,
    emptyMessage,
    errorTitle,
    className,
    availableAxes,
    variantCatalog,
    isLoading,
    error,
    onRetry
}: BacktestDiagnosticsPageLayoutProps) {
    const { t, i18n } = useTranslation('reports')
    const reportUiLanguage = i18n.resolvedLanguage ?? i18n.language
    const [searchParams, setSearchParams] = useSearchParams()

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    const generatedAtState = useMemo(() => {
        if (!report) {
            return {
                value: null as Date | null,
                error: null as Error | null
            }
        }

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
    }, [report])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpoint(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve report source endpoint.', {
                source: 'diagnostics-layout-source-endpoint',
                domain: 'ui_section',
                owner: 'backtest-diagnostics-layout',
                expected: 'Diagnostics layout should resolve a non-empty report source endpoint.',
                requiredAction: 'Inspect API base URL configuration and report source endpoint resolver.'
            })
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const diagnosticsSelectionState = useMemo(() => {
        try {
            return {
                value: resolveBacktestDiagnosticsSearchSelection(searchParams, variantCatalog ?? undefined),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse diagnostics query.', {
                source: 'diagnostics-layout-query',
                domain: 'ui_section',
                owner: 'backtest-diagnostics-layout',
                expected: 'Diagnostics layout should parse a valid published diagnostics selection from URL params.',
                requiredAction: 'Inspect diagnostics query params and supported catalog values.'
            })
            return {
                value: null,
                error: safeError
            }
        }
    }, [searchParams, variantCatalog])

    const diagnosticsVariantSelection = useMemo(
        () =>
            diagnosticsSelectionState.value ?
                {
                    bucket: diagnosticsSelectionState.value.bucket,
                    tpsl: diagnosticsSelectionState.value.tpSlMode,
                    slmode: diagnosticsSelectionState.value.slMode,
                    zonal: diagnosticsSelectionState.value.zonalMode
                }
            :   null,
        [diagnosticsSelectionState.value]
    )

    const sharedSections = useMemo(() => sections.filter(section => !isVariantDiagnosticsSection(section)), [sections])
    const variantSections = useMemo(() => sections.filter(isVariantDiagnosticsSection), [sections])
    const sectionsForView = useMemo(() => [...variantSections, ...sharedSections], [sharedSections, variantSections])
    const effectiveAxisVisibility = useMemo(
        () => ({
            tpSlMode:
                availableAxes?.includes('tpSlMode') === true ||
                (variantCatalog && diagnosticsVariantSelection ?
                    buildPublishedReportVariantCompatibleOptions(
                        variantCatalog,
                        diagnosticsVariantSelection,
                        'tpsl'
                    ).length > 1
                :   hasDiagnosticsAxis(variantSections, 'tpSlMode')),
            mode:
                availableAxes?.includes('mode') === true ||
                (variantCatalog && diagnosticsVariantSelection ?
                    buildPublishedReportVariantCompatibleOptions(
                        variantCatalog,
                        diagnosticsVariantSelection,
                        'slmode'
                    ).length > 1
                :   hasDiagnosticsAxis(variantSections, 'mode')),
            bucket:
                availableAxes?.includes('bucket') === true ||
                (variantCatalog && diagnosticsVariantSelection ?
                    buildPublishedReportVariantCompatibleOptions(
                        variantCatalog,
                        diagnosticsVariantSelection,
                        'bucket'
                    ).length > 1
                :   hasDiagnosticsAxis(variantSections, 'bucket')),
            zonalMode:
                availableAxes?.includes('zonalMode') === true ||
                (variantCatalog && diagnosticsVariantSelection ?
                    buildPublishedReportVariantCompatibleOptions(
                        variantCatalog,
                        diagnosticsVariantSelection,
                        'zonal'
                    ).length > 1
                :   hasDiagnosticsAxis(variantSections, 'zonalMode'))
        }),
        [availableAxes, diagnosticsVariantSelection, variantCatalog, variantSections]
    )

    const termsState = useMemo(() => {
        if (!report || sectionsForView.length === 0) {
            return {
                terms: [] as ReportTermItem[],
                error: null as Error | null
            }
        }

        try {
            return {
                terms: buildReportTermsFromSections({
                    sections: sectionsForView,
                    reportKind: report.kind,
                    contextTag: 'backtest-diagnostics',
                    resolveSectionTitle: section =>
                        normalizeReportTitle(section.title) || section.title || 'diagnostics-table'
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to build diagnostics terms.', {
                source: 'diagnostics-layout-terms',
                domain: 'ui_section',
                owner: 'backtest-diagnostics-layout',
                expected: 'Diagnostics layout should build terms from diagnostics sections and shared glossary.',
                requiredAction: 'Inspect diagnostics sections and shared term resolver.'
            })
            return {
                terms: [] as ReportTermItem[],
                error: safeError
            }
        }
    }, [report, sectionsForView])

    const pagerSections = useMemo(
        () =>
            sectionsForView.map((section, index) => ({
                id: sectionDomId(index),
                anchor: sectionDomId(index),
                label: (() => {
                    const rawTitle =
                        normalizeReportTitle(section.title) ||
                        section.title ||
                        t('diagnosticsReport.layout.sectionFallback', { index: index + 1 })

                    return localizeReportSectionCompactTitle(report?.kind, rawTitle, reportUiLanguage)
                })()
            })),
        [report?.kind, reportUiLanguage, sectionsForView, t]
    )

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pagerSections,
        syncHash: true
    })

    const controlGroups = useMemo(() => {
        if (!diagnosticsSelectionState.value || sectionsForView.length === 0) {
            return []
        }

        const controlGroups = []
        const compatibleBuckets =
            variantCatalog && diagnosticsVariantSelection ?
                buildPublishedReportVariantCompatibleOptions(variantCatalog, diagnosticsVariantSelection, 'bucket').map(
                    option => option.value
                )
            :   null
        const compatibleTpSlModes =
            variantCatalog && diagnosticsVariantSelection ?
                buildPublishedReportVariantCompatibleOptions(variantCatalog, diagnosticsVariantSelection, 'tpsl').map(
                    option => option.value
                )
            :   null
        const compatibleSlModes =
            variantCatalog && diagnosticsVariantSelection ?
                buildPublishedReportVariantCompatibleOptions(
                    variantCatalog,
                    diagnosticsVariantSelection,
                    'slmode'
                ).map(option => option.value)
            :   null
        const compatibleZonalModes =
            variantCatalog && diagnosticsVariantSelection ?
                buildPublishedReportVariantCompatibleOptions(
                    variantCatalog,
                    diagnosticsVariantSelection,
                    'zonal'
                ).map(option => option.value)
            :   null

        if (effectiveAxisVisibility.tpSlMode) {
            const group = buildMegaTpSlControlGroup({
                    value: diagnosticsSelectionState.value.tpSlMode,
                    onChange: next => {
                        if (next === diagnosticsSelectionState.value?.tpSlMode) return
                        const nextParams = new URLSearchParams(searchParams)
                        nextParams.set('tpsl', next)
                        setSearchParams(nextParams, { replace: true })
                    }
                })
            group.options =
                compatibleTpSlModes ?
                    group.options.filter(option => compatibleTpSlModes.includes(option.value))
                :   group.options
            controlGroups.push(group)
        }

        if (effectiveAxisVisibility.mode) {
            const group = buildMegaSlModeControlGroup({
                    value: diagnosticsSelectionState.value.slMode,
                    onChange: next => {
                        if (next === diagnosticsSelectionState.value?.slMode) return
                        const nextParams = new URLSearchParams(searchParams)
                        nextParams.set('slmode', next)
                        setSearchParams(nextParams, { replace: true })
                    }
                })
            group.options =
                compatibleSlModes ?
                    group.options.filter(option => compatibleSlModes.includes(option.value))
                :   group.options
            controlGroups.push(group)
        }

        if (effectiveAxisVisibility.bucket) {
            const group = buildPredictionPolicyBucketControlGroup({
                    value: diagnosticsSelectionState.value.bucket,
                    onChange: next => {
                        if (next === diagnosticsSelectionState.value?.bucket) return
                        const nextParams = new URLSearchParams(searchParams)
                        nextParams.set('bucket', next)
                        setSearchParams(nextParams, { replace: true })
                    },
                    label: 'Бакет сделок'
                })
            group.options =
                compatibleBuckets ?
                    group.options.filter(option => compatibleBuckets.includes(option.value))
                :   group.options
            controlGroups.push(group)
        }

        if (effectiveAxisVisibility.zonalMode) {
            const group = buildMegaZonalControlGroup({
                    value: diagnosticsSelectionState.value.zonalMode,
                    onChange: next => {
                        if (next === diagnosticsSelectionState.value?.zonalMode) return
                        const nextParams = new URLSearchParams(searchParams)
                        nextParams.set('zonal', next)
                        setSearchParams(nextParams, { replace: true })
                    }
                })
            group.options =
                compatibleZonalModes ?
                    group.options.filter(option => compatibleZonalModes.includes(option.value))
                :   group.options
            controlGroups.push(group)
        }

        return controlGroups
    }, [
        diagnosticsSelectionState.value,
        diagnosticsVariantSelection,
        effectiveAxisVisibility,
        searchParams,
        sectionsForView.length,
        setSearchParams,
        variantCatalog
    ])

    const reportStateError =
        (error as Error | null | undefined) ?? generatedAtState.error ?? sourceEndpointState.error ?? null
    const hasReadyReport = Boolean(report && generatedAtState.value && sourceEndpointState.value)

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>{pageTitle}</Text>
                    <Text className={cls.subtitle}>{pageSubtitle}</Text>
                    <ReportViewControls groups={controlGroups} />
                    {diagnosticsSelectionState.error && (
                        <SectionDataState
                            className={cls.headerState}
                            isError
                            error={diagnosticsSelectionState.error}
                            hasData={false}
                            title={t('diagnosticsReport.layout.errors.tpSlQuery.title')}
                            description={t('diagnosticsReport.layout.errors.tpSlQuery.message')}
                            logContext={{ source: 'diagnostics-layout-controls' }}>
                            {null}
                        </SectionDataState>
                    )}
                </div>

                {hasReadyReport && report && sourceEndpointState.value && (
                    <ReportActualStatusCard
                        statusMode='actual'
                        statusTitle={t('diagnosticsReport.layout.status.title')}
                        statusMessage={t('diagnosticsReport.layout.status.message')}
                        dataSource={sourceEndpointState.value}
                        reportTitle={report.title}
                        reportId={report.id}
                        reportKind={report.kind}
                        generatedAtUtc={report.generatedAtUtc}
                    />
                )}
            </header>

            <SectionDataState
                isLoading={isLoading}
                isError={Boolean(reportStateError)}
                error={reportStateError}
                hasData={hasReadyReport}
                onRetry={onRetry}
                title={
                    generatedAtState.error ? t('diagnosticsReport.layout.errors.generatedAt.title')
                    : sourceEndpointState.error ?
                        t('diagnosticsReport.layout.errors.sourceEndpoint.title')
                    :   errorTitle
                }
                description={
                    generatedAtState.error ? t('diagnosticsReport.layout.errors.generatedAt.message')
                    : sourceEndpointState.error ?
                        t('diagnosticsReport.layout.errors.sourceEndpoint.message')
                    :   undefined
                }
                loadingText={t('ui.pageDataBoundary.loading', {
                    ns: 'errors',
                    defaultValue: 'Loading data'
                })}
                logContext={{ source: 'diagnostics-layout-report' }}>
                {sectionsForView.length === 0 ?
                    <Text>{emptyMessage}</Text>
                :   <>
                        <SectionDataState
                            isError={Boolean(termsState.error)}
                            error={termsState.error}
                            hasData={!termsState.error}
                            title={t('diagnosticsReport.layout.errors.terms.title')}
                            description={t('diagnosticsReport.layout.errors.terms.message')}
                            onRetry={onRetry}
                            logContext={{ source: 'diagnostics-layout-terms' }}>
                            <ReportTableTermsBlock
                                terms={termsState.terms}
                                title={t('diagnosticsReport.layout.terms.title')}
                                subtitle={t('diagnosticsReport.layout.terms.subtitle')}
                                enhanceDomainTerms
                                className={cls.termsBlock}
                            />
                        </SectionDataState>

                        {variantSections.length > 0 && (
                            <div className={cls.tableGrid}>
                                {variantSections.map((section, index) => (
                                    <div
                                        key={`${section.title}-${index}`}
                                        className={cls.sectionBlock}
                                        id={sectionDomId(index)}>
                                        <ReportTableCard
                                            title={localizeReportSectionCompactTitle(
                                                report?.kind,
                                                normalizeReportTitle(section.title) ||
                                                    section.title ||
                                                    t('diagnosticsReport.layout.sectionFallback', {
                                                        index: index + 1
                                                    }),
                                                reportUiLanguage
                                            )}
                                            description={
                                                resolveBacktestDiagnosticsDescription(section.title) ?? undefined
                                            }
                                            columns={section.columns ?? []}
                                            rows={section.rows ?? []}
                                            rowEvaluations={section.rowEvaluations ?? []}
                                            domId={`${sectionDomId(index)}-table`}
                                            renderColumnTitle={title =>
                                                // Diagnostics-колонки вроде Mode/Year меняют смысл от семейства таблицы,
                                                // поэтому tooltip обязан получать section.title, а не только raw column title.
                                                renderTermTooltipTitle(
                                                    title,
                                                    resolveReportColumnTooltip(report?.kind, section.title, title)
                                                )
                                            }
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
                                    Эти таблицы остаются общими для всех выбранных фильтров диагностики.
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
                                                    title={localizeReportSectionCompactTitle(
                                                        report?.kind,
                                                        normalizeReportTitle(section.title) ||
                                                            section.title ||
                                                            t('diagnosticsReport.layout.sectionFallback', {
                                                                index: domIndex + 1
                                                            }),
                                                        reportUiLanguage
                                                    )}
                                                    description={
                                                        resolveBacktestDiagnosticsDescription(section.title) ??
                                                        undefined
                                                    }
                                                    columns={section.columns ?? []}
                                                    rows={section.rows ?? []}
                                                    rowEvaluations={section.rowEvaluations ?? []}
                                                    domId={`${sectionDomId(domIndex)}-table`}
                                                    renderColumnTitle={title =>
                                                        // Общие diagnostics-секции используют тот же section-aware tooltip-контракт,
                                                        // иначе glossary и header снова расходятся по смыслу.
                                                        renderTermTooltipTitle(
                                                            title,
                                                            resolveReportColumnTooltip(
                                                                report?.kind,
                                                                section.title,
                                                                title
                                                            )
                                                        )
                                                    }
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
            </SectionDataState>
        </div>
    )
}
