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
import { usePolicyBranchMegaReportQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import {
    buildPolicyBranchMegaTermsForColumns,
    getPolicyBranchMegaTermOrThrow,
    orderPolicyBranchMegaSectionsOrThrow,
    resolvePolicyBranchMegaSectionDescription
} from '@/shared/utils/policyBranchMegaTerms'
import {
    buildPolicyBranchMegaTabsFromSections,
    filterPolicyBranchMegaSectionsByBucketOrThrow,
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaBucketFromQuery,
    type PolicyBranchMegaBucketMode
} from '@/shared/utils/policyBranchMegaTabs'
import cls from './PolicyBranchMegaPage.module.scss'
import type { PolicyBranchMegaPageProps } from './types'

/*
    PolicyBranchMegaPage — страница трёх mega-таблиц по политикам и веткам.

    Зачем:
        - Показывает самый полный набор метрик (доходность, риск, устойчивость, recovery).
        - Даёт подробные определения терминов прямо перед каждой таблицей.

    Источники данных и сайд-эффекты:
        - usePolicyBranchMegaReportQuery() (TanStack Query).
        - useSectionPager({ syncHash: true }) синхронизирует якоря секций.

    Контракты:
        - Отчёт обязан содержать секции Policy Branch Mega [PART 1/3..3/3].
        - Колонки секций должны быть описаны в policyBranchMegaTerms.
*/

// Форматируем UTC-дату для мета-блока отчёта.
function formatUtc(dt: Date): string {
    const year = dt.getUTCFullYear()
    const month = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const day = String(dt.getUTCDate()).padStart(2, '0')
    const hour = String(dt.getUTCHours()).padStart(2, '0')
    const minute = String(dt.getUTCMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute} UTC`
}

// Фильтр секций: берём только те, где реально есть колонки (и значит таблица валидна).
function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

// Якорь секции для hash-навигации (sidebar + SectionPager).
function sectionDomId(index: number): string {
    return `policy-branch-section-${index + 1}`
}

const DEFAULT_BUCKET: PolicyBranchMegaBucketMode = 'daily'

const BUCKET_OPTIONS: Array<{ value: PolicyBranchMegaBucketMode; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'intraday', label: 'Intraday' },
    { value: 'delayed', label: 'Delayed' },
    { value: 'total', label: 'Σ Все бакеты' }
]

export default function PolicyBranchMegaPage({ className }: PolicyBranchMegaPageProps) {
    const [searchParams, setSearchParams] = useSearchParams()
    const { data, isError, error, refetch } = usePolicyBranchMegaReportQuery()

    const tableSections = useMemo(() => buildTableSections(data?.sections ?? []), [data])

    const resolvedSections = useMemo(() => {
        if (!data) return { sections: [] as TableSectionDto[], error: null as Error | null }

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
    }, [data, tableSections])

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(searchParams.get('bucket'), DEFAULT_BUCKET)
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega bucket query.')
            return { value: DEFAULT_BUCKET, error: safeError }
        }
    }, [searchParams])

    const bucketSections = useMemo(() => {
        if (!data) return { sections: [] as TableSectionDto[], error: null as Error | null }
        if (resolvedSections.error) {
            return { sections: [] as TableSectionDto[], error: resolvedSections.error }
        }

        try {
            return {
                sections: filterPolicyBranchMegaSectionsByBucketOrThrow(resolvedSections.sections, bucketState.value),
                error: null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to filter policy branch mega sections by bucket.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [data, resolvedSections, bucketState.value])

    const tabs = useMemo(() => buildPolicyBranchMegaTabsFromSections(bucketSections.sections), [bucketSections.sections])

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
        syncHash: true
    })

    const generatedAtState = useMemo(() => {
        if (!data) return { value: null as Date | null, error: null as Error | null }

        if (!data.generatedAtUtc) {
            return {
                value: null,
                error: new Error('[policy-branch-mega] generatedAtUtc is missing.')
            }
        }

        const parsed = new Date(data.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null,
                error: new Error(`[policy-branch-mega] generatedAtUtc is invalid: ${data.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null }
    }, [data])

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

    let content: JSX.Element | null = null

    if (data) {
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
        } else if (resolvedSections.error) {
            content = (
                <PageError
                    title='Отчёт Policy Branch Mega имеет неверную структуру'
                    message='Секции отчёта не распознаны. Проверь формат заголовков и состав таблиц.'
                    error={resolvedSections.error}
                    onRetry={refetch}
                />
            )
        } else if (bucketSections.error) {
            content = (
                <PageError
                    title='Policy Branch Mega bucket sections are missing'
                    message='Report sections for the selected bucket were not found or are tagged inconsistently.'
                    error={bucketSections.error}
                    onRetry={refetch}
                />
            )
        } else if (bucketSections.sections.length === 0) {
            content = (
                <Text>
                    Policy Branch Mega пока пустой для выбранного бакета. Проверь генерацию отчётов на бэкенде.
                </Text>
            )
        } else if (resolvedSections.sections.length === 0) {
            content = <Text>Policy Branch Mega пока пустой. Проверь генерацию отчётов на бэкенде.</Text>
        } else {
            const generatedUtc = generatedAtState.value

            content = (
                <div className={rootClassName}>
                    <header className={cls.hero}>
                        <div>
                            <Text type='h1' className={cls.heroTitle}>
                                Policy Branch Mega
                            </Text>
                            <Text className={cls.heroSubtitle}>
                                Самые полные таблицы по каждой политике и ветке (BASE/ANTI‑D) на всей истории с учётом
                                SL. Здесь собраны доходность, риск, восстановление, long/short‑разрез и темпы роста.
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
                        </div>

                        <div className={cls.meta}>
                            <Text>Report: {data.title}</Text>
                            <Text>Kind: {data.kind}</Text>
                            <Text>Generated (UTC): {formatUtc(generatedUtc)}</Text>
                            <Text>Generated (local): {generatedUtc.toLocaleString()}</Text>
                        </div>
                    </header>

                    <div className={cls.sectionsGrid}>
                        {bucketSections.sections.map((section, index) => {
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
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить Policy Branch Mega'>
            {content}
        </PageDataBoundary>
    )
}
