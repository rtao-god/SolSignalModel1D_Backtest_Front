import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
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
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { useBacktestExecutionPipelineReportQuery } from '@/shared/api/tanstackQueries/backtestExecutionPipeline'
import {
    buildPublishedReportVariantCompatibleOptions,
    usePublishedReportVariantCatalogQuery,
    PUBLISHED_REPORT_VARIANT_FAMILIES
} from '@/shared/api/tanstackQueries/reportVariants'
import {
    buildBacktestDiagnosticsQueryArgs,
    DEFAULT_BACKTEST_DIAGNOSTICS_SELECTION,
    resolveBacktestDiagnosticsSearchSelection
} from '@/shared/utils/backtestDiagnosticsQuery'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { localizeReportSectionTitle } from '@/shared/utils/reportPresentationLocalization'
import { resolveReportColumnTooltip, resolveReportKeyTooltip } from '@/shared/utils/reportTooltips'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { buildReportTermsFromReferences } from '@/shared/utils/reportTerms'
import cls from './ExecutionPipelinePage.module.scss'
import type { ExecutionPipelinePageProps } from './types'

const SECTION_DESCRIPTION_KEYS: Record<string, string> = {
    'Model Level': 'executionPipeline.page.sectionDescriptions.modelLevel',
    'Decision Level': 'executionPipeline.page.sectionDescriptions.decisionLevel',
    'Execution Level': 'executionPipeline.page.sectionDescriptions.executionLevel',
    'Accounting Level': 'executionPipeline.page.sectionDescriptions.accountingLevel',
    'Aggregation Level': 'executionPipeline.page.sectionDescriptions.aggregationLevel'
}

interface ParsedPipelineSections {
    keyValueSections: KeyValueSectionDto[]
    tableSections: TableSectionDto[]
}

interface ExecutionPipelineKeyReference {
    key: string
    sectionTitle: string
}

function normalizeTitle(title: string | undefined): string {
    if (!title) return ''
    return title
        .replace(/^=+\s*/, '')
        .replace(/\s*=+$/, '')
        .trim()
}

function toDomSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

function isTableSection(section: ReportSectionDto): section is TableSectionDto {
    const typed = section as TableSectionDto
    return Array.isArray(typed.columns) && Array.isArray(typed.rows)
}

function parseSections(sections: ReportSectionDto[]): ParsedPipelineSections {
    if (!Array.isArray(sections)) {
        throw new Error('[execution-pipeline] report.sections must be an array.')
    }

    const keyValueSections: KeyValueSectionDto[] = []
    const tableSections: TableSectionDto[] = []

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex]
        if (!section || typeof section !== 'object') {
            throw new Error(`[execution-pipeline] section is invalid. index=${sectionIndex}.`)
        }

        if (isKeyValueSection(section)) {
            const items = section.items ?? []
            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                const item = items[itemIndex]
                if (!item || !item.key || item.value == null) {
                    throw new Error(
                        `[execution-pipeline] key-value item is invalid. section=${sectionIndex}, item=${itemIndex}.`
                    )
                }
            }

            keyValueSections.push(section)
            continue
        }

        if (isTableSection(section)) {
            const columns = section.columns ?? []
            const rows = section.rows ?? []

            if (columns.length === 0) {
                throw new Error(`[execution-pipeline] table columns are empty. section=${sectionIndex}.`)
            }

            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex] ?? []
                if (!Array.isArray(row)) {
                    throw new Error(
                        `[execution-pipeline] table row is not an array. section=${sectionIndex}, row=${rowIndex}.`
                    )
                }
            }

            tableSections.push(section)
            continue
        }

        throw new Error(`[execution-pipeline] unsupported section format. section=${sectionIndex}.`)
    }

    if (tableSections.length === 0) {
        throw new Error('[execution-pipeline] report does not contain table sections.')
    }

    return { keyValueSections, tableSections }
}

function resolveSectionDescription(
    title: string,
    translate: (key: string, options?: Record<string, unknown>) => string
): string | undefined {
    const key = SECTION_DESCRIPTION_KEYS[title]
    if (!key) {
        return undefined
    }

    return translate(key)
}

function resolveExecutionPipelineTermsTitle(locale: 'ru' | 'en'): string {
    return locale === 'ru' ? 'Термины секции' : 'Section terms'
}

function resolveExecutionPipelineTermsSubtitle(locale: 'ru' | 'en'): string {
    return locale === 'ru' ?
            'Краткие определения терминов, которые используются в блоке ниже.'
        :   'Short definitions of the terms used in the block below.'
}

