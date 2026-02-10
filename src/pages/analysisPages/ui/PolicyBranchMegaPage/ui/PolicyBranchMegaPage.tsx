import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, TermTooltip, Text } from '@/shared/ui'
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
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaMetricFromQuery,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaMetricMode
} from '@/shared/utils/policyBranchMegaTabs'
import cls from './PolicyBranchMegaPage.module.scss'
import type { PolicyBranchMegaPageProps } from './types'
function formatUtc(dt: Date): string {
    const year = dt.getUTCFullYear()
    const month = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const day = String(dt.getUTCDate()).padStart(2, '0')
    const hour = String(dt.getUTCHours()).padStart(2, '0')
    const minute = String(dt.getUTCMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute} UTC`
}
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

const DEFAULT_BUCKET: PolicyBranchMegaBucketMode = 'daily'
const DEFAULT_METRIC: PolicyBranchMegaMetricMode = 'real'

const BUCKET_OPTIONS: Array<{ value: PolicyBranchMegaBucketMode; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'intraday', label: 'Intraday' },
    { value: 'delayed', label: 'Delayed' },
    { value: 'total', label: 'Σ Все бакеты' }
]

const METRIC_OPTIONS: Array<{ value: PolicyBranchMegaMetricMode; label: string }> = [
    { value: 'real', label: 'REAL' },
    { value: 'no-biggest-liq-loss', label: 'NO BIGGEST LIQ LOSS' }
]

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
            const bucket = resolvePolicyBranchMegaBucketFromQuery(searchParams.get('bucket'), DEFAULT_BUCKET)
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega bucket query.')
            return { value: DEFAULT_BUCKET, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(searchParams.get('metric'), DEFAULT_METRIC)
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega metric query.')
            return { value: DEFAULT_METRIC, error: safeError }
        }
    }, [searchParams])

    const filteredSections = useMemo(() => {
        if (!report) return { sections: [] as TableSectionDto[], error: null as Error | null }
        if (resolvedSections.error) {
            return { sections: [] as TableSectionDto[], error: resolvedSections.error }
        }

        try {
            const byBucket = filterPolicyBranchMegaSectionsByBucketOrThrow(resolvedSections.sections, bucketState.value)
            return {
                sections: filterPolicyBranchMegaSectionsByMetricOrThrow(byBucket, metricState.value),
                error: null
            }
        } catch (err) {
            const safeError =
                err instanceof Error
                    ? err
                    : new Error('Failed to filter policy branch mega sections by bucket/metric.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [report, resolvedSections, bucketState.value, metricState.value])

    const metricDiffState = useMemo(() => {
        if (!report || resolvedSections.error || bucketState.error) {
            return null
        }

        try {
            const byBucket = filterPolicyBranchMegaSectionsByBucketOrThrow(resolvedSections.sections, bucketState.value)
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
    }, [report, resolvedSections, bucketState.error, bucketState.value])

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

    const freshnessLabel =
        freshness?.sourceMode === 'actual' ? 'ACTUAL: latest verified' : 'DEBUG: freshness not verified'
    const freshnessLagLabel =
        freshness?.lagSeconds && freshness.lagSeconds > 0
            ? `Lag vs diagnostics: ${Math.round(freshness.lagSeconds / 60)} min`
            : null

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

                <div className={cls.bucketControls}>
                    <Text className={cls.bucketLabel}>Бакет капитала</Text>
                    <div className={cls.bucketButtons}>
                        {BUCKET_OPTIONS.map(option => (
                            <Btn
                                key={option.value}
                                size='sm'
                                className={classNames(
                                    cls.bucketButton,
                                    {
                                        [cls.bucketButtonActive]: option.value === bucketState.value
                                    },
                                    []
                                )}
                                onClick={() => handleBucketChange(option.value)}
                                aria-pressed={option.value === bucketState.value}>
                                {option.label}
                            </Btn>
                        ))}
                    </div>
                </div>

                <div className={cls.bucketControls}>
                    <Text className={cls.bucketLabel}>Режим метрик</Text>
                    <div className={cls.bucketButtons}>
                        {METRIC_OPTIONS.map(option => (
                            <Btn
                                key={option.value}
                                size='sm'
                                className={classNames(
                                    cls.bucketButton,
                                    {
                                        [cls.bucketButtonActive]: option.value === metricState.value
                                    },
                                    []
                                )}
                                onClick={() => handleMetricChange(option.value)}
                                aria-pressed={option.value === metricState.value}>
                                {option.label}
                            </Btn>
                        ))}
                    </div>
                </div>

                {metricDiffState && (
                    <Text className={cls.heroSubtitle}>
                        {metricDiffState.totalRows === 0
                            ? 'REAL/NO BIGGEST LIQ LOSS: нет сопоставимых строк для сравнения в выбранном бакете.'
                            : metricDiffState.changedRows === 0
                              ? 'REAL/NO BIGGEST LIQ LOSS: в выбранном бакете строки совпадают (ликвидации не влияют на этот срез).'
                              : `REAL/NO BIGGEST LIQ LOSS: изменено ${metricDiffState.changedRows} из ${metricDiffState.totalRows} строк в выбранном бакете.`}
                    </Text>
                )}
            </div>

            <div className={cls.meta}>
                <Text
                    className={classNames(
                        cls.freshnessBadge,
                        {
                            [cls.freshnessActual]: freshness?.sourceMode === 'actual',
                            [cls.freshnessDebug]: freshness?.sourceMode !== 'actual'
                        },
                        []
                    )}>
                    {freshnessLabel}
                </Text>
                <Text>{freshness?.message ?? 'Freshness status is unavailable.'}</Text>
                {freshnessLagLabel && <Text>{freshnessLagLabel}</Text>}
                <Text>Report: {report?.title ?? 'n/a'}</Text>
                <Text>Kind: {report?.kind ?? 'n/a'}</Text>
                <Text>Generated (UTC): {formatUtc(generatedUtc)}</Text>
                <Text>Generated (local): {generatedUtc.toLocaleString()}</Text>
            </div>
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
                            message='Report sections for the selected bucket/metric were not found or are tagged inconsistently.'
                            error={filteredSections.error}
                            onRetry={refetch}
                        />
                    </div>
                )
            } else {
                content = (
                    <PageError
                        title='Policy Branch Mega sections are missing'
                        message='Report sections for the selected bucket/metric were not found or are tagged inconsistently.'
                        error={filteredSections.error}
                        onRetry={refetch}
                    />
                )
            }
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

                    <div className={cls.sectionsGrid}>
                        {filteredSections.sections.map((section, index) => {
                            const domId = sectionDomId(index)
                            const title = normalizePolicyBranchMegaTitle(section.title) || section.title
                            const terms = buildPolicyBranchMegaTermsForColumns(section.columns ?? [])
                            const description = resolvePolicyBranchMegaSectionDescription(section.title)

                            return (
                                <SectionErrorBoundary
                                    key={`${section.title}-${index}`}
                                    name={`PolicyBranchMega:${section.title ?? index}`}>
                                    <div className={cls.sectionBlock} id={domId}>
                                        <div className={cls.termsBlock} data-tooltip-boundary>
                                            <div className={cls.termsHeader}>
                                                <Text type='h3' className={cls.termsTitle}>
                                                    Термины таблицы
                                                </Text>
                                                <Text className={cls.termsSubtitle}>
                                                    {description ??
                                                        'Подробные определения всех метрик, которые используются в таблице ниже.'}
                                                </Text>
                                            </div>

                                            <div className={cls.termsGrid}>
                                                {terms.map(term => (
                                                    <div key={`${term.key}-${domId}`} className={cls.termItem}>
                                                        <TermTooltip
                                                            term={term.title}
                                                            description={term.tooltip}
                                                            type='span'
                                                        />
                                                        <Text className={cls.termDescription}>
                                                            {term.description}
                                                        </Text>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

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
