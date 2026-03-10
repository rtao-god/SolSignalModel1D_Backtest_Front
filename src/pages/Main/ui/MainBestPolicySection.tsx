import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TermTooltip, Text } from '@/shared/ui'
import { usePolicyBranchMegaReportNavQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import type { TableSectionDto } from '@/shared/types/report.types'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import {
    getPolicyBranchMegaTermOrThrow,
    orderPolicyBranchMegaSectionsOrThrow,
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

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

function columnIndexOrThrow(columns: string[] | undefined, title: string, tag: string): number {
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

function resolveRowByPolicyOrThrow(section: TableSectionDto, key: string, tag: string): string[] {
    const columns = section.columns ?? []
    const rows = section.rows ?? []
    const policyIdx = columnIndexOrThrow(columns, 'Policy', tag)
    const branchIdx = columnIndexOrThrow(columns, 'Branch', tag)
    const rowsByKey = new Map<string, string[]>()

    for (const row of rows) {
        if (!row || row.length <= Math.max(policyIdx, branchIdx)) {
            throw new Error(`[main.demo] ${tag} row is malformed.`)
        }

        const policy = row[policyIdx] ?? ''
        const branch = row[branchIdx] ?? ''
        if (!policy || !branch) {
            throw new Error(`[main.demo] ${tag} row missing Policy or Branch.`)
        }

        const rowKey = buildPolicyBranchKey(policy, branch)
        if (rowsByKey.has(rowKey)) {
            throw new Error(`[main.demo] ${tag} has duplicate policy row for ${rowKey}.`)
        }

        rowsByKey.set(rowKey, row)
    }

    const resolved = rowsByKey.get(key)
    if (!resolved) {
        throw new Error(`[main.demo] ${tag} row not found for ${key}.`)
    }

    return resolved
}

function resolveBestPolicyRowsOrThrow(sections: TableSectionDto[]): BestPolicyRowBundle {
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

    const policyIdx = columnIndexOrThrow(anchorColumns, 'Policy', 'anchor')
    const branchIdx = columnIndexOrThrow(anchorColumns, 'Branch', 'anchor')
    const totalPnlIdx = columnIndexOrThrow(anchorColumns, 'TotalPnl%', 'anchor')

    let bestRow: string[] | null = null
    let bestTotal = -Infinity

    for (const row of anchorRows) {
        if (!row || row.length <= totalPnlIdx) {
            throw new Error('[main.demo] Policy Branch Mega anchor row is malformed.')
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
        throw new Error('[main.demo] Failed to resolve best policy row.')
    }

    const policyName = bestRow[policyIdx] ?? ''
    const branchName = bestRow[branchIdx] ?? ''
    if (!policyName || !branchName) {
        throw new Error('[main.demo] Best policy row missing Policy or Branch.')
    }

    const key = buildPolicyBranchKey(policyName, branchName)

    return {
        policy: policyName,
        branch: branchName,
        totalPnlPct: bestTotal,
        sectionRows: sections.map((section, index) => ({
            section,
            row:
                section === anchorSection ?
                    bestRow
                :   resolveRowByPolicyOrThrow(section, key, `section-${index + 1}`)
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
    const term = getPolicyBranchMegaTermOrThrow(termKey, {
        tooltipMode: 'description',
        locale
    })

    return renderTermTooltipRichText(term.tooltip, {
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
 * Компактная карточка по лучшей строке Policy Branch Mega для главной страницы.
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
            const sections = orderPolicyBranchMegaSectionsOrThrow(buildTableSections(data.sections ?? []))

            return {
                best: resolveBestPolicyRowsOrThrow(sections),
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
            return { items: [] as Array<{ label: string; value: string }>, error: null as Error | null }
        }

        try {
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
                    }
                ],
                error: null as Error | null
            }
        } catch (err) {
            return {
                items: [] as Array<{ label: string; value: string }>,
                error: err instanceof Error ? err : new Error('Failed to build demo meta items.')
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
