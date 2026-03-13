import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TermTooltip, Text } from '@/shared/ui'
import { usePolicyBranchMegaReportNavQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import type { TableSectionDto } from '@/shared/types/report.types'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import {
    getPolicyBranchMegaTerm,
    orderPolicyBranchMegaSections,
    resolvePolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermLocale
} from '@/shared/utils/policyBranchMegaTerms'
import { localizeReportCellValue } from '@/shared/utils/reportCellLocalization'
import cls from './Main.module.scss'
import { MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY } from './mainPolicyBranchMegaQuery'

interface BestPolicyRowBundle {
    policy: string
    branch: string
    totalPnlPct: number
    sectionRows: Array<{
        section: TableSectionDto
        row: string[]
    }>
}

interface DemoMetricDefinition {
    labelKey: string
    termKey: string
    termTitle: string
}

interface DemoMetaItem {
    label: string
    value: string
}

interface DemoNarrativeSummary {
    paragraphs: string[]
}

const DEMO_METRIC_DEFINITIONS: DemoMetricDefinition[] = [
    { labelKey: 'totalPnl', termKey: 'TotalPnl%', termTitle: 'TotalPnl%' },
    { labelKey: 'bucketNow', termKey: 'BucketNow$', termTitle: 'BucketNow$' },
    { labelKey: 'maxDd', termKey: 'MaxDD%', termTitle: 'MaxDD%' },
    { labelKey: 'liquidations', termKey: 'HadLiq', termTitle: 'HadLiq' },
    { labelKey: 'accountRuin', termKey: 'AccRuin', termTitle: 'AccRuin' },
    { labelKey: 'recovery', termKey: 'RecovDays', termTitle: 'RecovDays' },
    { labelKey: 'winRate', termKey: 'WinRate%', termTitle: 'WinRate%' },
    { labelKey: 'meanRet', termKey: 'MeanRet%', termTitle: 'MeanRet%' },
    { labelKey: 'sharpe', termKey: 'Sharpe', termTitle: 'Sharpe' },
    { labelKey: 'trades', termKey: 'Tr', termTitle: 'Tr' },
    { labelKey: 'tradeShare', termKey: 'Trade%', termTitle: 'Trade%' },
    { labelKey: 'noTrade', termKey: 'NoTrade%', termTitle: 'NoTrade%' }
]

function parseRequiredNumber(rawValue: string, metricTitle: string): number {
    const parsed = tryParseNumberFromString(rawValue)
    if (parsed === null) {
        throw new Error(`[main.demo] ${metricTitle} is not a numeric value: ${rawValue}.`)
    }

    return parsed
}

function formatLocalizedNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[main.demo] Number must be finite. value=${value}.`)
    }

    return new Intl.NumberFormat(locale, options).format(value)
}

function formatLocalizedPercent(value: number, locale: string, maximumFractionDigits = 2): string {
    return `${formatLocalizedNumber(value, locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits
    })}%`
}

function formatLocalizedCompactUsd(value: number, locale: string): string {
    const absValue = Math.abs(value)
    if (absValue >= 1_000_000) {
        return `≈ $${formatLocalizedNumber(value / 1_000_000, locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })}M`
    }

    if (absValue >= 1_000) {
        return `≈ $${formatLocalizedNumber(value / 1_000, locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })}k`
    }

    return `$${formatLocalizedNumber(value, locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`
}

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

function columnIndex(columns: string[] | undefined, title: string, tag: string): number {
    if (!columns || columns.length === 0) {
        throw new Error(`[main.demo] ${tag} columns are empty.`)
    }

    const idx = columns.indexOf(title)
    if (idx < 0) {
        throw new Error(`[main.demo] ${tag} column not found: ${title}.`)
    }

    return idx
}

function buildPolicyBranchKey(policy: string, branch: string): string {
    return `${policy}::${branch}`
}

function resolveRowByPolicy(section: TableSectionDto, key: string, tag: string): string[] {
    const columns = section.columns ?? []
    const rows = section.rows ?? []
    const policyIdx = columnIndex(columns, 'Policy', tag)
    const branchIdx = columnIndex(columns, 'Branch', tag)
    const rowsByKey = new Map<string, string[]>()

    for (const row of rows) {
        if (!row || row.length <= Math.max(policyIdx, branchIdx)) {
            throw new Error(`[main.demo] ${tag} Policy entry is malformed.`)
        }

        const policy = row[policyIdx] ?? ''
        const branch = row[branchIdx] ?? ''
        if (!policy || !branch) {
            throw new Error(`[main.demo] ${tag} Policy entry is missing Policy or Branch.`)
        }

        const rowKey = buildPolicyBranchKey(policy, branch)
        if (rowsByKey.has(rowKey)) {
            throw new Error(`[main.demo] ${tag} has duplicate Policy entry for ${rowKey}.`)
        }

        rowsByKey.set(rowKey, row)
    }

    const resolved = rowsByKey.get(key)
    if (!resolved) {
        throw new Error(`[main.demo] ${tag} Policy entry was not found for ${key}.`)
    }

    return resolved
}

function resolveBestPolicyRows(sections: TableSectionDto[]): BestPolicyRowBundle {
    if (!sections || sections.length === 0) {
        throw new Error('[main.demo] policy branch mega sections are empty.')
    }

    const anchorSection = sections.find(section => (section.columns ?? []).includes('TotalPnl%'))
    if (!anchorSection) {
        throw new Error('[main.demo] Policy Branch Mega anchor section with TotalPnl% is missing.')
    }

    const anchorColumns = anchorSection.columns ?? []
    const anchorRows = anchorSection.rows ?? []
    if (anchorRows.length === 0) {
        throw new Error('[main.demo] Policy Branch Mega anchor section has no rows.')
    }

    const policyIdx = columnIndex(anchorColumns, 'Policy', 'anchor')
    const branchIdx = columnIndex(anchorColumns, 'Branch', 'anchor')
    const totalPnlIdx = columnIndex(anchorColumns, 'TotalPnl%', 'anchor')

    let bestRow: string[] | null = null
    let bestTotal = -Infinity

    for (const row of anchorRows) {
        if (!row || row.length <= totalPnlIdx) {
            throw new Error('[main.demo] Policy Branch Mega anchor Policy entry is malformed.')
        }

        const totalRaw = row[totalPnlIdx]
        const totalParsed = typeof totalRaw === 'string' ? tryParseNumberFromString(totalRaw) : null
        if (totalParsed === null) {
            throw new Error(`[main.demo] TotalPnl% is not a number: ${totalRaw}.`)
        }

        if (bestRow === null || totalParsed > bestTotal) {
            bestRow = row
            bestTotal = totalParsed
        }
    }

    if (!bestRow) {
        throw new Error('[main.demo] Failed to resolve best Policy.')
    }

    const policyName = bestRow[policyIdx] ?? ''
    const branchName = bestRow[branchIdx] ?? ''
    if (!policyName || !branchName) {
        throw new Error('[main.demo] Best Policy is missing Policy or Branch.')
    }

    const key = buildPolicyBranchKey(policyName, branchName)

    return {
        policy: policyName,
        branch: branchName,
        totalPnlPct: bestTotal,
        sectionRows: sections.map((section, index) => ({
            section,
            row: section === anchorSection ? bestRow : resolveRowByPolicy(section, key, `section-${index + 1}`)
        }))
    }
}

function resolveMetricValue(bundle: BestPolicyRowBundle, title: string): string {
    const candidates = bundle.sectionRows.map(item => ({
        columns: item.section.columns ?? [],
        row: item.row
    }))

    for (const candidate of candidates) {
        const idx = candidate.columns.indexOf(title)
        if (idx < 0) {
            continue
        }

        if (candidate.row.length <= idx) {
            throw new Error(`[main.demo] metric value is missing for ${title}.`)
        }

        const value = candidate.row[idx]
        if (value === undefined || value === null || value === '') {
            throw new Error(`[main.demo] metric value is empty for ${title}.`)
        }

        return value
    }

    throw new Error(`[main.demo] metric not found in policy branch mega parts: ${title}.`)
}

function renderPolicyBranchMegaTermTooltip(termKey: string, termTitle: string, locale: PolicyBranchMegaTermLocale) {
    const term = getPolicyBranchMegaTerm(termKey, { locale })

    return renderTermTooltipRichText(term.description, {
        excludeTerms: [termTitle, term.title],
        excludeRuleTitles: [termTitle, term.title]
    })
}

function DemoErrorCard({ title, description, details }: { title: string; description: string; details?: string }) {
    return (
        <div className={cls.cardError}>
            <Text type='p' className={cls.cardErrorTitle}>
                {title}
            </Text>
            <Text className={cls.cardErrorText}>{description}</Text>
            {details && <Text className={cls.cardErrorDetails}>{details}</Text>}
        </div>
    )
}

/**
 * Компактная карточка по лучшей Policy из Policy Branch Mega для главной страницы.
 * Источник данных остаётся тем же, но витрина не тянет таблицы и терм-блоки в первый экран.
 */
export default function MainBestPolicySection() {
    const { t, i18n } = useTranslation('reports')
    const termsLocale = useMemo(() => resolvePolicyBranchMegaTermLocale(i18n.language), [i18n.language])
    const { data, isError, error, isLoading } = usePolicyBranchMegaReportNavQuery(
        { enabled: true },
        MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY
    )

    const bestPolicyState = useMemo(() => {
        if (!data) {
            return { best: null as BestPolicyRowBundle | null, error: null as Error | null }
        }

        try {
            const sections = orderPolicyBranchMegaSections(buildTableSections(data.sections ?? []))

            return {
                best: resolveBestPolicyRows(sections),
                error: null as Error | null
            }
        } catch (err) {
            return {
                best: null as BestPolicyRowBundle | null,
                error: err instanceof Error ? err : new Error('Failed to resolve demo configuration.')
            }
        }
    }, [data])

    const demoMetaState = useMemo(() => {
        if (!bestPolicyState.best) {
            return { items: [] as DemoMetaItem[], error: null as Error | null }
        }

        try {
            const startCapital = formatLocalizedCompactUsd(
                parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'StartCap$'), 'StartCap$'),
                i18n.language
            )
            const finalBalance = formatLocalizedCompactUsd(
                parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'BucketNow$'), 'BucketNow$'),
                i18n.language
            )
            const withdrawnProfit = formatLocalizedCompactUsd(
                parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'Withdrawn$'), 'Withdrawn$'),
                i18n.language
            )
            const totalTrades = formatLocalizedNumber(
                parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'Tr'), 'Tr'),
                i18n.language,
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }
            )

            return {
                items: [
                    {
                        label: t('main.demo.meta.periodStart'),
                        value: localizeReportCellValue(
                            'StartDay',
                            resolveMetricValue(bestPolicyState.best, 'StartDay'),
                            i18n.language
                        )
                    },
                    {
                        label: t('main.demo.meta.periodEnd'),
                        value: localizeReportCellValue(
                            'EndDay',
                            resolveMetricValue(bestPolicyState.best, 'EndDay'),
                            i18n.language
                        )
                    },
                    {
                        label: t('main.demo.meta.days'),
                        value: localizeReportCellValue(
                            'Days',
                            resolveMetricValue(bestPolicyState.best, 'Days'),
                            i18n.language
                        )
                    },
                    {
                        label: t('main.demo.meta.startCapital'),
                        value: startCapital
                    },
                    {
                        label: t('main.demo.meta.finalBalance'),
                        value: finalBalance
                    },
                    {
                        label: t('main.demo.meta.withdrawnProfit'),
                        value: withdrawnProfit
                    },
                    {
                        label: t('main.demo.meta.trades'),
                        value: totalTrades
                    }
                ],
                error: null as Error | null
            }
        } catch (err) {
            return {
                items: [] as DemoMetaItem[],
                error: err instanceof Error ? err : new Error('Failed to build demo meta items.')
            }
        }
    }, [bestPolicyState.best, i18n.language, t])

    const demoSummaryState = useMemo(() => {
        if (!bestPolicyState.best) {
            return { data: null as DemoNarrativeSummary | null, error: null as Error | null }
        }

        try {
            const totalPnlPct = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'TotalPnl%'), 'TotalPnl%')
            const totalPnlUsd = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'TotalPnl$'), 'TotalPnl$')
            const bucketNowUsd = parseRequiredNumber(
                resolveMetricValue(bestPolicyState.best, 'BucketNow$'),
                'BucketNow$'
            )
            const withdrawnUsd = parseRequiredNumber(
                resolveMetricValue(bestPolicyState.best, 'Withdrawn$'),
                'Withdrawn$'
            )
            const startCapitalUsd = parseRequiredNumber(
                resolveMetricValue(bestPolicyState.best, 'StartCap$'),
                'StartCap$'
            )
            const days = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'Days'), 'Days')
            const trades = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'Tr'), 'Tr')
            const noTradePct = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'NoTrade%'), 'NoTrade%')
            const winRatePct = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'WinRate%'), 'WinRate%')
            const maxDdPct = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'MaxDD%'), 'MaxDD%')
            const hadLiqValue = resolveMetricValue(bestPolicyState.best, 'HadLiq').trim().toLowerCase()
            const periodStart = localizeReportCellValue(
                'StartDay',
                resolveMetricValue(bestPolicyState.best, 'StartDay'),
                i18n.language
            )
            const periodEnd = localizeReportCellValue(
                'EndDay',
                resolveMetricValue(bestPolicyState.best, 'EndDay'),
                i18n.language
            )

            let liquidationSentenceKey:
                | 'main.demo.summary.riskNoLiquidations'
                | 'main.demo.summary.riskWithLiquidations'
            if (hadLiqValue === 'no') {
                liquidationSentenceKey = 'main.demo.summary.riskNoLiquidations'
            } else if (hadLiqValue === 'yes') {
                liquidationSentenceKey = 'main.demo.summary.riskWithLiquidations'
            } else {
                throw new Error(`[main.demo] HadLiq must be "yes" or "no". value=${hadLiqValue}.`)
            }

            const tradesPerDay = trades / days

            return {
                data: {
                    paragraphs: [
                        t('main.demo.summary.performance', {
                            policy: bestPolicyState.best.policy,
                            branch: bestPolicyState.best.branch,
                            periodStart,
                            periodEnd,
                            totalPnlPct: formatLocalizedPercent(totalPnlPct, i18n.language, 2),
                            totalPnlUsd: formatLocalizedCompactUsd(totalPnlUsd, i18n.language),
                            startCapitalUsd: formatLocalizedCompactUsd(startCapitalUsd, i18n.language),
                            withdrawnUsd: formatLocalizedCompactUsd(withdrawnUsd, i18n.language),
                            bucketNowUsd: formatLocalizedCompactUsd(bucketNowUsd, i18n.language)
                        }),
                        t('main.demo.summary.activity', {
                            days: formatLocalizedNumber(days, i18n.language, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }),
                            trades: formatLocalizedNumber(trades, i18n.language, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }),
                            tradesPerDay: formatLocalizedNumber(tradesPerDay, i18n.language, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                            }),
                            noTradePct: formatLocalizedPercent(noTradePct, i18n.language, 1)
                        }),
                        t('main.demo.summary.winRate', {
                            winRatePct: formatLocalizedPercent(winRatePct, i18n.language, 1)
                        }),
                        t(liquidationSentenceKey, {
                            maxDdPct: formatLocalizedPercent(maxDdPct, i18n.language, 2)
                        })
                    ]
                },
                error: null as Error | null
            }
        } catch (err) {
            return {
                data: null as DemoNarrativeSummary | null,
                error: err instanceof Error ? err : new Error('Failed to build demo summary.')
            }
        }
    }, [bestPolicyState.best, i18n.language, t])

    const demoMetricsState = useMemo(() => {
        if (!bestPolicyState.best) {
            return {
                items: [] as Array<{ label: string; termKey: string; termTitle: string; value: string }>,
                error: null as Error | null
            }
        }

        try {
            const bestPolicy = bestPolicyState.best
            if (!bestPolicy) {
                throw new Error('[main.demo] Best policy is missing while building demo metrics.')
            }

            return {
                items: DEMO_METRIC_DEFINITIONS.map(definition => ({
                    label: t(`main.demo.metrics.${definition.labelKey}`),
                    termKey: definition.termKey,
                    termTitle: definition.termTitle,
                    value: localizeReportCellValue(
                        definition.termKey,
                        resolveMetricValue(bestPolicy, definition.termKey),
                        i18n.language
                    )
                })),
                error: null as Error | null
            }
        } catch (err) {
            return {
                items: [] as Array<{ label: string; termKey: string; termTitle: string; value: string }>,
                error: err instanceof Error ? err : new Error('Failed to build demo metrics.')
            }
        }
    }, [bestPolicyState.best, i18n.language, t])

    if (isLoading) {
        return <Text className={cls.cardStatus}>{t('main.demo.loading')}</Text>
    }

    if (isError) {
        return (
            <DemoErrorCard
                title={t('main.demo.errors.loadTitle')}
                description={t('main.demo.errors.loadDescription')}
                details={error instanceof Error ? error.message : String(error ?? '')}
            />
        )
    }

    if (bestPolicyState.error) {
        return (
            <DemoErrorCard
                title={t('main.demo.errors.structureTitle')}
                description={t('main.demo.errors.structureDescription')}
                details={bestPolicyState.error.message}
            />
        )
    }

    if (!bestPolicyState.best) {
        return <Text className={cls.cardStatus}>{t('main.demo.empty')}</Text>
    }

    return (
        <div className={cls.demoCard}>
            <div className={cls.demoCardHeader}>
                <div>
                    <Text type='h3' className={cls.demoName}>
                        {renderTermTooltipRichText(`${bestPolicyState.best.policy} / ${bestPolicyState.best.branch}`)}
                    </Text>
                    <Text className={cls.demoResult}>
                        {renderTermTooltipRichText(
                            t('main.demo.bestResult', {
                                value: bestPolicyState.best.totalPnlPct.toFixed(2)
                            })
                        )}
                    </Text>
                </div>

                {demoMetaState.error ?
                    <DemoErrorCard
                        title={t('main.demo.errors.metaTitle')}
                        description={t('main.demo.errors.metaDescription')}
                        details={demoMetaState.error.message}
                    />
                :   <div className={cls.demoMeta}>
                        {demoMetaState.items.map(item => (
                            <div key={item.label} className={cls.demoMetaItem}>
                                <span className={cls.demoMetaLabel}>{item.label}</span>
                                <span className={cls.demoMetaValue}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                }
            </div>

            {demoSummaryState.error ?
                <DemoErrorCard
                    title={t('main.demo.errors.summaryTitle')}
                    description={t('main.demo.errors.summaryDescription')}
                    details={demoSummaryState.error.message}
                />
            : demoSummaryState.data ?
                <div className={cls.demoSummary}>
                    {demoSummaryState.data.paragraphs.map((paragraph, index) => (
                        <Text key={`main-demo-summary-${index}`} className={cls.demoSummaryText}>
                            {renderTermTooltipRichText(paragraph)}
                        </Text>
                    ))}
                </div>
            :   null}

            {demoMetricsState.error ?
                <DemoErrorCard
                    title={t('main.demo.errors.metricsTitle')}
                    description={t('main.demo.errors.metricsDescription')}
                    details={demoMetricsState.error.message}
                />
            :   <div className={cls.demoMetricGrid}>
                    {demoMetricsState.items.map(item => (
                        <div key={item.termKey} className={cls.demoMetricCard}>
                            <TermTooltip
                                term={item.label}
                                description={() =>
                                    renderPolicyBranchMegaTermTooltip(item.termKey, item.termTitle, termsLocale)
                                }
                                type='span'
                            />
                            <span className={cls.demoMetricValue}>{item.value}</span>
                        </div>
                    ))}
                </div>
            }

            <Text className={cls.demoNote}>{renderTermTooltipRichText(t('main.demo.note'))}</Text>
        </div>
    )
}
