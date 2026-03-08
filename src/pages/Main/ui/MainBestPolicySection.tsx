import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ReportTableCard, ReportTableTermsBlock, TermTooltip, Text } from '@/shared/ui'
import { usePolicyBranchMegaReportNavQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import type { TableSectionDto } from '@/shared/types/report.types'
import { renderTermTooltipRichText, renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import {
    buildPolicyBranchMegaTermReferencesForColumns,
    getPolicyBranchMegaTermOrThrow,
    orderPolicyBranchMegaSectionsOrThrow,
    resolvePolicyBranchMegaSectionDescription,
    resolvePolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermReference
} from '@/shared/utils/policyBranchMegaTerms'
import { normalizePolicyBranchMegaTitle } from '@/shared/utils/policyBranchMegaTabs'
import cls from './Main.module.scss'

interface BestPolicyRowBundle {
    policy: string
    branch: string
    totalPnlPct: number
    part1: TableSectionDto
    part2: TableSectionDto
    part3: TableSectionDto
    part1Row: string[]
    part2Row: string[]
    part3Row: string[]
}

interface BestPolicyPartViewModel {
    id: string
    section: TableSectionDto
    row: string[]
    label: string
    terms: PolicyBranchMegaTermReference[]
}

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

function columnIndexOrThrow(columns: string[] | undefined, title: string, tag: string): number {
    if (!columns || columns.length === 0) {
        throw new Error(`[main] ${tag} columns are empty.`)
    }

    const idx = columns.indexOf(title)
    if (idx < 0) {
        throw new Error(`[main] ${tag} column not found: ${title}.`)
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
            throw new Error(`[main] ${tag} row is malformed.`)
        }

        const policy = row[policyIdx] ?? ''
        const branch = row[branchIdx] ?? ''
        if (!policy || !branch) {
            throw new Error(`[main] ${tag} row missing Policy or Branch.`)
        }

        const rowKey = buildPolicyBranchKey(policy, branch)
        if (rowsByKey.has(rowKey)) {
            throw new Error(`[main] ${tag} has duplicate policy row for ${rowKey}.`)
        }

        rowsByKey.set(rowKey, row)
    }

    const resolved = rowsByKey.get(key)
    if (!resolved) {
        throw new Error(`[main] ${tag} row not found for ${key}.`)
    }

    return resolved
}

function resolveBestPolicyRowsOrThrow(sections: TableSectionDto[]): BestPolicyRowBundle {
    if (!sections || sections.length < 3) {
        throw new Error('[main] policy branch mega sections count is less than 3.')
    }

    const [part1, part2, part3] = sections
    const part1Columns = part1.columns ?? []
    const part1Rows = part1.rows ?? []

    if (part1Rows.length === 0) {
        throw new Error('[main] Policy Branch Mega Part 1 has no rows.')
    }

    const policyIdx = columnIndexOrThrow(part1Columns, 'Policy', 'part1')
    const branchIdx = columnIndexOrThrow(part1Columns, 'Branch', 'part1')
    const totalPnlIdx = columnIndexOrThrow(part1Columns, 'TotalPnl%', 'part1')

    let bestRow: string[] | null = null
    let bestTotal = -Infinity

    for (const row of part1Rows) {
        if (!row || row.length <= totalPnlIdx) {
            throw new Error('[main] Policy Branch Mega Part 1 row is malformed.')
        }

        const totalRaw = row[totalPnlIdx]
        const totalParsed = typeof totalRaw === 'string' ? tryParseNumberFromString(totalRaw) : null
        if (totalParsed === null) {
            throw new Error(`[main] TotalPnl% is not a number: ${totalRaw}`)
        }

        if (bestRow === null || totalParsed > bestTotal) {
            bestRow = row
            bestTotal = totalParsed
        }
    }

    if (!bestRow) {
        throw new Error('[main] Failed to resolve best policy row.')
    }

    const policyName = bestRow[policyIdx] ?? ''
    const branchName = bestRow[branchIdx] ?? ''

    if (!policyName || !branchName) {
        throw new Error('[main] Best policy row missing Policy or Branch.')
    }

    const key = buildPolicyBranchKey(policyName, branchName)

    return {
        policy: policyName,
        branch: branchName,
        totalPnlPct: bestTotal,
        part1,
        part2,
        part3,
        part1Row: bestRow,
        part2Row: resolveRowByPolicyOrThrow(part2, key, 'part2'),
        part3Row: resolveRowByPolicyOrThrow(part3, key, 'part3')
    }
}

function resolveMetricValue(bundle: BestPolicyRowBundle, title: string): string {
    const candidates: Array<{ columns: string[]; row: string[] }> = [
        { columns: bundle.part1.columns ?? [], row: bundle.part1Row },
        { columns: bundle.part2.columns ?? [], row: bundle.part2Row },
        { columns: bundle.part3.columns ?? [], row: bundle.part3Row }
    ]

    for (const candidate of candidates) {
        const idx = candidate.columns.indexOf(title)
        if (idx < 0) {
            continue
        }

        if (candidate.row.length <= idx) {
            throw new Error(`[main] metric value is missing for ${title}.`)
        }

        const value = candidate.row[idx]
        if (value === undefined || value === null || value === '') {
            throw new Error(`[main] metric value is empty for ${title}.`)
        }

        return value
    }

    throw new Error(`[main] metric not found in policy branch mega parts: ${title}.`)
}

function renderPolicyDescription(
    policyName: string,
    branchName: string,
    translate: (key: string, options?: Record<string, unknown>) => string
): string[] {
    const description: string[] = []

    if (policyName.toLowerCase().includes('spot_conf_cap')) {
        description.push(translate('main.bestPolicy.description.spotConfCap.capFraction'))
        description.push(translate('main.bestPolicy.description.spotConfCap.leverage'))
    } else {
        description.push(translate('main.bestPolicy.description.nonSpot'))
    }

    description.push(translate('main.bestPolicy.description.branchRule', { branchName }))

    return description
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

/**
 * Deferred-блок для главной: монтируется только после первого paint/idle warmup,
 * чтобы heavy report parsing, таблицы и термы не попадали в critical path главной.
 */
export default function MainBestPolicySection() {
    const { t, i18n } = useTranslation('reports')
    const termsLocale = useMemo(() => resolvePolicyBranchMegaTermLocale(i18n.language), [i18n.language])
    const translate = useCallback((key: string, options?: Record<string, unknown>) => t(key, options), [t])
    const { data, isError, error, refetch, isLoading } = usePolicyBranchMegaReportNavQuery({ enabled: true })

    const tableSections = useMemo(() => buildTableSections(data?.sections ?? []), [data])

    const megaSectionsState = useMemo(() => {
        if (!data) {
            return { sections: [] as TableSectionDto[], error: null as Error | null }
        }

        try {
            return {
                sections: orderPolicyBranchMegaSectionsOrThrow(tableSections),
                error: null as Error | null
            }
        } catch (err) {
            return {
                sections: [] as TableSectionDto[],
                error: err instanceof Error ? err : new Error('Failed to parse policy branch mega sections.')
            }
        }
    }, [data, tableSections])

    const bestPolicyState = useMemo(() => {
        if (!data) {
            return { best: null as BestPolicyRowBundle | null, error: null as Error | null }
        }

        if (megaSectionsState.error) {
            return { best: null as BestPolicyRowBundle | null, error: megaSectionsState.error }
        }

        try {
            return {
                best: resolveBestPolicyRowsOrThrow(megaSectionsState.sections),
                error: null as Error | null
            }
        } catch (err) {
            return {
                best: null as BestPolicyRowBundle | null,
                error: err instanceof Error ? err : new Error('Failed to resolve best policy row.')
            }
        }
    }, [data, megaSectionsState])

    const bestPolicyHighlightsState = useMemo(() => {
        if (!bestPolicyState.best) {
            return {
                items: [] as Array<{ title: string; value: string }>,
                error: null as Error | null
            }
        }

        try {
            return {
                items: [
                    'TotalPnl%',
                    'TotalPnl$',
                    'MaxDD%',
                    'Sharpe',
                    'Sortino',
                    'Calmar',
                    'CAGR%',
                    'WinRate%',
                    'HadLiq'
                ].map(title => ({
                    title,
                    value: resolveMetricValue(bestPolicyState.best!, title)
                })),
                error: null as Error | null
            }
        } catch (err) {
            return {
                items: [] as Array<{ title: string; value: string }>,
                error: err instanceof Error ? err : new Error('Failed to build best policy highlights.')
            }
        }
    }, [bestPolicyState.best])

    const bestPolicyMetaState = useMemo(() => {
        if (!bestPolicyState.best) {
            return {
                items: [] as Array<{ title: string; value: string }>,
                error: null as Error | null
            }
        }

        try {
            return {
                items: ['StartDay', 'EndDay', 'Days', 'StopReason'].map(title => ({
                    title,
                    value: resolveMetricValue(bestPolicyState.best!, title)
                })),
                error: null as Error | null
            }
        } catch (err) {
            return {
                items: [] as Array<{ title: string; value: string }>,
                error: err instanceof Error ? err : new Error('Failed to build best policy meta info.')
            }
        }
    }, [bestPolicyState.best])

    const bestPolicyPartsState = useMemo(() => {
        if (!bestPolicyState.best) {
            return {
                parts: [] as BestPolicyPartViewModel[],
                error: null as Error | null
            }
        }

        try {
            return {
                parts: [
                    {
                        id: 'policy-branch-part-1',
                        section: bestPolicyState.best.part1,
                        row: bestPolicyState.best.part1Row,
                        label: t('main.bestPolicy.parts.part1'),
                        terms: buildPolicyBranchMegaTermReferencesForColumns(bestPolicyState.best.part1.columns ?? [])
                    },
                    {
                        id: 'policy-branch-part-2',
                        section: bestPolicyState.best.part2,
                        row: bestPolicyState.best.part2Row,
                        label: t('main.bestPolicy.parts.part2'),
                        terms: buildPolicyBranchMegaTermReferencesForColumns(bestPolicyState.best.part2.columns ?? [])
                    },
                    {
                        id: 'policy-branch-part-3',
                        section: bestPolicyState.best.part3,
                        row: bestPolicyState.best.part3Row,
                        label: t('main.bestPolicy.parts.part3'),
                        terms: buildPolicyBranchMegaTermReferencesForColumns(bestPolicyState.best.part3.columns ?? [])
                    }
                ],
                error: null as Error | null
            }
        } catch (err) {
            return {
                parts: [] as BestPolicyPartViewModel[],
                error: err instanceof Error ? err : new Error('Failed to build best policy parts.')
            }
        }
    }, [bestPolicyState.best, t])

    const renderColumnTitle = useCallback(
        (title: string) => renderTermTooltipTitle(title, () => renderPolicyBranchMegaTermTooltip(title, title, termsLocale)),
        [termsLocale]
    )

    if (isLoading) {
        return <Text>{t('main.bestPolicy.loading')}</Text>
    }

    if (isError) {
        return (
            <ErrorBlock
                code='NETWORK'
                title={t('main.bestPolicy.errors.loadTitle')}
                description={t('main.bestPolicy.errors.loadDescription')}
                details={error instanceof Error ? error.message : String(error ?? '')}
                onRetry={refetch}
            />
        )
    }

    if (megaSectionsState.error) {
        return (
            <ErrorBlock
                code='DATA'
                title={t('main.bestPolicy.errors.structureTitle')}
                description={t('main.bestPolicy.errors.structureDescription')}
                details={megaSectionsState.error.message}
            />
        )
    }

    if (bestPolicyState.error) {
        return (
            <ErrorBlock
                code='DATA'
                title={t('main.bestPolicy.errors.bestResolveTitle')}
                description={t('main.bestPolicy.errors.bestResolveDescription')}
                details={bestPolicyState.error.message}
            />
        )
    }

    if (!bestPolicyState.best) {
        return <Text>{t('main.bestPolicy.empty')}</Text>
    }

    return (
        <>
            <div className={cls.bestPolicyHero}>
                <div>
                    <Text type='h3' className={cls.bestPolicyName}>
                        {bestPolicyState.best.policy} / {bestPolicyState.best.branch}
                    </Text>
                    <Text className={cls.bestPolicyNote}>
                        {t('main.bestPolicy.bestResult', {
                            value: bestPolicyState.best.totalPnlPct.toFixed(2)
                        })}
                    </Text>
                </div>

                {bestPolicyMetaState.error ?
                    <ErrorBlock
                        code='DATA'
                        title={t('main.bestPolicy.errors.metaTitle')}
                        description={t('main.bestPolicy.errors.metaDescription')}
                        details={bestPolicyMetaState.error.message}
                    />
                :   <div className={cls.bestPolicyMeta}>
                        {bestPolicyMetaState.items.map(item => (
                            <div key={item.title} className={cls.bestPolicyMetaItem}>
                                <TermTooltip
                                    term={item.title}
                                    description={() => renderPolicyBranchMegaTermTooltip(item.title, item.title, termsLocale)}
                                    type='span'
                                />
                                <span className={cls.bestPolicyMetaValue}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                }
            </div>

            {bestPolicyHighlightsState.error ?
                <ErrorBlock
                    code='DATA'
                    title={t('main.bestPolicy.errors.highlightsTitle')}
                    description={t('main.bestPolicy.errors.highlightsDescription')}
                    details={bestPolicyHighlightsState.error.message}
                />
            :   <div className={cls.bestPolicyMetrics}>
                    {bestPolicyHighlightsState.items.map(item => (
                        <div key={item.title} className={cls.metricCard}>
                            <TermTooltip
                                term={item.title}
                                description={() => renderPolicyBranchMegaTermTooltip(item.title, item.title, termsLocale)}
                                type='span'
                            />
                            <span className={cls.metricValue}>{item.value}</span>
                        </div>
                    ))}
                </div>
            }

            <div className={cls.bestPolicyDescription}>
                {renderPolicyDescription(bestPolicyState.best.policy, bestPolicyState.best.branch, translate).map(line => (
                    <Text key={line} className={cls.bestPolicyText}>
                        {line}
                    </Text>
                ))}
            </div>

            {bestPolicyPartsState.error ?
                <ErrorBlock
                    code='DATA'
                    title={t('main.bestPolicy.errors.structureTitle')}
                    description={t('main.bestPolicy.errors.structureDescription')}
                    details={bestPolicyPartsState.error.message}
                />
            :   <div className={cls.bestPolicyTables}>
                    {bestPolicyPartsState.parts.map(part => {
                        const description = resolvePolicyBranchMegaSectionDescription(part.section.title, termsLocale)
                        const normalizedTitle = normalizePolicyBranchMegaTitle(part.section.title) || part.label

                        return (
                            <SectionErrorBoundary key={part.id} name={`BestPolicy:${part.id}`}>
                                <div className={cls.partBlock}>
                                    <ReportTableTermsBlock
                                        terms={part.terms.map(term => ({
                                            key: term.key,
                                            title: term.title,
                                            resolveTooltip: () => {
                                                const resolved = getPolicyBranchMegaTermOrThrow(term.key, {
                                                    tooltipMode: 'description',
                                                    locale: termsLocale
                                                })

                                                return resolved.tooltip
                                            }
                                        }))}
                                        enhanceDomainTerms
                                        displayMode='tooltipOnly'
                                        title={t('main.bestPolicy.terms.title', { part: part.label })}
                                        subtitle={description ?? t('main.bestPolicy.terms.subtitleFallback')}
                                        className={cls.termsBlock}
                                    />

                                    <ReportTableCard
                                        title={normalizedTitle}
                                        description={description ?? undefined}
                                        columns={part.section.columns ?? []}
                                        rows={[part.row]}
                                        domId={part.id}
                                        renderColumnTitle={renderColumnTitle}
                                    />
                                </div>
                            </SectionErrorBoundary>
                        )
                    })}
                </div>
            }
        </>
    )
}
