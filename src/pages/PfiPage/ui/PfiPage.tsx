import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { usePfiReportReadQuery, type PfiQueryFamily } from '@/shared/api/tanstackQueries/pfi'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { AppRoute } from '@/app/providers/router/config/types'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { buildPfiTabsFromSections } from '@/shared/utils/pfiTabs'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import { buildReportTermsFromSections, type ReportTermItem } from '@/shared/utils/reportTerms'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { normalizeZeroLikeNumericText } from '@/shared/utils/numberFormat'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import { SortableTable, type TableRow, getCellValue, toExportCell } from '@/shared/ui/SortableTable'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { Link } from '@/shared/ui/Link'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import {
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    Text,
    buildBusinessTechnicalViewControlGroup,
    type BusinessTechnicalViewControlValue
} from '@/shared/ui'
import cls from './PfiPage.module.scss'
import type { PfiPageProps, PfiTableCardProps } from './types'

const BUSINESS_COLUMN_INDEXES = [0, 1, 2, 4, 7, 9]

interface PfiPageViewConfig {
    family: PfiQueryFamily
    routeReportKind: 'pfi_per_model' | 'pfi_sl_model'
    titleFallbackKey: string
    titleFallbackDefault: string
    subtitleKey: string
    subtitleDefault: string
}

const PFI_PAGE_VIEW_CONFIGS: Record<PfiQueryFamily, PfiPageViewConfig> = {
    daily: {
        family: 'daily',
        routeReportKind: 'pfi_per_model',
        titleFallbackKey: 'pfi.page.header.titleFallback',
        titleFallbackDefault: 'PFI по дневным моделям',
        subtitleKey: 'pfi.page.header.subtitle',
        subtitleDefault:
            'Отчет показывает важность признаков для дневных моделей move / dir / micro. На странице собраны только дневные модели, а SL вынесена в отдельный экран.'
    },
    sl: {
        family: 'sl',
        routeReportKind: 'pfi_sl_model',
        titleFallbackKey: 'pfi.page.header.slTitleFallback',
        titleFallbackDefault: 'PFI по SL-модели',
        subtitleKey: 'pfi.page.header.slSubtitle',
        subtitleDefault:
            'Отчет показывает важность признаков для SL-модели и ее порогов. Здесь собраны только SL-секции без смешения с дневными моделями.'
    }
}

function PfiTableCard({ section, domId, reportKind, featureDetailRoutePath }: PfiTableCardProps) {
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

    const columns = section.columns ?? []
    const normalizedRows = useMemo<TableRow[]>(
        () =>
            (section.rows ?? []).map(row =>
                row.map(cell => (typeof cell === 'string' ? normalizeZeroLikeNumericText(cell) : cell))
            ),
        [section.rows]
    )

    const visibleColumnIndexes = useMemo<number[]>(() => {
        if (columns.length === 0) {
            return []
        }

        if (mode === 'technical') {
            return columns.map((_value, index) => index)
        }

        return BUSINESS_COLUMN_INDEXES.filter(index => index < columns.length)
    }, [columns, mode])

    useEffect(() => {
        setSortedRows(normalizedRows)
    }, [normalizedRows])

    if (columns.length === 0) {
        return null
    }

    const rowsForExport = sortedRows.length > 0 ? sortedRows : normalizedRows
    const exportColumns = visibleColumnIndexes.map(colIdx => columns[colIdx] ?? `col_${colIdx}`)
    const exportRows = rowsForExport.map(row =>
        visibleColumnIndexes.map(colIdx => toExportCell(getCellValue(row, colIdx)))
    )
    const fileBaseName = section.title || domId
    const description = resolveReportSectionDescription(reportKind, section.title)
    // Линки на detail-страницу включаются только для daily PFI.
    const featureColumnIndex = useMemo(() => {
        if (!featureDetailRoutePath || !section.columnKeys || section.columnKeys.length === 0) {
            return null
        }

        const index = section.columnKeys.findIndex(key => key === 'name')
        return index >= 0 ? index : null
    }, [section.columnKeys])

    const renderColumnTitle = (title: string) =>
        renderTermTooltipTitle(title, resolveReportColumnTooltip(reportKind, section.title, title))

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
                renderCell={(value, _rowIndex, colIdx) => {
                    const detailRoutePath = featureDetailRoutePath

                    if (featureColumnIndex === null || colIdx !== featureColumnIndex || !detailRoutePath) {
                        return toExportCell(value)
                    }

                    if (typeof value !== 'string') {
                        return toExportCell(value)
                    }

                    const featureName = value.trim()
                    if (!featureName) {
                        return toExportCell(value)
                    }

                    const targetPath = detailRoutePath.replace(':featureId', encodeURIComponent(featureName))
                    const targetSearch =
                        section.scoreScopeKey === 'oos'
                            ? ''
                            : section.scoreScopeKey === 'train_oof' || section.scoreScopeKey === 'full_history'
                              ? `?source=${encodeURIComponent(section.scoreScopeKey)}`
                              : ''
                    const target = `${targetPath}${targetSearch}`
                    return (
                        <Link to={target} className={cls.featureLink}>
                            {featureName}
                        </Link>
                    )
                }}
            />
        </section>
    )
}

