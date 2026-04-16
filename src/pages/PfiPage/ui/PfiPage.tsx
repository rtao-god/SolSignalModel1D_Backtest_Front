import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { usePfiReportReadQuery, type PfiQueryFamily } from '@/shared/api/tanstackQueries/pfi'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { AppRoute } from '@/app/providers/router/config/types'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { buildPfiTabsFromSections } from '@/shared/utils/pfiTabs'
import { resolveReportColumnTooltip, resolveReportTooltipLocale } from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import { buildReportTermsFromSections, type ReportTermItem } from '@/shared/utils/reportTerms'
import { localizeReportColumnTitle } from '@/shared/utils/reportPresentationLocalization'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { normalizeZeroLikeNumericText } from '@/shared/utils/numberFormat'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import { SortableTable, type TableRow, getCellValue, toExportCell } from '@/shared/ui/SortableTable'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { Link } from '@/shared/ui/Link'
import { PageDataState, PageSectionDataState } from '@/shared/ui/errors/PageDataState'
import type { PfiReportSectionDto } from '@/shared/types/pfi.types'
import {
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    Text,
    buildBusinessTechnicalViewControlGroup,
    buildSelectionControlGroup,
    type BusinessTechnicalViewControlValue
} from '@/shared/ui'
import ModelStatsPage from '@/pages/ModelStatsPage'
import cls from './PfiPage.module.scss'
import type { PfiPageMode, PfiPageProps, PfiTableCardProps } from './types'

const PFI_FEATURE_DESCRIPTION_COLUMN_KEY = 'feature_description'
const PFI_BUSINESS_COLUMN_KEYS = ['index', 'feature_description', 'name', 'importance_auc', 'delta_mean', 'corr_score', 'support']

function buildBusinessColumnIndexes(section: PfiReportSectionDto): number[] {
    const columnKeys = section.columnKeys ?? []
    if (columnKeys.length === 0) {
        return section.columns.map((_value, index) => index)
    }

    return PFI_BUSINESS_COLUMN_KEYS.map(key => columnKeys.indexOf(key)).filter(index => index >= 0)
}

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
    const { t, i18n } = useTranslation(['reports', 'common'])
    const [mode, setMode] = useState<BusinessTechnicalViewControlValue>('business')
    const [sortedRows, setSortedRows] = useState<TableRow[]>([])
    const locale = resolveReportTooltipLocale(i18n.resolvedLanguage ?? i18n.language)
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

        const businessIndexes = buildBusinessColumnIndexes(section)
        return businessIndexes.length > 0 ? businessIndexes : columns.map((_value, index) => index)
    }, [columns, mode, section])

    useEffect(() => {
        setSortedRows(normalizedRows)
    }, [normalizedRows])

    if (columns.length === 0) {
        return null
    }

    const rowsForExport = sortedRows.length > 0 ? sortedRows : normalizedRows
    const exportColumns = visibleColumnIndexes.map(colIdx =>
        localizeReportColumnTitle(reportKind, columns[colIdx] ?? `col_${colIdx}`, locale)
    )
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
        renderTermTooltipTitle(
            localizeReportColumnTitle(reportKind, title, locale),
            resolveReportColumnTooltip(reportKind, section.title, title, locale)
        )

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
                className={cls.tableScroll}
                tableClassName={cls.table}
                onSortedRowsChange={setSortedRows}
                renderColumnTitle={renderColumnTitle}
                getCellClassName={(_value, _rowIndex, colIdx) => {
                    const columnKey = section.columnKeys?.[colIdx]
                    if (columnKey === PFI_FEATURE_DESCRIPTION_COLUMN_KEY) {
                        return cls.descriptionCell
                    }

                    if (columnKey === 'name') {
                        return cls.featureNameCell
                    }

                    return undefined
                }}
                renderCell={(value, _rowIndex, colIdx) => {
                    const columnKey = section.columnKeys?.[colIdx]
                    const detailRoutePath = featureDetailRoutePath

                    if (columnKey === PFI_FEATURE_DESCRIPTION_COLUMN_KEY) {
                        return <span className={cls.descriptionText}>{toExportCell(value)}</span>
                    }

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

interface PfiDiagnosticsPanelProps {
    family: PfiQueryFamily
}

function PfiDiagnosticsPanel({ family }: PfiDiagnosticsPanelProps) {
    const { t, i18n } = useTranslation('reports')
    const viewConfig = PFI_PAGE_VIEW_CONFIGS[family]
    const { data: report, isLoading, error, refetch } = usePfiReportReadQuery(family)
    const reportTitle =
        report?.title ||
        t(viewConfig.titleFallbackKey, {
            defaultValue: viewConfig.titleFallbackDefault
        })
    const tableSections = useMemo(
        () => (report?.sections ?? []).filter(section => section.columns.length > 0),
        [report]
    )

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
                    contextTag: 'pfi',
                    locale: i18n.resolvedLanguage ?? i18n.language
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
        <PageDataState
            shell={
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
            }
            isLoading={isLoading}
            isError={Boolean(error)}
            error={error}
            hasData={Boolean(report)}
            onRetry={refetch}
            title={t('pfi.page.errorTitle')}
            loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
            logContext={{ source: 'pfi-page-report' }}>
            <PageSectionDataState
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
            </PageSectionDataState>
        </PageDataState>
    )
}

function FixedSplitPfiPage({ className, family = 'daily' }: PfiPageProps) {
    const { t } = useTranslation('reports')
    const [pageMode, setPageMode] = useState<PfiPageMode>('model_quality')
    const familyFilter = family === 'daily' ? 'daily_model' : 'sl_model'

    // Обе PFI-страницы теперь живут по одному shell-контракту:
    // сначала published слой качества моделей по выбранному семейству,
    // затем по кнопке подключается отдельный диагностический PFI-отчёт.
    const pageModeControls = useMemo(
        () => [
            buildSelectionControlGroup<PfiPageMode>({
                key: `pfi-page-mode-${family}`,
                label: t('pfi.page.pageMode.label'),
                ariaLabel: t('pfi.page.pageMode.ariaLabel'),
                infoTooltip: t('pfi.page.pageMode.tooltip'),
                value: pageMode,
                options: [
                    {
                        value: 'model_quality',
                        label: t('pfi.page.pageMode.options.modelQuality.label'),
                        tooltip: t('pfi.page.pageMode.options.modelQuality.tooltip')
                    },
                    {
                        value: 'feature_impact',
                        label: t('pfi.page.pageMode.options.featureImpact.label'),
                        tooltip: t('pfi.page.pageMode.options.featureImpact.tooltip')
                    }
                ],
                onChange: setPageMode
            })
        ],
        [family, pageMode, t]
    )

    return (
        <div className={classNames(cls.PfiPage, {}, [className ?? ''])}>
            <ReportViewControls groups={pageModeControls} className={cls.pageModeControls} />

            {pageMode === 'model_quality' ?
                <ModelStatsPage embedded familyFilter={familyFilter} />
            :   <PfiDiagnosticsPanel family={family} />}
        </div>
    )
}

export default function PfiPage(props: PfiPageProps) {
    return <FixedSplitPfiPage {...props} />
}
