import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import type { TableSectionDto } from '@/shared/types/report.types'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { buildPfiTabsFromSections } from '@/shared/utils/pfiTabs'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import { ViewModeToggle, type ViewMode } from '@/shared/ui/ViewModeToggle/ui/ViewModeToggle'
import { SortableTable, type TableRow, getCellValue, toExportCell } from '@/shared/ui/SortableTable'
import cls from './PfiPage.module.scss'
import { usePfiPerModelReportQuery } from '@/shared/api/tanstackQueries/pfi'
import { ReportActualStatusCard, ReportTableTermsBlock, ReportViewControls, Text } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import { buildReportTermsFromSectionsOrThrow, type ReportTermItem } from '@/shared/utils/reportTerms'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
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
import { normalizeZeroLikeNumericText } from '@/shared/utils/numberFormat'
import type { PfiPageProps, PfiTableCardProps } from './types'
const BUSINESS_COLUMN_INDEXES = [0, 1, 2, 4, 7, 9]

function PfiTableCard({ section, domId }: PfiTableCardProps) {
    const [mode, setMode] = useState<ViewMode>('business')
    const [sortedRows, setSortedRows] = useState<TableRow[]>([])

    const columns: string[] = section.columns ?? []
    const normalizedRows = useMemo<TableRow[]>(
        () =>
            (section.rows ?? []).map(row =>
                Array.isArray(row)
                    ? row.map(cell => (typeof cell === 'string' ? normalizeZeroLikeNumericText(cell) : cell))
                    : row
            ),
        [section.rows]
    )

    const visibleColumnIndexes = useMemo<number[]>(() => {
        if (columns.length === 0) {
            return [] as number[]
        }

        if (mode === 'technical') {
            return columns.map((_value: string, idx: number) => idx)
        }

        return BUSINESS_COLUMN_INDEXES.filter(idx => idx < columns.length)
    }, [mode, columns])

    if (!section.columns || section.columns.length === 0) {
        return null
    }

    useEffect(() => {
        setSortedRows(normalizedRows)
    }, [normalizedRows])

    const exportColumns = visibleColumnIndexes.map((colIdx: number) => columns[colIdx] ?? `col_${colIdx}`)
    const rowsForExport: TableRow[] = sortedRows.length > 0 ? sortedRows : normalizedRows
    const exportRows = useMemo(
        () =>
            rowsForExport.map((row: TableRow) =>
                visibleColumnIndexes.map((colIdx: number) => toExportCell(getCellValue(row, colIdx)))
            ),
        [rowsForExport, visibleColumnIndexes]
    )

    const fileBaseName = section.title || domId
    const description = resolveReportSectionDescription('pfi_per_model', section.title)
    const renderColumnTitle = (title: string) =>
        renderTermTooltipTitle(title, resolveReportColumnTooltip('pfi_per_model', section.title, title))

    return (
        <section id={domId} className={cls.tableCard}>
            <header className={cls.cardHeader}>
                <div>
                    <Text type='h3' className={cls.cardTitle}>
                        {section.title}
                    </Text>
                    {description && <Text className={cls.cardSubtitle}>{description}</Text>}
                    <ViewModeToggle mode={mode} onChange={setMode} className={cls.modeToggle} />
                </div>

                <TableExportButton
                    columns={exportColumns}
                    rows={exportRows}
                    fileBaseName={fileBaseName}
                    defaultFormat='pdf'
                />
            </header>

            <SortableTable
                columns={columns}
                rows={normalizedRows}
                visibleColumnIndexes={visibleColumnIndexes}
                storageKey={`pfi.sort.${domId}`}
                onSortedRowsChange={setSortedRows}
                renderColumnTitle={renderColumnTitle}
            />
        </section>
    )
}