function buildExecutionPipelineKeyTerms(reportKind: string, sectionTitle: string, keys: string[], locale: 'ru' | 'en') {
    const references = keys
        .map(key => ({
            key,
            sectionTitle,
            tooltip: resolveReportKeyTooltip(reportKind, sectionTitle, key, locale)
        }))
        .filter(reference => Boolean(reference.tooltip && reference.tooltip.trim().length > 0))

    return buildReportTermsFromReferences<ExecutionPipelineKeyReference>({
        references: references.map(reference => ({ key: reference.key, sectionTitle: reference.sectionTitle })),
        contextTag: 'execution-pipeline-key-terms',
        resolveDescription: reference => {
            const tooltip = resolveReportKeyTooltip(reportKind, reference.sectionTitle, reference.key, locale)
            if (!tooltip || tooltip.trim().length === 0) {
                throw new Error(
                    `[execution-pipeline] key tooltip is missing. section=${reference.sectionTitle}, key=${reference.key}.`
                )
            }

            return tooltip
        },
        resolveTooltip: reference => {
            const tooltip = resolveReportKeyTooltip(reportKind, reference.sectionTitle, reference.key, locale)
            if (!tooltip || tooltip.trim().length === 0) {
                throw new Error(
                    `[execution-pipeline] key tooltip is missing. section=${reference.sectionTitle}, key=${reference.key}.`
                )
            }

            return tooltip
        }
    })
}

