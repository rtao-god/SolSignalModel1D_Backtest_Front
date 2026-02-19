import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { ReportActualStatusCard, ReportTableTermsBlock, ReportViewControls, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import type { TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { usePolicyBranchMegaReportWithFreshnessQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import {
    buildPolicyBranchMegaTermsForColumns,
    getPolicyBranchMegaTermOrThrow,
    orderPolicyBranchMegaSectionsOrThrow,
    resolvePolicyBranchMegaSectionDescription
} from '@/shared/utils/policyBranchMegaTerms'
import {
    buildPolicyBranchMegaTabsFromSections,
    filterPolicyBranchMegaSectionsByMetricOrThrow,
    filterPolicyBranchMegaSectionsByBucketOrThrow,
    filterPolicyBranchMegaSectionsByZonalModeOrThrow,
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaMetricFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery,
    resolvePolicyBranchMegaZonalModeFromQuery,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaMetricMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import {
    DEFAULT_REPORT_BUCKET_MODE,
    DEFAULT_REPORT_METRIC_MODE,
    DEFAULT_REPORT_TP_SL_MODE,
    DEFAULT_REPORT_ZONAL_MODE
} from '@/shared/utils/reportViewCapabilities'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import { applyReportTpSlModeToSectionsOrThrow } from '@/shared/utils/reportTpSlMode'
import cls from './PolicyBranchMegaPage.module.scss'
import type { PolicyBranchMegaPageProps } from './types'
function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}
function sectionDomId(index: number): string {
    return `policy-branch-section-${index + 1}`
}

function rowFingerprint(row: unknown): string {
    if (Array.isArray(row)) {
        return row.map(value => String(value ?? '')).join('\u001f')
    }

    return JSON.stringify(row)
}

// Жестко валидируем счетчики сделок, чтобы не скрывать битые числовые поля отчета.
function parseNonNegativeIntOrThrow(raw: string, label: string): number {
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
        throw new Error(`[policy-branch-mega] ${label} must be a non-negative integer. value=${raw}`)
    }

    return value
}

function parseFiniteNumberOrNull(raw: string | undefined): number | null {
    if (raw == null) return null
    const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.')
    if (!normalized) return null
    if (normalized === '—') return null

    const value = Number(normalized)
    if (!Number.isFinite(value)) return null
    return value
}

function buildUnifiedPolicyBranchMegaTermsOrThrow(sections: TableSectionDto[]) {
    const termByKey = new Map<string, ReturnType<typeof getPolicyBranchMegaTermOrThrow>>()

    for (const section of sections) {
        const terms = buildPolicyBranchMegaTermsForColumns(section.columns ?? [])

        for (const term of terms) {
            if (!termByKey.has(term.key)) {
                termByKey.set(term.key, term)
            }
        }
    }

    return Array.from(termByKey.values())
}

// Если сделок нет, показываем "нет данных" вместо 0.00; несогласованные строки считаем ошибкой данных.
function applyNoDataMarkersToMegaSectionsOrThrow(sections: TableSectionDto[]): TableSectionDto[] {
    if (!sections || sections.length === 0) return sections

    const replacements: Array<{
        section: string
        rowIndex: number
        policy: string
        branch: string
        column: string
    }> = []

    const nextSections = sections.map(section => {
        const columns = section.columns ?? []
        const rows = section.rows ?? []

        const policyIdx = columns.indexOf('Policy')
        const branchIdx = columns.indexOf('Branch')
        const totalTradesIdx = columns.indexOf('Tr')
        const totalPnlIdx = columns.indexOf('TotalPnl%')
        const dynTradesIdx = columns.indexOf('DynTP/SL Tr')
        const dynPnlIdx = columns.indexOf('DynTP/SL PnL%')
        const statTradesIdx = columns.indexOf('StatTP/SL Tr')
        const statPnlIdx = columns.indexOf('StatTP/SL PnL%')

        if (policyIdx < 0 || branchIdx < 0 || totalTradesIdx < 0 || totalPnlIdx < 0) {
            return section
        }

        const nextRows = rows.map((row, rowIndex) => {
            const requiredIdx = Math.max(policyIdx, branchIdx, totalTradesIdx, totalPnlIdx)
            if (!row || row.length <= requiredIdx) {
                throw new Error(
                    `[policy-branch-mega] malformed row for no-data transform. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const policy = row[policyIdx] ?? ''
            const branch = row[branchIdx] ?? ''
            if (!policy || !branch) {
                throw new Error(
                    `[policy-branch-mega] empty Policy/Branch in no-data transform. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const nextRow = [...row]

            const totalTrades = parseNonNegativeIntOrThrow(nextRow[totalTradesIdx] ?? '', 'total.trades')
            if (totalTrades === 0) {
                const totalPnlValue = parseFiniteNumberOrNull(nextRow[totalPnlIdx])
                if (totalPnlValue === null || Math.abs(totalPnlValue) <= 1e-12) {
                    nextRow[totalPnlIdx] = 'нет данных'
                    replacements.push({
                        section: section.title ?? 'n/a',
                        rowIndex,
                        policy,
                        branch,
                        column: 'TotalPnl%'
                    })
                } else {
                    throw new Error(
                        `[policy-branch-mega] total pnl must be zero/empty when trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[totalPnlIdx]}.`
                    )
                }
            }

            if (dynTradesIdx >= 0 && dynPnlIdx >= 0) {
                const dynTrades = parseNonNegativeIntOrThrow(nextRow[dynTradesIdx] ?? '', 'dynamic.trades')
                if (dynTrades === 0) {
                    const dynPnlValue = parseFiniteNumberOrNull(nextRow[dynPnlIdx])
                    if (dynPnlValue === null || Math.abs(dynPnlValue) <= 1e-12) {
                        nextRow[dynPnlIdx] = 'нет данных'
                        replacements.push({
                            section: section.title ?? 'n/a',
                            rowIndex,
                            policy,
                            branch,
                            column: 'DynTP/SL PnL%'
                        })
                    } else {
                        throw new Error(
                            `[policy-branch-mega] dynamic pnl must be zero/empty when dynamic trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[dynPnlIdx]}.`
                        )
                    }
                }
            }

            if (statTradesIdx >= 0 && statPnlIdx >= 0) {
                const statTrades = parseNonNegativeIntOrThrow(nextRow[statTradesIdx] ?? '', 'static.trades')
                if (statTrades === 0) {
                    const statPnlValue = parseFiniteNumberOrNull(nextRow[statPnlIdx])
                    if (statPnlValue === null || Math.abs(statPnlValue) <= 1e-12) {
                        nextRow[statPnlIdx] = 'нет данных'
                        replacements.push({
                            section: section.title ?? 'n/a',
                            rowIndex,
                            policy,
                            branch,
                            column: 'StatTP/SL PnL%'
                        })
                    } else {
                        throw new Error(
                            `[policy-branch-mega] static pnl must be zero/empty when static trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[statPnlIdx]}.`
                        )
                    }
                }
            }

            return nextRow
        })

        return {
            ...section,
            rows: nextRows
        }
    })

    if (replacements.length > 0) {
        console.error('[policy-branch-mega] no-data metrics were rendered as "нет данных".', {
            replacementsCount: replacements.length,
            sample: replacements.slice(0, 12)
        })
    }

    return nextSections
}

export default function PolicyBranchMegaPage({ className }: PolicyBranchMegaPageProps) {
    const [searchParams, setSearchParams] = useSearchParams()
    const { data, isError, error, refetch } = usePolicyBranchMegaReportWithFreshnessQuery()
    const report = data?.report ?? null
    const freshness = data?.freshness ?? null

    const tableSections = useMemo(() => buildTableSections(report?.sections ?? []), [report])

    const resolvedSections = useMemo(() => {
        if (!report) return { sections: [] as TableSectionDto[], error: null as Error | null }

        try {
            return {
                sections: orderPolicyBranchMegaSectionsOrThrow(tableSections),
                error: null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega sections.')
            return {
                sections: [] as TableSectionDto[],
                error: safeError
            }
        }
    }, [report, tableSections])

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(searchParams.get('bucket'), DEFAULT_REPORT_BUCKET_MODE)
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega bucket query.')
            return { value: DEFAULT_REPORT_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(searchParams.get('metric'), DEFAULT_REPORT_METRIC_MODE)
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega metric query.')
            return { value: DEFAULT_REPORT_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_REPORT_TP_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega tpsl query.')
            return { value: DEFAULT_REPORT_TP_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const zonalState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaZonalModeFromQuery(
                searchParams.get('zonal'),
                DEFAULT_REPORT_ZONAL_MODE
            )
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega zonal query.')
            return { value: DEFAULT_REPORT_ZONAL_MODE, error: safeError }
        }
    }, [searchParams])

    const filteredSections = useMemo(() => {
        if (!report) return { sections: [] as TableSectionDto[], error: null as Error | null }
        if (resolvedSections.error) {
            return { sections: [] as TableSectionDto[], error: resolvedSections.error }
        }

        try {
            const byZonal = filterPolicyBranchMegaSectionsByZonalModeOrThrow(
                resolvedSections.sections,
                zonalState.value
            )
            const byBucket = filterPolicyBranchMegaSectionsByBucketOrThrow(byZonal, bucketState.value)
            const byMetric = filterPolicyBranchMegaSectionsByMetricOrThrow(byBucket, metricState.value)
            const noDataAwareSections = applyNoDataMarkersToMegaSectionsOrThrow(byMetric)
            return {
                sections: applyReportTpSlModeToSectionsOrThrow(
                    noDataAwareSections,
                    tpSlState.value,
                    'policy-branch-mega'
                ),
                error: null
            }
        } catch (err) {
            const safeError =
                err instanceof Error
                    ? err
                    : new Error('Failed to filter policy branch mega sections by zonal/bucket/metric.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [report, resolvedSections, zonalState.value, bucketState.value, metricState.value, tpSlState.value])

    const termsState = useMemo(() => {
        try {
            return {
                terms: buildUnifiedPolicyBranchMegaTermsOrThrow(filteredSections.sections),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build policy branch mega terms.')
            return {
                terms: [] as ReturnType<typeof getPolicyBranchMegaTermOrThrow>[],
                error: safeError
            }
        }
    }, [filteredSections.sections])

    const metricDiffState = useMemo(() => {
        if (!report || resolvedSections.error || zonalState.error || bucketState.error) {
            return null
        }

        try {
            const byZonal = filterPolicyBranchMegaSectionsByZonalModeOrThrow(
                resolvedSections.sections,
                zonalState.value
            )
            const byBucket = filterPolicyBranchMegaSectionsByBucketOrThrow(byZonal, bucketState.value)
            const realSections = filterPolicyBranchMegaSectionsByMetricOrThrow(byBucket, 'real')
            const noBigSections = filterPolicyBranchMegaSectionsByMetricOrThrow(byBucket, 'no-biggest-liq-loss')

            const comparableSections = Math.min(realSections.length, noBigSections.length)
            if (comparableSections === 0) {
                return { changedRows: 0, totalRows: 0 }
            }

            let changedRows = 0
            let totalRows = 0

            for (let sectionIndex = 0; sectionIndex < comparableSections; sectionIndex++) {
                const realRows = realSections[sectionIndex].rows ?? []
                const noBigRows = noBigSections[sectionIndex].rows ?? []
                const comparableRows = Math.min(realRows.length, noBigRows.length)

                totalRows += comparableRows

                for (let rowIndex = 0; rowIndex < comparableRows; rowIndex++) {
                    if (rowFingerprint(realRows[rowIndex]) !== rowFingerprint(noBigRows[rowIndex])) {
                        changedRows += 1
                    }
                }
            }

            return { changedRows, totalRows }
        } catch {
            return null
        }
    }, [report, resolvedSections, zonalState.error, zonalState.value, bucketState.error, bucketState.value])

    const tabs = useMemo(() => buildPolicyBranchMegaTabsFromSections(filteredSections.sections), [filteredSections.sections])

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
        syncHash: true
    })

    const generatedAtState = useMemo(() => {
        if (!report) return { value: null as Date | null, error: null as Error | null }

        if (!report.generatedAtUtc) {
            return {
                value: null,
                error: new Error('[policy-branch-mega] generatedAtUtc is missing.')
            }
        }

        const parsed = new Date(report.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null,
                error: new Error(`[policy-branch-mega] generatedAtUtc is invalid: ${report.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null }
    }, [report])

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    const renderColumnTitle = (title: string) => {
        const term = getPolicyBranchMegaTermOrThrow(title)
        return renderTermTooltipTitle(title, term.tooltip)
    }

    const handleBucketChange = (next: PolicyBranchMegaBucketMode) => {
        if (next === bucketState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('bucket', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleMetricChange = (next: PolicyBranchMegaMetricMode) => {
        if (next === metricState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('metric', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleTpSlModeChange = (next: PolicyBranchMegaTpSlMode) => {
        if (next === tpSlState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('tpsl', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleZonalModeChange = (next: PolicyBranchMegaZonalMode) => {
        if (next === zonalState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('zonal', next)
        setSearchParams(nextParams, { replace: true })
    }

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

    const metricDiffMessage = useMemo(() => {
        if (!metricDiffState) return null

        if (metricDiffState.totalRows === 0) {
            return 'REAL/NO BIGGEST LIQ LOSS: нет сопоставимых строк для сравнения в выбранном бакете.'
        }

        if (metricDiffState.changedRows === 0) {
            return 'REAL/NO BIGGEST LIQ LOSS: в выбранном бакете строки совпадают (ликвидации не влияют на этот срез).'
        }

        return `REAL/NO BIGGEST LIQ LOSS: изменено ${metricDiffState.changedRows} из ${metricDiffState.totalRows} строк в выбранном бакете.`
    }, [metricDiffState])

    const renderHeader = (generatedUtc: Date) => (
        <header className={cls.hero}>
            <div>
                <Text type='h1' className={cls.heroTitle}>
                    Policy Branch Mega
                </Text>
                <Text className={cls.heroSubtitle}>
                    Самые полные таблицы по каждой политике и ветке (BASE/ANTI‑D) на всей истории с учётом SL. Здесь
                    собраны доходность, риск, восстановление, long/short‑разрез и темпы роста.
                </Text>

                <ReportViewControls
                    bucket={bucketState.value}
                    metric={metricState.value}
                    tpSlMode={tpSlState.value}
                    zonalMode={zonalState.value}
                    capabilities={{
                        supportsBucketFiltering: true,
                        supportsMetricFiltering: true,
                        supportsTpSlFiltering: true,
                        supportsZonalFiltering: true
                    }}
                    onBucketChange={handleBucketChange}
                    onMetricChange={handleMetricChange}
                    onTpSlModeChange={handleTpSlModeChange}
                    onZonalModeChange={handleZonalModeChange}
                    metricDiffMessage={metricDiffMessage}
                />
            </div>

            <ReportActualStatusCard
                statusMode={freshness?.sourceMode === 'actual' ? 'actual' : 'debug'}
                statusTitle={
                    freshness?.sourceMode === 'actual'
                        ? 'ACTUAL: latest verified (for current API source)'
                        : 'DEBUG: freshness not verified'
                }
                statusMessage={freshness?.message}
                statusLagMinutes={
                    freshness?.lagSeconds && freshness.lagSeconds > 0 ? freshness.lagSeconds / 60 : null
                }
                dataSource={sourceEndpointState.value!}
                reportTitle={report!.title}
                reportId={report!.id}
                reportKind={report!.kind}
                generatedAtUtc={report!.generatedAtUtc}
                statusLines={[
                    ...(freshness?.policyBranchMegaId
                        ? [{ label: 'Status policy_branch_mega ID', value: freshness.policyBranchMegaId }]
                        : []),
                    ...(freshness?.diagnosticsId
                        ? [{ label: 'Status diagnostics ID', value: freshness.diagnosticsId }]
                        : []),
                    ...(freshness?.policyBranchMegaGeneratedAtUtc
                        ? [
                              {
                                  label: 'Status policy_branch_mega generatedAt (UTC)',
                                  value: freshness.policyBranchMegaGeneratedAtUtc
                              }
                          ]
                        : []),
                    ...(freshness?.diagnosticsGeneratedAtUtc
                        ? [
                              {
                                  label: 'Status diagnostics generatedAt (UTC)',
                                  value: freshness.diagnosticsGeneratedAtUtc
                              }
                          ]
                        : [])
                ]}
            />
        </header>
    )

    let content: JSX.Element | null = null

    if (report) {
        if (generatedAtState.error || !generatedAtState.value) {
            const error =
                generatedAtState.error ??
                new Error('[policy-branch-mega] generatedAtUtc is missing after validation.')

            content = (
                <PageError
                    title='Отчёт Policy Branch Mega без корректной даты генерации'
                    message='generatedAtUtc отсутствует или невалиден. Проверь сериализацию отчётов.'
                    error={error}
                    onRetry={refetch}
                />
            )
        } else if (sourceEndpointState.error || !sourceEndpointState.value) {
            const error =
                sourceEndpointState.error ??
                new Error('[policy-branch-mega] report source endpoint is missing after validation.')

            content = (
                <PageError
                    title='Policy Branch Mega report source is invalid'
                    message='API source endpoint is missing or invalid. Проверь VITE_API_BASE_URL / VITE_DEV_API_PROXY_TARGET.'
                    error={error}
                    onRetry={refetch}
                />
            )
        } else if (bucketState.error) {
            content = (
                <PageError
                    title='Policy Branch Mega bucket query is invalid'
                    message='Query parameter "bucket" is invalid. Expected daily, intraday, delayed, or total.'
                    error={bucketState.error}
                    onRetry={refetch}
                />
            )
        } else if (metricState.error) {
            content = (
                <PageError
                    title='Policy Branch Mega metric query is invalid'
                    message='Query parameter "metric" is invalid. Expected real or no-biggest-liq-loss.'
                    error={metricState.error}
                    onRetry={refetch}
                />
            )
        } else if (tpSlState.error) {
            content = (
                <PageError
                    title='Policy Branch Mega TP/SL query is invalid'
                    message='Query parameter "tpsl" is invalid. Expected all, dynamic, or static.'
                    error={tpSlState.error}
                    onRetry={refetch}
                />
            )
        } else if (zonalState.error) {
            content = (
                <PageError
                    title='Policy Branch Mega zonal query is invalid'
                    message='Query parameter "zonal" is invalid. Expected with-zonal or without-zonal.'
                    error={zonalState.error}
                    onRetry={refetch}
                />
            )
        } else if (resolvedSections.error) {
            content = (
                <PageError
                    title='Отчёт Policy Branch Mega имеет неверную структуру'
                    message='Секции отчёта не распознаны. Проверь формат заголовков и состав таблиц.'
                    error={resolvedSections.error}
                    onRetry={refetch}
                />
            )
        } else if (filteredSections.error) {
            const generatedUtc = generatedAtState.value
            const isMetricMissing =
                filteredSections.error.message.includes('[policy-branch-mega] no sections found for metric=')

            if (generatedUtc && isMetricMissing) {
                content = (
                    <div className={rootClassName}>
                        {renderHeader(generatedUtc)}
                        <PageError
                            title='Policy Branch Mega sections are missing'
                            message='Report sections for the selected zonal/bucket/metric slice were not found or are tagged inconsistently.'
                            error={filteredSections.error}
                            onRetry={refetch}
                        />
                    </div>
                )
            } else {
                content = (
                    <PageError
                        title='Policy Branch Mega sections are missing'
                        message='Report sections for the selected zonal/bucket/metric slice were not found or are tagged inconsistently.'
                        error={filteredSections.error}
                        onRetry={refetch}
                    />
                )
            }
        } else if (termsState.error) {
            content = (
                <PageError
                    title='Policy Branch Mega terms are invalid'
                    message='Не удалось построить термины для таблиц Policy Branch Mega. Проверь состав колонок и словарь терминов.'
                    error={termsState.error}
                    onRetry={refetch}
                />
            )
        } else if (filteredSections.sections.length === 0) {
            content = (
                <Text>
                    Policy Branch Mega пока пустой для выбранного бакета/режима метрик. Проверь генерацию отчётов на
                    бэкенде.
                </Text>
            )
        } else if (resolvedSections.sections.length === 0) {
            content = <Text>Policy Branch Mega пока пустой. Проверь генерацию отчётов на бэкенде.</Text>
        } else {
            const generatedUtc = generatedAtState.value

            content = (
                <div className={rootClassName}>
                    {renderHeader(generatedUtc)}

                    <ReportTableTermsBlock
                        terms={termsState.terms}
                        subtitle='Подробные определения всех метрик, которые используются в таблицах Policy Branch Mega на этой странице.'
                        className={cls.termsBlock}
                    />

                    <div className={cls.sectionsGrid}>
                        {filteredSections.sections.map((section, index) => {
                            const domId = sectionDomId(index)
                            const title = normalizePolicyBranchMegaTitle(section.title) || section.title
                            const description = resolvePolicyBranchMegaSectionDescription(section.title)

                            return (
                                <SectionErrorBoundary
                                    key={`${section.title}-${index}`}
                                    name={`PolicyBranchMega:${section.title ?? index}`}>
                                    <div className={cls.sectionBlock} id={domId}>
                                        <ReportTableCard
                                            title={title || `Часть ${index + 1}/3`}
                                            description={description ?? undefined}
                                            columns={section.columns ?? []}
                                            rows={section.rows ?? []}
                                            domId={`${domId}-table`}
                                            renderColumnTitle={renderColumnTitle}
                                        />
                                    </div>
                                </SectionErrorBoundary>
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
                </div>
            )
        }
    }

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(report)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить Policy Branch Mega'>
            {content}
        </PageDataBoundary>
    )
}
