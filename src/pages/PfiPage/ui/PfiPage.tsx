import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import type { TableSectionDto } from '@/shared/types/report.types'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { buildPfiTabsFromSections } from '@/shared/utils/pfiTabs'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import { SortableTable, type TableRow, getCellValue, toExportCell } from '@/shared/ui/SortableTable'
import cls from './PfiPage.module.scss'
import { usePfiPerModelReportWithFreshnessQuery } from '@/shared/api/tanstackQueries/pfi'
import {
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    Text,
    buildBusinessTechnicalViewControlGroup,
    type BusinessTechnicalViewControlValue
} from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import { buildReportTermsFromSectionsOrThrow, type ReportTermItem } from '@/shared/utils/reportTerms'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import { normalizeZeroLikeNumericText } from '@/shared/utils/numberFormat'
import type { PfiPageProps, PfiTableCardProps } from './types'
import { useTranslation } from 'react-i18next'
const BUSINESS_COLUMN_INDEXES = [0, 1, 2, 4, 7, 9]

function PfiTableCard({ section, domId }: PfiTableCardProps) {
    const { t } = useTranslation(['reports', 'common'])
    const [mode, setMode] = useState<BusinessTechnicalViewControlValue>('business')
    const [sortedRows, setSortedRows] = useState<TableRow[]>([])
    const viewControlGroups = useMemo(
        () => [
            buildBusinessTechnicalViewControlGroup({
                value: mode,
                onChange: setMode,
                label: t('pfi.page.controls.viewModeLabel', { ns: 'reports' }),
                ariaLabel: t('pfi.page.controls.viewModeAriaLabel', { ns: 'reports' }),
                labels: {
                    business: t('viewMode.business', { ns: 'common' }),
                    technical: t('viewMode.technical', { ns: 'common' })
                }
            })
        ],
        [mode, t]
    )

    const columns: string[] = section.columns ?? []
    const normalizedRows = useMemo<TableRow[]>(
        () =>
            (section.rows ?? []).map(row =>
                Array.isArray(row) ?
                    row.map(cell => (typeof cell === 'string' ? normalizeZeroLikeNumericText(cell) : cell))
                :   row
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
                    <ReportViewControls groups={viewControlGroups} className={cls.modeControls} />
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
    const { t } = useTranslation('reports')
    const { data, isError, error, refetch } = usePfiPerModelReportWithFreshnessQuery()
    const report = data?.report ?? null
    const freshness = data?.freshness ?? null
    const reportTitle = report?.title || t('pfi.page.header.titleFallback')

    const tableSections = useMemo(
        () =>
            (report?.sections ?? []).filter(
                (section): section is TableSectionDto =>
                    Array.isArray((section as TableSectionDto).columns) &&
                    (section as TableSectionDto).columns!.length > 0
            ),
        [report]
    )

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

    const termsState = useMemo(() => {
        try {
            return {
                terms: buildReportTermsFromSectionsOrThrow({
                    sections: tableSections,
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
    }, [tableSections])

    const tabs = useMemo(() => buildPfiTabsFromSections(tableSections), [tableSections])

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
        syncHash: true
    })

    const rootClassName = classNames(cls.PfiPage, {}, [className ?? ''])

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(report)}
            onRetry={refetch}
            errorTitle={t('pfi.page.errorTitle')}>
            {report && (
                <div className={rootClassName}>
                    {sourceEndpointState.error || !sourceEndpointState.value ?
                        <PageError
                            title={t('pfi.page.errors.sourceEndpoint.title')}
                            message={t('pfi.page.errors.sourceEndpoint.message')}
                            error={
                                sourceEndpointState.error ??
                                new Error('[pfi] report source endpoint is missing after validation.')
                            }
                            onRetry={refetch}
                        />
                    : termsState.error ?
                        <PageError
                            title={t('pfi.page.errors.terms.title')}
                            message={t('pfi.page.errors.terms.message')}
                            error={termsState.error}
                            onRetry={refetch}
                        />
                    :   <>
                            <header className={cls.headerRow}>
                                <div>
                                    <Text type='h2'>{reportTitle}</Text>
                                    <Text className={cls.subtitle}>{t('pfi.page.header.subtitle')}</Text>
                                </div>
                                <ReportActualStatusCard
                                    statusMode={freshness?.sourceMode === 'actual' ? 'actual' : 'debug'}
                                    statusTitle={
                                        freshness?.sourceMode === 'actual' ?
                                            t('pfi.page.status.actualTitle')
                                        :   t('pfi.page.status.debugTitle')
                                    }
                                    statusMessage={freshness?.message ?? t('pfi.page.status.unavailableMessage')}
                                    dataSource={sourceEndpointState.value}
                                    reportTitle={reportTitle}
                                    reportId={report.id}
                                    reportKind={report.kind}
                                    generatedAtUtc={report.generatedAtUtc}
                                    statusLines={[
                                        ...(freshness?.canonicalSnapshotCount !== null &&
                                        freshness?.canonicalSnapshotCount !== undefined ?
                                            [
                                                {
                                                    label: t('pfi.page.statusLines.canonicalSnapshotCount'),
                                                    value: String(freshness.canonicalSnapshotCount)
                                                }
                                            ]
                                        :   []),
                                        ...(freshness?.tableSectionCount !== null &&
                                        freshness?.tableSectionCount !== undefined ?
                                            [
                                                {
                                                    label: t('pfi.page.statusLines.tableSectionCount'),
                                                    value: String(freshness.tableSectionCount)
                                                }
                                            ]
                                        :   [])
                                    ]}
                                />
                            </header>

                            {tableSections.length === 0 ?
                                <div>
                                    <Text type='h2'>{t('pfi.page.empty.title')}</Text>
                                    <Text>{t('pfi.page.empty.description')}</Text>
                                </div>
                            :   <>
                                    <ReportTableTermsBlock
                                        terms={termsState.terms}
                                        title={t('pfi.page.terms.title')}
                                        subtitle={t('pfi.page.terms.subtitle')}
                                        className={cls.pageTermsBlock}
                                    />

                                    <div className={cls.tablesGrid}>
                                        {tableSections.map((section, index) => {
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
                            }
                        </>
                    }
                </div>
            )}
        </PageDataBoundary>
    )
}