export default function PfiPage({ className }: PfiPageProps) {
    const { data, isError, error, refetch } = usePfiPerModelReportQuery()
    const [searchParams, setSearchParams] = useSearchParams()

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                (section): section is TableSectionDto =>
                    Array.isArray((section as TableSectionDto).columns) &&
                    (section as TableSectionDto).columns!.length > 0
            ),
        [data]
    )
    const viewCapabilities = useMemo(() => resolveReportViewCapabilities(tableSections), [tableSections])

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(searchParams.get('bucket'), DEFAULT_REPORT_BUCKET_MODE)
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse pfi bucket query.')
            return { value: DEFAULT_REPORT_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(searchParams.get('metric'), DEFAULT_REPORT_METRIC_MODE)
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse pfi metric query.')
            return { value: DEFAULT_REPORT_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_REPORT_TP_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse pfi tpsl query.')
            return { value: DEFAULT_REPORT_TP_SL_MODE, error: safeError }
        }
    }, [searchParams])

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

    const viewSelectionState = useMemo(() => {
        try {
            validateReportViewSelectionOrThrow(
                {
                    bucket: bucketState.value,
                    metric: metricState.value,
                    tpSl: tpSlState.value
                },
                viewCapabilities,
                'pfi'
            )
            return { error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to validate pfi view state.')
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
            const safeError = err instanceof Error ? err : new Error('Failed to filter pfi sections by bucket/metric.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [bucketState.value, metricState.value, tableSections, tpSlState.value, viewCapabilities, viewSelectionState.error])

    const termsState = useMemo(() => {
        try {
            return {
                terms: buildReportTermsFromSectionsOrThrow({
                    sections: filteredTableSectionsState.sections,
                    reportKind: 'pfi_per_model',
                    contextTag: 'pfi'
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build PFI terms.')
            return {
                terms: [] as ReportTermItem[],
                error: safeError
            }
        }
    }, [filteredTableSectionsState.sections])

    const tabs = useMemo(() => buildPfiTabsFromSections(filteredTableSectionsState.sections), [filteredTableSectionsState.sections])

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
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

    const rootClassName = classNames(cls.PfiPage, {}, [className ?? ''])

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить PFI отчёт'>
            {data && (
                <div className={rootClassName}>
                    {sourceEndpointState.error || !sourceEndpointState.value ? (
                        <PageError
                            title='PFI report source is invalid'
                            message='API source endpoint is missing or invalid. Проверь VITE_API_BASE_URL / VITE_DEV_API_PROXY_TARGET.'
                            error={
                                sourceEndpointState.error ??
                                new Error('[pfi] report source endpoint is missing after validation.')
                            }
                            onRetry={refetch}
                        />
                    ) : bucketState.error ? (
                        <PageError
                            title='PFI bucket query is invalid'
                            message='Query parameter \"bucket\" is invalid. Expected daily, intraday, delayed, or total.'
                            error={bucketState.error}
                            onRetry={refetch}
                        />
                    ) : metricState.error ? (
                        <PageError
                            title='PFI metric query is invalid'
                            message='Query parameter \"metric\" is invalid. Expected real or no-biggest-liq-loss.'
                            error={metricState.error}
                            onRetry={refetch}
                        />
                    ) : tpSlState.error ? (
                        <PageError
                            title='PFI TP/SL query is invalid'
                            message='Query parameter \"tpsl\" is invalid. Expected all, dynamic, or static.'
                            error={tpSlState.error}
                            onRetry={refetch}
                        />
                    ) : viewSelectionState.error ? (
                        <PageError
                            title='PFI view mode is unsupported for this report'
                            message='Выбранный bucket/metric/tpsl режим не поддерживается структурой текущего отчёта.'
                            error={viewSelectionState.error}
                            onRetry={refetch}
                        />
                    ) : filteredTableSectionsState.error ? (
                        <PageError
                            title='PFI sections are missing'
                            message='Report sections for the selected bucket/metric were not found or are tagged inconsistently.'
                            error={filteredTableSectionsState.error}
                            onRetry={refetch}
                        />
                    ) : termsState.error ? (
                        <PageError
                            title='PFI terms are invalid'
                            message='Не удалось построить термины для таблиц PFI. Проверь колонки и словарь подсказок.'
                            error={termsState.error}
                            onRetry={refetch}
                        />
                    ) : (
                        <>
                            <header className={cls.headerRow}>
                                <div>
                                    <Text type='h2'>{data.title || 'PFI по моделям'}</Text>
                                    <Text className={cls.subtitle}>
                                        Отчёт по важности признаков (Permutation Feature Importance) для всех бинарных
                                        моделей (move / dir / micro / SL и т.п.). Чем выше ΔAUC, тем сильнее признак
                                        влияет на качество, а знаки ΔMean/корреляций помогают понять направление
                                        влияния.
                                    </Text>
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
                                    statusMessage='Status endpoint для pfi_per_model не настроен: показываются metadata отчёта без freshness-проверки.'
                                    dataSource={sourceEndpointState.value}
                                    reportTitle={data.title}
                                    reportId={data.id}
                                    reportKind={data.kind}
                                    generatedAtUtc={data.generatedAtUtc}
                                />
                            </header>

                            {filteredTableSectionsState.sections.length === 0 ? (
                                <div>
                                    <Text type='h2'>PFI отчёт пустой</Text>
                                    <Text>
                                    Бэкенд вернул отчёт без табличных секций. Имеет смысл проверить конфигурацию
                                    генерации PFI или данные в базе.
                                </Text>
                            </div>
                        ) : (
                            <>
                                <ReportTableTermsBlock
                                    terms={termsState.terms}
                                    title='Термины отчёта PFI'
                                    subtitle='Подробные определения показателей важности признаков и сопутствующих статистик для всех таблиц на этой странице.'
                                    className={cls.pageTermsBlock}
                                />

                                <div className={cls.tablesGrid}>
                                    {filteredTableSectionsState.sections.map((section, index) => {
                                        const tab = tabs[index]
                                            const domId = tab?.anchor ?? `pfi-model-${index + 1}`

                                            return (
                                                <PfiTableCard
                                                    key={section.title ?? domId}
                                                    section={section}
                                                    domId={domId}
                                                />
                                            )
                                        })}
                                    </div>

                                    {tabs.length > 1 && (
                                        <SectionPager
                                            sections={tabs}
                                            currentIndex={currentIndex}
                                            canPrev={canPrev}
                                            canNext={canNext}
                                            onPrev={handlePrev}
                                            onNext={handleNext}
                                        />
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </PageDataBoundary>
    )
}
