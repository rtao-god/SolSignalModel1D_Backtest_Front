import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Link, TermTooltip, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { usePolicyBranchMegaReportNavQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import type { TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import {
    enrichTermTooltipDescription,
    renderTermTooltipRichText,
    renderTermTooltipTitle
} from '@/shared/ui/TermTooltip'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import {
    buildPolicyBranchMegaTermsForColumns,
    getPolicyBranchMegaTermOrThrow,
    orderPolicyBranchMegaSectionsOrThrow,
    resolvePolicyBranchMegaSectionDescription,
    resolvePolicyBranchMegaTermLocale
} from '@/shared/utils/policyBranchMegaTerms'
import { normalizePolicyBranchMegaTitle } from '@/shared/utils/policyBranchMegaTabs'
import { useTranslation } from 'react-i18next'
import cls from './Main.module.scss'
import MainProps from './types'

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

const DEFAULT_POLICY_BRANCH_TAB_ANCHORS = [
    'policy-branch-section-1',
    'policy-branch-section-2',
    'policy-branch-section-3'
] as const
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

    const part2Row = resolveRowByPolicyOrThrow(part2, key, 'part2')
    const part3Row = resolveRowByPolicyOrThrow(part3, key, 'part3')

    return {
        policy: policyName,
        branch: branchName,
        totalPnlPct: bestTotal,
        part1,
        part2,
        part3,
        part1Row: bestRow,
        part2Row,
        part3Row
    }
}
function resolveRowByPolicyOrThrow(section: TableSectionDto, key: string, tag: string): string[] {
    const columns = section.columns ?? []
    const rows = section.rows ?? []

    const policyIdx = columnIndexOrThrow(columns, 'Policy', tag)
    const branchIdx = columnIndexOrThrow(columns, 'Branch', tag)

    const map = new Map<string, string[]>()

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
        if (map.has(rowKey)) {
            throw new Error(`[main] ${tag} has duplicate policy row for ${rowKey}.`)
        }

        map.set(rowKey, row)
    }

    const resolved = map.get(key)
    if (!resolved) {
        throw new Error(`[main] ${tag} row not found for ${key}.`)
    }

    return resolved
}
function resolveMetricValue(bundle: BestPolicyRowBundle, title: string): string {
    const candidates: Array<{ columns: string[]; row: string[] }> = [
        { columns: bundle.part1.columns ?? [], row: bundle.part1Row },
        { columns: bundle.part2.columns ?? [], row: bundle.part2Row },
        { columns: bundle.part3.columns ?? [], row: bundle.part3Row }
    ]

    for (const candidate of candidates) {
        const idx = candidate.columns.indexOf(title)
        if (idx >= 0) {
            if (candidate.row.length <= idx) {
                throw new Error(`[main] metric value is missing for ${title}.`)
            }
            const value = candidate.row[idx]
            if (value === undefined || value === null || value === '') {
                throw new Error(`[main] metric value is empty for ${title}.`)
            }
            return value
        }
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

export default function Main({ className }: MainProps) {
    const { t, i18n } = useTranslation('reports')
    const translate = (key: string, options?: Record<string, unknown>) => t(key, options)
    const termsLocale = useMemo(() => resolvePolicyBranchMegaTermLocale(i18n.language), [i18n.language])
    const rootClassName = classNames(cls.MainPage, {}, [className ?? ''])

    const { data, isError, error, refetch, isLoading } = usePolicyBranchMegaReportNavQuery({ enabled: true })

    const tableSections = useMemo(() => buildTableSections(data?.sections ?? []), [data])

    const megaSectionsState = useMemo(() => {
        if (!data) return { sections: [] as TableSectionDto[], error: null as Error | null }

        try {
            const ordered = orderPolicyBranchMegaSectionsOrThrow(tableSections)
            return { sections: ordered, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega sections.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [data, tableSections])

    const bestPolicyState = useMemo(() => {
        if (!data) return { best: null as BestPolicyRowBundle | null, error: null as Error | null }

        if (megaSectionsState.error) {
            return { best: null as BestPolicyRowBundle | null, error: megaSectionsState.error }
        }

        try {
            const best = resolveBestPolicyRowsOrThrow(megaSectionsState.sections)
            return { best, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to resolve best policy row.')
            return { best: null as BestPolicyRowBundle | null, error: safeError }
        }
    }, [data, megaSectionsState])

    const bestPolicyHighlightsState = useMemo(() => {
        if (!bestPolicyState.best)
            return {
                items: [] as Array<{ title: string; tooltip: string; value: string }>,
                error: null as Error | null
            }

        try {
            const items = [
                'TotalPnl%',
                'TotalPnl$',
                'MaxDD%',
                'Sharpe',
                'Sortino',
                'Calmar',
                'CAGR%',
                'WinRate%',
                'HadLiq'
            ]

            const mapped = items.map(title => {
                const term = getPolicyBranchMegaTermOrThrow(title, {
                    tooltipMode: 'description',
                    locale: termsLocale
                })
                const value = resolveMetricValue(bestPolicyState.best!, title)

                return {
                    title,
                    tooltip: term.tooltip,
                    value
                }
            })

            return { items: mapped, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build best policy highlights.')
            return { items: [] as Array<{ title: string; tooltip: string; value: string }>, error: safeError }
        }
    }, [bestPolicyState.best, termsLocale])

    const bestPolicyMetaState = useMemo(() => {
        if (!bestPolicyState.best)
            return {
                items: [] as Array<{ title: string; tooltip: string; value: string }>,
                error: null as Error | null
            }

        try {
            const items = ['StartDay', 'EndDay', 'Days', 'StopReason']

            const mapped = items.map(title => {
                const term = getPolicyBranchMegaTermOrThrow(title, {
                    tooltipMode: 'description',
                    locale: termsLocale
                })
                const value = resolveMetricValue(bestPolicyState.best!, title)

                return {
                    title,
                    tooltip: term.tooltip,
                    value
                }
            })

            return { items: mapped, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build best policy meta info.')
            return { items: [] as Array<{ title: string; tooltip: string; value: string }>, error: safeError }
        }
    }, [bestPolicyState.best, termsLocale])

    const bestPolicyParts = useMemo(() => {
        if (!bestPolicyState.best) return []

        return [
            {
                id: 'policy-branch-part-1',
                section: bestPolicyState.best.part1,
                row: bestPolicyState.best.part1Row,
                label: t('main.bestPolicy.parts.part1')
            },
            {
                id: 'policy-branch-part-2',
                section: bestPolicyState.best.part2,
                row: bestPolicyState.best.part2Row,
                label: t('main.bestPolicy.parts.part2')
            },
            {
                id: 'policy-branch-part-3',
                section: bestPolicyState.best.part3,
                row: bestPolicyState.best.part3Row,
                label: t('main.bestPolicy.parts.part3')
            }
        ]
    }, [bestPolicyState.best, t])

    const defaultPolicyBranchTabs = useMemo(
        () => [
            { label: t('main.bestPolicy.parts.part1'), anchor: DEFAULT_POLICY_BRANCH_TAB_ANCHORS[0] },
            { label: t('main.bestPolicy.parts.part2'), anchor: DEFAULT_POLICY_BRANCH_TAB_ANCHORS[1] },
            { label: t('main.bestPolicy.parts.part3'), anchor: DEFAULT_POLICY_BRANCH_TAB_ANCHORS[2] }
        ],
        [t]
    )

    const renderColumnTitle = (title: string) => {
        const term = getPolicyBranchMegaTermOrThrow(title, {
            tooltipMode: 'description',
            locale: termsLocale
        })
        return renderTermTooltipTitle(title, enrichTermTooltipDescription(term.tooltip, { term: title }))
    }

    return (
        <div className={rootClassName}>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('main.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('main.hero.subtitle')}</Text>
                <div className={cls.heroMeta}>
                    <div className={cls.metaPill}>{t('main.hero.meta.horizon')}</div>
                    <div className={cls.metaPill}>{t('main.hero.meta.pathLabeling')}</div>
                    <div className={cls.metaPill}>{t('main.hero.meta.multiLayer')}</div>
                    <div className={cls.metaPill}>{t('main.hero.meta.backtest')}</div>
                </div>
            </section>

            <section className={cls.overview}>
                <Text type='h2' className={cls.sectionTitle}>
                    {t('main.overview.title')}
                </Text>
                <div className={cls.overviewGrid}>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.overview.cards.predictions.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.overview.cards.predictions.description')}</Text>
                    </article>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.overview.cards.backtest.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.overview.cards.backtest.description')}</Text>
                    </article>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.overview.cards.diagnostics.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.overview.cards.diagnostics.description')}</Text>
                    </article>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.overview.cards.models.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.overview.cards.models.description')}</Text>
                    </article>
                </div>
            </section>

            <section className={cls.flow}>
                <Text type='h2' className={cls.sectionTitle}>
                    {t('main.flow.title')}
                </Text>
                <Text className={cls.flowSubtitle}>{t('main.flow.subtitle')}</Text>
                <div className={cls.flowRow}>
                    <div className={cls.flowStep}>{t('main.flow.steps.currentPrediction')}</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>{t('main.flow.steps.history')}</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>{t('main.flow.steps.backtestSummary')}</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>{t('main.flow.steps.policyBranchMega')}</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>{t('main.flow.steps.diagnostics')}</div>
                </div>
            </section>

            <SectionErrorBoundary name='MainBestPolicy'>
                <section className={cls.bestPolicy}>
                    <div className={cls.bestPolicyHeader}>
                        <div>
                            <Text type='h2' className={cls.sectionTitle}>
                                {t('main.bestPolicy.title')}
                            </Text>
                            <Text className={cls.bestPolicySubtitle}>{t('main.bestPolicy.subtitle')}</Text>
                        </div>
                        <Link to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]} className={cls.bestPolicyLink}>
                            {t('main.bestPolicy.openMega')}
                        </Link>
                    </div>

                    {isLoading ?
                        <Text>{t('main.bestPolicy.loading')}</Text>
                    : isError ?
                        <ErrorBlock
                            code='NETWORK'
                            title={t('main.bestPolicy.errors.loadTitle')}
                            description={t('main.bestPolicy.errors.loadDescription')}
                            details={error instanceof Error ? error.message : String(error ?? '')}
                            onRetry={refetch}
                        />
                    : megaSectionsState.error ?
                        <ErrorBlock
                            code='DATA'
                            title={t('main.bestPolicy.errors.structureTitle')}
                            description={t('main.bestPolicy.errors.structureDescription')}
                            details={megaSectionsState.error.message}
                        />
                    : bestPolicyState.error ?
                        <ErrorBlock
                            code='DATA'
                            title={t('main.bestPolicy.errors.bestResolveTitle')}
                            description={t('main.bestPolicy.errors.bestResolveDescription')}
                            details={bestPolicyState.error.message}
                        />
                    : bestPolicyState.best ?
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
                                                    description={enrichTermTooltipDescription(item.tooltip, {
                                                        term: item.title
                                                    })}
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
                                                description={enrichTermTooltipDescription(item.tooltip, {
                                                    term: item.title
                                                })}
                                                type='span'
                                            />
                                            <span className={cls.metricValue}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            }

                            <div className={cls.bestPolicyDescription}>
                                {renderPolicyDescription(
                                    bestPolicyState.best.policy,
                                    bestPolicyState.best.branch,
                                    translate
                                ).map(line => (
                                    <Text key={line} className={cls.bestPolicyText}>
                                        {line}
                                    </Text>
                                ))}
                            </div>

                            <div className={cls.bestPolicyTables}>
                                {bestPolicyParts.map(part => {
                                    const terms = buildPolicyBranchMegaTermsForColumns(part.section.columns ?? [], {
                                        tooltipMode: 'description',
                                        locale: termsLocale
                                    })
                                    const description = resolvePolicyBranchMegaSectionDescription(
                                        part.section.title,
                                        termsLocale
                                    )
                                    const normalizedTitle =
                                        normalizePolicyBranchMegaTitle(part.section.title) || part.label

                                    return (
                                        <SectionErrorBoundary key={part.id} name={`BestPolicy:${part.id}`}>
                                            <div className={cls.partBlock}>
                                                <div className={cls.termsBlock} data-tooltip-boundary>
                                                    <div className={cls.termsHeader}>
                                                        <Text type='h3' className={cls.termsTitle}>
                                                            {t('main.bestPolicy.terms.title', { part: part.label })}
                                                        </Text>
                                                        <Text className={cls.termsSubtitle}>
                                                            {description ?? t('main.bestPolicy.terms.subtitleFallback')}
                                                        </Text>
                                                    </div>
                                                    <div className={cls.termsGrid}>
                                                        {terms.map(term => (
                                                            <div
                                                                key={`${part.id}-${term.key}`}
                                                                className={cls.termItem}>
                                                                <Text type='span'>{term.title}</Text>
                                                                <Text className={cls.termDescription}>
                                                                    {renderTermTooltipRichText(term.description, {
                                                                        excludeTerms: [term.title]
                                                                    })}
                                                                </Text>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

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
                        </>
                    :   <Text>{t('main.bestPolicy.empty')}</Text>}
                </section>
            </SectionErrorBoundary>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionTitle}>
                    {t('main.sections.title')}
                </Text>
                <div className={cls.navCards}>
                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.predictions.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.predictions.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION]} className={cls.navLink}>
                                {t('main.sections.cards.predictions.links.currentPrediction')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY]} className={cls.navLink}>
                                {t('main.sections.cards.predictions.links.history')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.backtest.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.backtest.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_SUMMARY]} className={cls.navLink}>
                                {t('main.sections.cards.backtest.links.summary')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_BASELINE]} className={cls.navLink}>
                                {t('main.sections.cards.backtest.links.baseline')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_FULL]} className={cls.navLink}>
                                {t('main.sections.cards.backtest.links.experimental')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.analysis.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.analysis.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_RATINGS]} className={cls.navLink}>
                                {t('main.sections.cards.analysis.links.ratings')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS]} className={cls.navLink}>
                                {t('main.sections.cards.analysis.links.dayStats')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_CONFIDENCE_RISK]} className={cls.navLink}>
                                {t('main.sections.cards.analysis.links.confidence')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]} className={cls.navLink}>
                                {t('main.sections.cards.analysis.links.policyBranchMega')}
                            </Link>
                            <div className={cls.navSublinks}>
                                {defaultPolicyBranchTabs.map(tab => (
                                    <Link
                                        key={tab.anchor}
                                        to={`${ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]}#${tab.anchor}`}
                                        className={cls.navSubLink}>
                                        {tab.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.diagnostics.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.diagnostics.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS]} className={cls.navLink}>
                                {t('main.sections.cards.diagnostics.links.risk')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]} className={cls.navLink}>
                                {t('main.sections.cards.diagnostics.links.guardrail')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]} className={cls.navLink}>
                                {t('main.sections.cards.diagnostics.links.decisions')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]} className={cls.navLink}>
                                {t('main.sections.cards.diagnostics.links.hotspots')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_OTHER]} className={cls.navLink}>
                                {t('main.sections.cards.diagnostics.links.other')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.models.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.models.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.MODELS_STATS]} className={cls.navLink}>
                                {t('main.sections.cards.models.links.modelStats')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.AGGREGATION_STATS]} className={cls.navLink}>
                                {t('main.sections.cards.models.links.aggregation')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.PFI_PER_MODEL]} className={cls.navLink}>
                                {t('main.sections.cards.models.links.pfi')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.docs.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.docs.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.DOCS]} className={cls.navLink}>
                                {t('main.sections.cards.docs.links.docsHome')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.DOCS_MODELS]} className={cls.navLink}>
                                {t('main.sections.cards.docs.links.models')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.DOCS_TESTS]} className={cls.navLink}>
                                {t('main.sections.cards.docs.links.tests')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.explain.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.explain.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.EXPLAIN]} className={cls.navLink}>
                                {t('main.sections.cards.explain.links.explainHome')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.EXPLAIN_MODELS]} className={cls.navLink}>
                                {t('main.sections.cards.explain.links.models')}
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.EXPLAIN_PROJECT]} className={cls.navLink}>
                                {t('main.sections.cards.explain.links.project')}
                            </Link>
                        </div>
                    </article>
                </div>
            </section>
        </div>
    )
}