export default function PfiPage({ className, family = 'daily' }: PfiPageProps) {
    const { t } = useTranslation('reports')
    const viewConfig = PFI_PAGE_VIEW_CONFIGS[family]
    const { data: report, isLoading, error, refetch } = usePfiReportReadQuery(family)
    const reportTitle =
        report?.title ||
        t(viewConfig.titleFallbackKey, {
            defaultValue: viewConfig.titleFallbackDefault
        })
    const tableSections = useMemo(() => (report?.sections ?? []).filter(section => section.columns.length > 0), [report])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpoint(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve report source endpoint.', {
                source: 'pfi-page-source-endpoint',
                domain: 'ui_section',
                owner: 'pfi-page',
                expected: 'PFI page should resolve a non-empty report source endpoint.',
                requiredAction: 'Inspect API base URL configuration and report source endpoint resolver.'
            })
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const termsState = useMemo(() => {
        try {
            return {
                terms: buildReportTermsFromSections({
                    sections: tableSections,
                    reportKind: viewConfig.routeReportKind,
                    contextTag: 'pfi'
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to build PFI terms.', {
                source: 'pfi-page-terms',
                domain: 'ui_section',
                owner: 'pfi-page',
                expected: 'PFI page should build terms from table sections and shared glossary.',
                requiredAction: 'Inspect PFI table sections and term resolver.'
            })
            return {
                terms: [] as ReportTermItem[],
                error: safeError
            }
        }
    }, [tableSections, viewConfig.routeReportKind])

    const tabs = useMemo(() => buildPfiTabsFromSections(tableSections), [tableSections])
    const featureDetailRoutePath =
        viewConfig.family === 'daily' ? ROUTE_PATH[AppRoute.PFI_PER_MODEL_FEATURE_DETAIL] : null
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
        syncHash: true
    })

    return (
        <div className={classNames(cls.PfiPage, {}, [className ?? ''])}>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{reportTitle}</Text>
                    <Text className={cls.subtitle}>
                        {t(viewConfig.subtitleKey, {
                            defaultValue: viewConfig.subtitleDefault
                        })}
                    </Text>
                </div>
                {report && sourceEndpointState.value && (
                    <ReportActualStatusCard
                        statusMode='actual'
                        statusTitle={t('pfi.page.status.publishedTitle')}
                        statusMessage={t('pfi.page.status.publishedMessage')}
                        dataSource={sourceEndpointState.value}
                        reportTitle={reportTitle}
                        reportId={report.id}
                        reportKind={report.kind}
                        generatedAtUtc={report.generatedAtUtc}
                        statusLines={[
                            {
                                label: t('pfi.page.statusLines.tableSectionCount'),
                                value: String(tableSections.length)
                            }
                        ]}
                    />
                )}
            </header>

            <SectionDataState
                isLoading={isLoading}
                isError={Boolean(error)}
                error={error}
                hasData={Boolean(report)}
                onRetry={refetch}
                title={t('pfi.page.errorTitle')}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{ source: 'pfi-page-report' }}>
                <SectionDataState
                    isError={Boolean(termsState.error)}
                    error={termsState.error}
                    hasData={!termsState.error}
                    title={t('pfi.page.errors.terms.title')}
                    description={t('pfi.page.errors.terms.message')}
                    onRetry={refetch}
                    logContext={{ source: 'pfi-page-terms' }}>
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
                                            key={section.sectionKey}
                                            section={section}
                                            domId={domId}
                                            reportKind={viewConfig.routeReportKind}
                                            featureDetailRoutePath={featureDetailRoutePath}
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
                </SectionDataState>
            </SectionDataState>
        </div>
    )
}
