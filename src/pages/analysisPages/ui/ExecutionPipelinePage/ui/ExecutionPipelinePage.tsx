import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { ReportActualStatusCard, Text } from '@/shared/ui'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { useBacktestExecutionPipelineReportQuery } from '@/shared/api/tanstackQueries/backtestExecutionPipeline'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { localizeReportSectionTitle } from '@/shared/utils/reportPresentationLocalization'
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

export default function ExecutionPipelinePage({ className }: ExecutionPipelinePageProps) {
    const { t, i18n } = useTranslation('reports')
    const { data, isLoading, isError, error, refetch } = useBacktestExecutionPipelineReportQuery()
    const reportUiLanguage = i18n.resolvedLanguage ?? i18n.language

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

    const reportStateError = error ?? generatedAtState.error ?? sourceEndpointState.error ?? null
    const hasReadyReport = Boolean(data && generatedAtState.value && sourceEndpointState.value)

    return (
        <div className={rootClassName}>
            <header className={cls.hero}>
                <div>
                    <Text type='h1' className={cls.heroTitle}>
                        {t('executionPipeline.page.title')}
                    </Text>
                    <Text className={cls.heroSubtitle}>{t('executionPipeline.page.subtitle')}</Text>
                </div>

                {hasReadyReport && data && sourceEndpointState.value && (
                    <ReportActualStatusCard
                        statusMode='debug'
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
                isLoading={isLoading}
                isError={Boolean(isError || reportStateError)}
                error={reportStateError}
                hasData={hasReadyReport}
                onRetry={refetch}
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
                        onRetry={refetch}
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
                                            return (
                                                <article
                                                    key={`${sectionTitle}-${sectionIndex}`}
                                                    className={cls.keyValueCard}>
                                                    <Text type='h3' className={cls.keyValueTitle}>
                                                        {sectionTitle}
                                                    </Text>
                                                    <dl className={cls.keyValueGrid}>
                                                        {(section.items ?? []).map(item => (
                                                            <div key={item.key} className={cls.keyValueRow}>
                                                                <dt className={cls.keyValueKey}>{item.key}</dt>
                                                                <dd className={cls.keyValueValue}>{item.value}</dd>
                                                            </div>
                                                        ))}
                                                    </dl>
                                                </article>
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
                                            <ReportTableCard
                                                key={`${title}-${sectionIndex}`}
                                                title={title}
                                                description={resolveSectionDescription(rawTitle, (key, options) =>
                                                    t(key, options)
                                                )}
                                                columns={section.columns ?? []}
                                                rows={section.rows ?? []}
                                                domId={`execution-pipeline-${sectionIndex + 1}-${domIdBase}`}
                                            />
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