export default function ExecutionPipelinePage({ className }: ExecutionPipelinePageProps) {
    const { t, i18n } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()
    const variantCatalogQuery = usePublishedReportVariantCatalogQuery(
        PUBLISHED_REPORT_VARIANT_FAMILIES.backtestExecutionPipeline
    )

    const sliceSelectionState = useMemo(() => {
        if (!variantCatalogQuery.data) {
            return {
                value: null,
                error: null as Error | null
            }
        }

        try {
            return {
                value: resolveBacktestDiagnosticsSearchSelection(searchParams, variantCatalogQuery.data),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse execution pipeline query.')
            return {
                value: null,
                error: safeError
            }
        }
    }, [searchParams, variantCatalogQuery.data])
    const effectiveSliceSelection = sliceSelectionState.value ?? DEFAULT_BACKTEST_DIAGNOSTICS_SELECTION
    const sliceQueryArgs = useMemo(
        () => (sliceSelectionState.value ? buildBacktestDiagnosticsQueryArgs(sliceSelectionState.value) : undefined),
        [sliceSelectionState.value]
    )
    const pipelineVariantSelection = useMemo(
        () =>
            sliceSelectionState.value ?
                {
                    bucket: sliceSelectionState.value.bucket,
                    tpsl: sliceSelectionState.value.tpSlMode,
                    slmode: sliceSelectionState.value.slMode,
                    zonal: sliceSelectionState.value.zonalMode
                }
            :   null,
        [sliceSelectionState.value]
    )
    const controlGroups = useMemo(
        () => {
            if (!variantCatalogQuery.data || !pipelineVariantSelection) {
                return []
            }

            const compatibleBuckets = buildPublishedReportVariantCompatibleOptions(
                variantCatalogQuery.data,
                pipelineVariantSelection,
                'bucket'
            ).map(option => option.value)
            const compatibleTpSlModes = buildPublishedReportVariantCompatibleOptions(
                variantCatalogQuery.data,
                pipelineVariantSelection,
                'tpsl'
            ).map(option => option.value)
            const compatibleSlModes = buildPublishedReportVariantCompatibleOptions(
                variantCatalogQuery.data,
                pipelineVariantSelection,
                'slmode'
            ).map(option => option.value)
            const compatibleZonalModes = buildPublishedReportVariantCompatibleOptions(
                variantCatalogQuery.data,
                pipelineVariantSelection,
                'zonal'
            ).map(option => option.value)

            const tpSlGroup = buildMegaTpSlControlGroup({
                value: effectiveSliceSelection.tpSlMode,
                onChange: next => {
                    if (next === effectiveSliceSelection.tpSlMode) return
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('tpsl', next)
                    setSearchParams(nextParams, { replace: true })
                }
            })
            tpSlGroup.options = tpSlGroup.options.filter(option => compatibleTpSlModes.includes(option.value))

            const slModeGroup = buildMegaSlModeControlGroup({
                value: effectiveSliceSelection.slMode,
                onChange: next => {
                    if (next === effectiveSliceSelection.slMode) return
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('slmode', next)
                    setSearchParams(nextParams, { replace: true })
                }
            })
            slModeGroup.options = slModeGroup.options.filter(option => compatibleSlModes.includes(option.value))

            const bucketGroup = buildPredictionPolicyBucketControlGroup({
                value: effectiveSliceSelection.bucket,
                onChange: next => {
                    if (next === effectiveSliceSelection.bucket) return
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('bucket', next)
                    setSearchParams(nextParams, { replace: true })
                },
                label: 'Бакет сделок'
            })
            bucketGroup.options = bucketGroup.options.filter(option => compatibleBuckets.includes(option.value))

            const zonalGroup = buildMegaZonalControlGroup({
                value: effectiveSliceSelection.zonalMode,
                onChange: next => {
                    if (next === effectiveSliceSelection.zonalMode) return
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('zonal', next)
                    setSearchParams(nextParams, { replace: true })
                }
            })
            zonalGroup.options = zonalGroup.options.filter(option => compatibleZonalModes.includes(option.value))

            return [tpSlGroup, slModeGroup, bucketGroup, zonalGroup]
        },
        [effectiveSliceSelection, pipelineVariantSelection, searchParams, setSearchParams, variantCatalogQuery.data]
    )
    const { data, isLoading, isError, error, refetch } = useBacktestExecutionPipelineReportQuery(sliceQueryArgs, {
        enabled: Boolean(variantCatalogQuery.data) && !variantCatalogQuery.isError && !sliceSelectionState.error
    })
    const reportUiLanguage = i18n.resolvedLanguage ?? i18n.language
    const reportTooltipLocale = reportUiLanguage.toLowerCase().startsWith('ru') ? 'ru' : 'en'
    const termsBlockTitle = resolveExecutionPipelineTermsTitle(reportTooltipLocale)
    const termsBlockSubtitle = resolveExecutionPipelineTermsSubtitle(reportTooltipLocale)

    const generatedAtState = useMemo(() => {
        if (!data) return { value: null as Date | null, error: null as Error | null }
        if (!data.generatedAtUtc) {
            return { value: null, error: new Error('[execution-pipeline] generatedAtUtc is missing.') }
        }

        const parsed = new Date(data.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null,
                error: new Error(`[execution-pipeline] generatedAtUtc is invalid: ${data.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null }
    }, [data])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpoint(),
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

    const parsedSectionsState = useMemo(() => {
        if (!data) {
            return { value: null as ParsedPipelineSections | null, error: null as Error | null }
        }

        try {
            return {
                value: parseSections(data.sections),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to parse execution pipeline report sections.')
            return {
                value: null as ParsedPipelineSections | null,
                error: safeError
            }
        }
    }, [data])

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    const reportStateError =
        sliceSelectionState.error ??
        (variantCatalogQuery.isError ?
            (variantCatalogQuery.error ?? new Error('Failed to load execution pipeline catalog.'))
        :   null) ??
        error ??
        generatedAtState.error ??
        sourceEndpointState.error ??
        null
    const hasReadyReport = Boolean(data && generatedAtState.value && sourceEndpointState.value)
    // Execution pipeline собирает одни и те же термины из backend report-contract,
    // поэтому key-value и table headers должны читать shared glossary, а не локальные page aliases.
    const renderColumnTitle = useCallback(
        (title: string) =>
            renderTermTooltipTitle(
                title,
                resolveReportColumnTooltip(
                    data?.kind ?? 'backtest_execution_pipeline',
                    undefined,
                    title,
                    reportTooltipLocale
                )
            ),
        [data?.kind, reportTooltipLocale]
    )
    const handleRetry = useCallback(() => {
        void variantCatalogQuery.refetch()
        void refetch()
    }, [refetch, variantCatalogQuery])

    return (
        <div className={rootClassName}>
            <header className={cls.hero}>
                <div>
                    <Text type='h1' className={cls.heroTitle}>
                        {t('executionPipeline.page.title')}
                    </Text>
                    <Text className={cls.heroSubtitle}>{t('executionPipeline.page.subtitle')}</Text>
                    <ReportViewControls groups={controlGroups} className={cls.controls} />
                </div>

                {hasReadyReport && data && sourceEndpointState.value && (
                    <ReportActualStatusCard
                        statusMode='actual'
                        statusTitle={t('executionPipeline.page.status.title')}
                        statusMessage={t('executionPipeline.page.status.description')}
                        dataSource={sourceEndpointState.value}
                        reportTitle={data.title}
                        reportId={data.id}
                        reportKind={data.kind}
                        generatedAtUtc={data.generatedAtUtc}
                    />
                )}
            </header>

            <SectionDataState
                isLoading={variantCatalogQuery.isPending || isLoading}
                isError={Boolean(isError || reportStateError)}
                error={reportStateError}
                hasData={hasReadyReport}
                onRetry={handleRetry}
                title={
                    generatedAtState.error ? t('executionPipeline.page.errors.invalidGeneratedAt.title')
                    : sourceEndpointState.error ?
                        t('executionPipeline.page.errors.invalidSource.title')
                    :   t('executionPipeline.page.errorTitle')
                }
                description={
                    generatedAtState.error ? t('executionPipeline.page.errors.invalidGeneratedAt.description')
                    : sourceEndpointState.error ?
                        t('executionPipeline.page.errors.invalidSource.description')
                    :   undefined
                }
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{ source: 'execution-pipeline-page' }}>
                {data && (
                    <SectionDataState
                        isError={Boolean(parsedSectionsState.error)}
                        error={parsedSectionsState.error}
                        hasData={Boolean(parsedSectionsState.value)}
                        onRetry={handleRetry}
                        title={t('executionPipeline.page.errors.invalidSections.title')}
                        description={t('executionPipeline.page.errors.invalidSections.description')}
                        logContext={{ source: 'execution-pipeline-sections' }}>
                        {parsedSectionsState.value && (
                            <>
                                {parsedSectionsState.value.keyValueSections.length > 0 && (
                                    <section className={cls.keyValueSection}>
                                        {parsedSectionsState.value.keyValueSections.map((section, sectionIndex) => {
                                            const rawSectionTitle =
                                                normalizeTitle(section.title) ||
                                                t('executionPipeline.page.fallbacks.configTitle', {
                                                    index: sectionIndex + 1
                                                })
                                            const sectionTitle = localizeReportSectionTitle(
                                                data.kind,
                                                rawSectionTitle,
                                                reportUiLanguage
                                            )
                                            const sectionTerms = buildExecutionPipelineKeyTerms(
                                                data.kind,
                                                rawSectionTitle,
                                                (section.items ?? []).map(item => item.key),
                                                reportTooltipLocale
                                            )
                                            return (
                                                <div
                                                    key={`${sectionTitle}-${sectionIndex}`}
                                                    className={cls.keyValueBlock}>
                                                    {sectionTerms.length > 0 && (
                                                        <ReportTableTermsBlock
                                                            terms={sectionTerms}
                                                            enhanceDomainTerms
                                                            title={termsBlockTitle}
                                                            subtitle={termsBlockSubtitle}
                                                        />
                                                    )}
                                                    <article className={cls.keyValueCard}>
                                                        <Text type='h3' className={cls.keyValueTitle}>
                                                            {sectionTitle}
                                                        </Text>
                                                        <dl className={cls.keyValueGrid}>
                                                            {(section.items ?? []).map(item => (
                                                                <div key={item.key} className={cls.keyValueRow}>
                                                                    <dt className={cls.keyValueKey}>
                                                                        {renderTermTooltipTitle(
                                                                            item.key,
                                                                            resolveReportKeyTooltip(
                                                                                data.kind,
                                                                                rawSectionTitle,
                                                                                item.key,
                                                                                reportTooltipLocale
                                                                            )
                                                                        )}
                                                                    </dt>
                                                                    <dd className={cls.keyValueValue}>{item.value}</dd>
                                                                </div>
                                                            ))}
                                                        </dl>
                                                    </article>
                                                </div>
                                            )
                                        })}
                                    </section>
                                )}

                                <section className={cls.tablesSection}>
                                    {parsedSectionsState.value.tableSections.map((section, sectionIndex) => {
                                        const rawTitle =
                                            normalizeTitle(section.title) ||
                                            t('executionPipeline.page.fallbacks.tableTitle', {
                                                index: sectionIndex + 1
                                            })
                                        const title = localizeReportSectionTitle(data.kind, rawTitle, reportUiLanguage)
                                        const domIdBase =
                                            toDomSlug(rawTitle) || `execution-pipeline-${sectionIndex + 1}`
                                        return (
                                            <div key={`${title}-${sectionIndex}`} className={cls.tableBlock}>
                                                <ReportTableTermsBlock
                                                    reportKind={data.kind}
                                                    sectionTitle={rawTitle}
                                                    columns={section.columns ?? []}
                                                    enhanceDomainTerms
                                                    title={termsBlockTitle}
                                                    subtitle={termsBlockSubtitle}
                                                />
                                                <ReportTableCard
                                                    title={title}
                                                    description={resolveSectionDescription(rawTitle, (key, options) =>
                                                        t(key, options)
                                                    )}
                                                    columns={section.columns ?? []}
                                                    rows={section.rows ?? []}
                                                    rowEvaluations={section.rowEvaluations ?? []}
                                                    domId={`execution-pipeline-${sectionIndex + 1}-${domIdBase}`}
                                                    renderColumnTitle={renderColumnTitle}
                                                />
                                            </div>
                                        )
                                    })}
                                </section>
                            </>
                        )}
                    </SectionDataState>
                )}
            </SectionDataState>
        </div>
    )
}
