import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { usePfiFeatureDetailReportQuery } from '@/shared/api/tanstackQueries/pfi'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { buildReportTermsFromSections, type ReportTermItem } from '@/shared/utils/reportTerms'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import { resolveReportColumnTooltip, resolveReportTooltipLocale } from '@/shared/utils/reportTooltips'
import { localizeReportColumnTitle } from '@/shared/utils/reportPresentationLocalization'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { normalizeZeroLikeNumericText } from '@/shared/utils/numberFormat'
import type { PfiFeatureDetailScoreScopeKeyDto, PfiFeatureHistoryRangeKeyDto } from '@/shared/types/pfi.types'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import { SortableTable, type TableRow, getCellValue, toExportCell } from '@/shared/ui/SortableTable'
import { renderTermTooltipRichText, renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { PageDataState, PageSectionDataState } from '@/shared/ui/errors/PageDataState'
import {
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    Text,
    type ReportViewControlGroup,
    type ReportViewControlOption
} from '@/shared/ui'
import cls from './PfiFeatureDetailPage.module.scss'
import PfiFeatureRollingChart from './PfiFeatureRollingChart'
import PfiFeatureValueOutcomeProfileChart from './PfiFeatureValueOutcomeProfileChart'
import type { PfiFeatureDetailTableCardProps } from './types'

const SCORE_SCOPE_OPTIONS: ReadonlyArray<ReportViewControlOption<PfiFeatureDetailScoreScopeKeyDto>> = [
    {
        value: 'oos',
        label: 'OOS',
        tooltip:
            'Главный режим. Модель учится на ранней части каждого окна, а полезность признака измеряется на более поздних днях этого же окна. Это самый близкий аналог реальной проверки на новых данных. Такой режим обычно начинается позже остальных, потому что внутри каждого окна нужен отдельный будущий хвост для проверки.'
    },
    {
        value: 'train_oof',
        label: 'Train OOF',
        tooltip:
            'Честная внутренняя проверка на той же истории. Каждая точка оценивается моделью, которая заранее не видела именно эту точку. Этот режим удобно сравнивать с OOS: большой разрыв означает слабую переносимость на будущее. История здесь тоже может стартовать позже, потому что внутри окна нужно накопить достаточно данных для внутренней переоценки.'
    },
    {
        value: 'full_history',
        label: 'Вся история',
        tooltip:
            'Общий портрет на всём локальном окне сразу. Режим удобен для общей картины, но обычно выглядит оптимистичнее, чем OOS, потому что обучение и измерение идут на одном и том же окне. Зато он обычно покрывает самую длинную историю, потому что ему не нужен отдельный будущий хвост внутри окна.'
    }
]

const HISTORY_RANGE_OPTIONS: ReadonlyArray<ReportViewControlOption<PfiFeatureHistoryRangeKeyDto>> = [
    {
        value: 'all',
        label: 'Все время',
        tooltip:
            'Весь доступный ряд для выбранного источника оценки. Этот режим нужен, когда важно увидеть полную смену рыночных режимов по всей истории.'
    },
    {
        value: '180',
        label: '180 дн.',
        tooltip:
            'Последние 180 календарных дней. Это короткий хвост для быстрого чтения текущего рыночного режима без длинной ранней истории.'
    },
    {
        value: '730',
        label: '730 дн.',
        tooltip:
            'Последние 730 календарных дней. Это средний горизонт: уже видны смены режима, но ранняя история ещё не перегружает график.'
    }
]

const SCORE_SCOPE_TOOLTIP =
    'Источник оценки показывает, на каких данных измерялась полезность признака.\n\n' +
    'OOS: модель учится на ранней части окна, а важность признака измеряется на будущем хвосте этого же окна. Это главный режим, потому что он ближе всего к реальной работе на новых данных. История здесь часто стартует позже, потому что внутри окна нужен отдельный кусок будущих дней.\n\n' +
    'Train OOF: каждая точка внутри окна проверяется моделью, которая именно эту точку заранее не видела. Режим нужен для внутренней проверки устойчивости. Он тоже может начинаться позже полного режима, потому что внутри окна требуется отдельная честная переоценка.\n\n' +
    'Вся история: модель учится и оценивается на всём локальном окне сразу. Режим показывает общий рисунок, но обычно выглядит оптимистичнее OOS. Зато он чаще всего даёт самую длинную временную линию.'

const HISTORY_RANGE_TOOLTIP =
    'Срез истории ограничивает только длину показанной временной линии.\n\n' +
    'Все время: весь доступный ряд.\n\n' +
    '180 дн.: только последний короткий хвост для быстрого чтения недавнего режима.\n\n' +
    '730 дн.: средний горизонт, где уже видны смены режима, но без лишнего шума ранней истории.'

function buildControlOptions<T extends string>(
    allOptions: ReadonlyArray<ReportViewControlOption<T>>,
    availableValues: readonly T[] | null | undefined,
    selectedValue: T,
    fallbackValue: T
): ReportViewControlOption<T>[] {
    const valuesToShow = new Set<T>()

    if (availableValues && availableValues.length > 0) {
        for (const value of availableValues) {
            valuesToShow.add(value)
        }
    } else {
        valuesToShow.add(selectedValue)
        valuesToShow.add(fallbackValue)
    }

    return allOptions.filter(option => valuesToShow.has(option.value))
}

function resolveScoreScopeFromQuery(raw: string | null): PfiFeatureDetailScoreScopeKeyDto {
    if (!raw) {
        return 'oos'
    }

    const normalized = raw.trim().toLowerCase()
    if (normalized === 'oos' || normalized === 'train_oof' || normalized === 'full_history') {
        return normalized
    }

    throw new Error(`[ui:pfi] invalid score scope query: ${raw}.`)
}

function resolveHistoryRangeFromQuery(raw: string | null): PfiFeatureHistoryRangeKeyDto {
    if (!raw) {
        return 'all'
    }

    const normalized = raw.trim().toLowerCase()
    if (normalized === 'all' || normalized === '180' || normalized === '730') {
        return normalized
    }

    throw new Error(`[ui:pfi] invalid history range query: ${raw}.`)
}

function formatHistoryRangeLabel(historyRangeKey: PfiFeatureHistoryRangeKeyDto): string {
    return historyRangeKey === 'all' ? 'Все время' : `${historyRangeKey} дн.`
}

function formatScoreScopeLabel(scoreScopeKey: PfiFeatureDetailScoreScopeKeyDto): string {
    switch (scoreScopeKey) {
        case 'oos':
            return 'OOS'
        case 'train_oof':
            return 'Train OOF'
        case 'full_history':
            return 'Вся история'
        case 'train':
            return 'Train'
        default:
            return scoreScopeKey
    }
}

// Детальная страница PFI-фичи: отрисовывает описание и таблицы из готового published-отчёта.
function PfiFeatureDetailTableCard({
    table,
    reportKind,
    storageKey,
    subtitle,
    className
}: PfiFeatureDetailTableCardProps) {
    const { i18n } = useTranslation()
    const [sortedRows, setSortedRows] = useState<TableRow[]>([])
    const locale = resolveReportTooltipLocale(i18n.resolvedLanguage ?? i18n.language)

    const columns = table.columns ?? []
    const resolvedSubtitle = subtitle?.trim() || resolveReportSectionDescription(reportKind, table.title)
    const normalizedRows = useMemo<TableRow[]>(
        () =>
            (table.rows ?? []).map(row =>
                row.map(cell => (typeof cell === 'string' ? normalizeZeroLikeNumericText(cell) : cell))
            ),
        [table.rows]
    )

    useEffect(() => {
        setSortedRows(normalizedRows)
    }, [normalizedRows])

    if (columns.length === 0) {
        return null
    }

    const rowsForExport = sortedRows.length > 0 ? sortedRows : normalizedRows
    const exportRows = rowsForExport.map(row => columns.map((_title, colIdx) => toExportCell(getCellValue(row, colIdx))))

    const renderColumnTitle = (title: string) =>
        renderTermTooltipTitle(
            localizeReportColumnTitle(reportKind, title, locale),
            resolveReportColumnTooltip(reportKind, table.title, title, locale)
        )

    return (
        <section className={classNames(cls.tableCard, {}, [className ?? ''])}>
            <header className={cls.cardHeader}>
                <div className={cls.cardHeaderMain}>
                    <Text type='h3' className={cls.cardTitle}>
                        {table.title}
                    </Text>
                    {resolvedSubtitle && <Text className={cls.cardSubtitle}>{resolvedSubtitle}</Text>}
                </div>

                <TableExportButton
                    columns={columns.map(column => localizeReportColumnTitle(reportKind, column, locale))}
                    rows={exportRows}
                    fileBaseName={table.title}
                    defaultFormat='pdf'
                />
            </header>

            <SortableTable
                columns={columns}
                rows={normalizedRows}
                storageKey={storageKey}
                onSortedRowsChange={setSortedRows}
                renderColumnTitle={renderColumnTitle}
            />
        </section>
    )
}

function FixedSplitPfiFeatureDetailPage({ className }: { className?: string }) {
    const { i18n } = useTranslation()
    const params = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const rawFeatureId = typeof params.featureId === 'string' ? params.featureId : ''
    const featureId = rawFeatureId.trim()
    const hasFeatureId = featureId.length > 0
    const scoreScopeState = useMemo(() => {
        try {
            return {
                value: resolveScoreScopeFromQuery(searchParams.get('source')),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse PFI feature score scope query.', {
                source: 'pfi-feature-detail-score-scope-query',
                domain: 'ui_section',
                owner: 'pfi-feature-detail-page',
                expected: 'PFI feature detail page should parse a valid score scope query value.',
                requiredAction: 'Inspect the source URL param and supported score scope values.'
            })
            return {
                value: 'oos' as PfiFeatureDetailScoreScopeKeyDto,
                error: safeError
            }
        }
    }, [searchParams])
    const historyRangeState = useMemo(() => {
        try {
            return {
                value: resolveHistoryRangeFromQuery(searchParams.get('range')),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse PFI feature history range query.', {
                source: 'pfi-feature-detail-history-range-query',
                domain: 'ui_section',
                owner: 'pfi-feature-detail-page',
                expected: 'PFI feature detail page should parse a valid history range query value.',
                requiredAction: 'Inspect the range URL param and supported history range values.'
            })
            return {
                value: 'all' as PfiFeatureHistoryRangeKeyDto,
                error: safeError
            }
        }
    }, [searchParams])

    const {
        data: report,
        isLoading,
        error: reportError,
        refetch
    } = usePfiFeatureDetailReportQuery(featureId, scoreScopeState.value, historyRangeState.value, {
        enabled: hasFeatureId && !scoreScopeState.error && !historyRangeState.error
    })

    const routeError = useMemo(
        () => (hasFeatureId ? null : new Error('[ui:pfi] featureId param is missing.')),
        [hasFeatureId]
    )

    const effectiveError = routeError ?? scoreScopeState.error ?? historyRangeState.error ?? reportError ?? null

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpoint(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve report source endpoint.', {
                source: 'pfi-feature-detail-source-endpoint',
                domain: 'ui_section',
                owner: 'pfi-feature-detail-page',
                expected: 'PFI feature detail page should resolve a non-empty report source endpoint.',
                requiredAction: 'Inspect API base URL configuration and report source endpoint resolver.'
            })
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const reportTitle = report?.featureName || featureId || 'Признак'
    const reportSubtitle =
        'Страница собирает полный разбор выбранного признака: реакцию рынка на его значения, важность по моделям, локальный вклад в прогноз и качество прогноза по диапазонам значений.'
    const statusLines = useMemo(() => {
        if (!report) {
            return []
        }

        const lines = []
        if (report.featureSchemaKey) {
            lines.push({ label: 'Схема признаков', value: report.featureSchemaKey })
        }
        if (report.trainUntilExitDayKeyUtc) {
            lines.push({ label: 'Граница обучения', value: report.trainUntilExitDayKeyUtc })
        }
        lines.push({ label: 'Источник оценки', value: formatScoreScopeLabel(report.scoreScopeKey) })
        lines.push({ label: 'История', value: formatHistoryRangeLabel(report.historyRangeKey) })
        if (report.historyCoverage?.coverageStartDayKeyUtc && report.historyCoverage?.coverageEndDayKeyUtc) {
            lines.push({
                label: 'Покрытие истории',
                value: `${report.historyCoverage.coverageStartDayKeyUtc} -> ${report.historyCoverage.coverageEndDayKeyUtc}`
            })
        }
        if (report.historyCoverage) {
            lines.push({
                label: 'Окна',
                value: `${report.historyCoverage.successfulWindowCount}/${report.historyCoverage.requestedWindowCount}`
            })
        }

        return lines
    }, [report])

    const handleScoreScopeChange = (nextScope: PfiFeatureDetailScoreScopeKeyDto) => {
        const nextParams = new URLSearchParams(searchParams)
        if (nextScope === 'oos') {
            nextParams.delete('source')
        } else {
            nextParams.set('source', nextScope)
        }

        setSearchParams(nextParams)
    }

    const handleHistoryRangeChange = (nextRange: PfiFeatureHistoryRangeKeyDto) => {
        const nextParams = new URLSearchParams(searchParams)
        if (nextRange === 'all') {
            nextParams.delete('range')
        } else {
            nextParams.set('range', nextRange)
        }

        setSearchParams(nextParams)
    }

    const controlGroups = useMemo<ReportViewControlGroup[]>(() => {
        const scoreScopeOptions = buildControlOptions(
            SCORE_SCOPE_OPTIONS,
            report?.availableScoreScopeKeys,
            scoreScopeState.value,
            'oos'
        )
        const historyRangeOptions = buildControlOptions(
            HISTORY_RANGE_OPTIONS,
            report?.availableHistoryRangeKeys,
            historyRangeState.value,
            'all'
        )

        return [
            {
                key: 'score-scope',
                label: 'Источник оценки',
                infoTooltip: SCORE_SCOPE_TOOLTIP,
                value: scoreScopeState.value,
                options: scoreScopeOptions,
                onChange: handleScoreScopeChange
            },
            {
                key: 'history-range',
                label: 'Срез истории',
                infoTooltip: HISTORY_RANGE_TOOLTIP,
                value: historyRangeState.value,
                options: historyRangeOptions,
                onChange: handleHistoryRangeChange
            }
        ]
    }, [historyRangeState.value, report, scoreScopeState.value])

    const detailTables = useMemo(() => {
        if (!report) {
            return []
        }

        return [
            {
                key: 'quality',
                table: report.modelQualityTable,
                storageKey: `pfi.feature.${report.featureName}.quality`
            },
            {
                key: 'contribution',
                table: report.contributionStatsTable,
                storageKey: `pfi.feature.${report.featureName}.contribution`
            },
            {
                key: 'value-buckets',
                table: report.valueBucketsTable,
                storageKey: `pfi.feature.${report.featureName}.value-buckets`
            },
            {
                key: 'sections',
                table: report.sectionStatsTable,
                storageKey: `pfi.feature.${report.featureName}.sections`
            },
            {
                key: 'peers',
                table: report.peerFeaturesTable,
                storageKey: `pfi.feature.${report.featureName}.peers`
            }
        ].filter(item => Boolean(item.table))
    }, [report])

    const detailTableSections = useMemo(
        () => detailTables.flatMap(item => (item.table ? [item.table] : [])),
        [detailTables]
    )

    const termsState = useMemo(() => {
        if (!report || detailTableSections.length === 0) {
            return {
                terms: [] as ReportTermItem[],
                error: null as Error | null
            }
        }

        try {
            return {
                terms: buildReportTermsFromSections({
                    sections: detailTableSections,
                    reportKind: report.kind,
                    contextTag: 'pfi-feature-detail',
                    locale: i18n.resolvedLanguage ?? i18n.language
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to build PFI feature detail terms.', {
                source: 'pfi-feature-detail-terms',
                domain: 'ui_section',
                owner: 'pfi-feature-detail-page',
                expected: 'PFI feature detail page should build terms from visible detail tables and shared glossary.',
                requiredAction: 'Inspect detail table sections and PFI term resolver.'
            })
            return {
                terms: [] as ReportTermItem[],
                error: safeError
            }
        }
    }, [detailTableSections, i18n.language, i18n.resolvedLanguage, report])

    return (
        <div className={classNames(cls.PfiFeatureDetailPage, {}, [className ?? ''])}>
            <PageDataState
                shell={
                    <>
                        <header className={cls.headerRow}>
                            <div>
                                <Text type='h2'>{reportTitle}</Text>
                                <Text className={cls.subtitle}>{reportSubtitle}</Text>
                            </div>

                            {report && sourceEndpointState.value && (
                                <ReportActualStatusCard
                                    statusMode='actual'
                                    dataSource={sourceEndpointState.value}
                                    reportTitle={reportTitle}
                                    reportId={report.id}
                                    reportKind={report.kind}
                                    generatedAtUtc={report.generatedAtUtc}
                                    statusLines={statusLines}
                                />
                            )}
                        </header>

                        {hasFeatureId && (
                            <section className={cls.pageControlsCard}>
                                <ReportViewControls groups={controlGroups} />
                            </section>
                        )}
                    </>
                }
                isLoading={isLoading}
                isError={Boolean(effectiveError)}
                error={effectiveError}
                hasData={Boolean(report)}
                onRetry={refetch}
                title='Отчёт недоступен'
                loadingText='Загрузка отчёта'
                logContext={{ source: 'pfi-feature-detail-report' }}>
                {report && (
                    <PageSectionDataState
                        isError={Boolean(termsState.error)}
                        error={termsState.error}
                        hasData={!termsState.error}
                        title='Термины отчёта недоступны'
                        description='Страница не смогла собрать пояснения по колонкам. Проверь словарь терминов и состав таблиц.'
                        onRetry={refetch}
                        logContext={{ source: 'pfi-feature-detail-terms' }}>
                        <>
                            {report.descriptionBlocks.length > 0 && (
                                <section className={cls.descriptionCard}>
                                    {report.descriptionBlocks.map(block => (
                                        <div key={block.title} className={cls.descriptionBlock}>
                                            <Text type='h4' className={cls.blockTitle}>
                                                {block.title}
                                            </Text>
                                            <Text className={cls.blockBody}>
                                                {renderTermTooltipRichText(block.body)}
                                            </Text>
                                        </div>
                                    ))}
                                </section>
                            )}

                            {report.valueOutcomeProfile && (
                                <PfiFeatureValueOutcomeProfileChart profile={report.valueOutcomeProfile} />
                            )}

                            {termsState.terms.length > 0 && (
                                <ReportTableTermsBlock
                                    terms={termsState.terms}
                                    title='Термины этого отчёта'
                                    subtitle='Подробные определения колонок из всех таблиц по выбранному признаку.'
                                    className={cls.termsCard}
                                />
                            )}

                            {report.historyCharts.length > 0 && <PfiFeatureRollingChart charts={report.historyCharts} />}

                            <div className={cls.tablesGrid}>
                                {detailTables.map(item => (
                                    <PfiFeatureDetailTableCard
                                        key={item.key}
                                        table={item.table!}
                                        reportKind={report.kind}
                                        storageKey={item.storageKey}
                                    />
                                ))}
                            </div>
                        </>
                    </PageSectionDataState>
                )}
            </PageDataState>
        </div>
    )
}

export default function PfiFeatureDetailPage(props: { className?: string }) {
    return <FixedSplitPfiFeatureDetailPage {...props} />
}
