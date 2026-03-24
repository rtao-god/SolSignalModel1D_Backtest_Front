import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { BulletList } from '@/shared/ui/BulletList'
import { TermTooltip, Text } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import {
    fetchPolicyBranchMegaReport,
    usePolicyBranchMegaReportQuery
} from '@/shared/api/tanstackQueries/policyBranchMega'
import {
    getPolicyBranchMegaTerm,
    resolvePolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermLocale
} from '@/shared/utils/policyBranchMegaTerms'
import { localizeReportCellValue } from '@/shared/utils/reportCellLocalization'
import {
    buildMainDemoPolicyBranchMegaSections,
    resolveMainDemoBestPolicyRows,
    type MainBestPolicyRowBundle
} from './mainBestPolicySectionModel'
import cls from './Main.module.scss'
import { MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY } from './mainPolicyBranchMegaQuery'

interface DemoMetricDefinition {
    labelKey:
        | 'totalPnl'
        | 'bucketNow'
        | 'maxDd'
        | 'liquidations'
        | 'accountRuin'
        | 'recovery'
        | 'winRate'
        | 'meanRet'
        | 'sharpe'
        | 'trades'
        | 'tradeShare'
        | 'noTrade'
    termKey: string
    termTitle: string
}

interface DemoMetaItem {
    label: string
    value: string
}

interface DemoNarrativeSummary {
    items: string[]
    verdictProsItems: string[]
    verdictConsItems: string[]
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

function parseCompositeAverageValue(rawValue: string, metricTitle: string): number | null {
    const normalized = rawValue.trim()
    if (!normalized || normalized === '—' || normalized === 'нет данных' || normalized === 'no data') {
        return null
    }

    const [firstToken] = normalized
        .split('/')
        .map(token => token.trim())
        .filter(token => token.length > 0)

    if (!firstToken) {
        return null
    }

    const parsed = tryParseNumberFromString(firstToken)
    if (parsed === null) {
        throw new Error(`[main.demo] ${metricTitle} avg token is not numeric: ${rawValue}.`)
    }

    return parsed
}

function resolveMainDemoHeadingKey(policyName: string): 'main.demo.headings.spot' | 'main.demo.headings.generic' {
    return policyName.trim().toLowerCase().startsWith('spot_') ?
            'main.demo.headings.spot'
        :   'main.demo.headings.generic'
}

function resolveMainDemoPolicySummaryKey(
    policyName: string
): 'main.demo.summary.policyTypeSpot' | 'main.demo.summary.policyTypeGeneric' {
    return policyName.trim().toLowerCase().startsWith('spot_') ?
            'main.demo.summary.policyTypeSpot'
        :   'main.demo.summary.policyTypeGeneric'
}

function resolveMetricValue(bundle: MainBestPolicyRowBundle, title: string): string {
    for (const item of bundle.sectionRows) {
        const columns = item.section.columns ?? []
        const index = columns.indexOf(title)
        if (index < 0) {
            continue
        }

        const value = item.row[index]
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(`[main.demo] metric value is empty for ${title}.`)
        }

        return value
    }

    throw new Error(`[main.demo] metric not found in policy branch mega report: ${title}.`)
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
 * Карточка лучшей Policy для главной страницы.
 * Блок собирает narrative summary и ключевые метрики из опубликованных частей отчёта,
 * но не рендерит саму mega-таблицу и графики.
 */
export default function MainBestPolicySection() {
    const { t, i18n } = useTranslation('reports')
    const termsLocale = useMemo(() => resolvePolicyBranchMegaTermLocale(i18n.language), [i18n.language])
    const primaryQueryArgs = useMemo(
        () => ({
            ...MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY,
            part: 1
        }),
        []
    )
    const {
        data: primaryPayload,
        isError: isPrimaryError,
        error: primaryError,
        isLoading: isPrimaryLoading
    } = usePolicyBranchMegaReportQuery(primaryQueryArgs, { enabled: true })
    const remainingPartQueries = useQueries({
        queries:
            primaryPayload?.capabilities.availableParts
                .filter(part => part !== 1)
                .map(part => ({
                    queryKey: ['main', 'demo', 'policy-branch-mega', part] as const,
                    queryFn: () =>
                        fetchPolicyBranchMegaReport({
                            ...MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY,
                            part
                        }),
                    staleTime: 2 * 60 * 1000,
                    gcTime: 15 * 60 * 1000
                })) ?? []
    })

    const reports = useMemo(() => {
        if (!primaryPayload) {
            return []
        }

        const resolvedReports = [primaryPayload.report]
        for (const query of remainingPartQueries) {
            if (!query.data) {
                return []
            }

            resolvedReports.push(query.data)
        }

        return resolvedReports
    }, [primaryPayload, remainingPartQueries])

    const isError = isPrimaryError || remainingPartQueries.some(query => query.isError)
    const error = primaryError ?? remainingPartQueries.find(query => query.error)?.error ?? null
    const isLoading = isPrimaryLoading || remainingPartQueries.some(query => query.isLoading || query.isFetching)

    const bestPolicyState = useMemo(() => {
        if (reports.length === 0) {
            return { best: null as MainBestPolicyRowBundle | null, error: null as Error | null }
        }

        try {
            // Главная карточка собирает narrative summary из всех опубликованных частей,
            // потому что нужные метрики распределены по part-срезам отчёта.
            const sections = buildMainDemoPolicyBranchMegaSections(reports.flatMap(report => report.sections ?? []))
            return {
                best: resolveMainDemoBestPolicyRows(sections),
                error: null as Error | null
            }
        } catch (err) {
            return {
                best: null as MainBestPolicyRowBundle | null,
                error: err instanceof Error ? err : new Error('Failed to resolve demo configuration.')
            }
        }
    }, [reports])

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
                { minimumFractionDigits: 0, maximumFractionDigits: 0 }
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
                    { label: t('main.demo.meta.startCapital'), value: startCapital },
                    { label: t('main.demo.meta.finalBalance'), value: finalBalance },
                    { label: t('main.demo.meta.withdrawnProfit'), value: withdrawnProfit },
                    { label: t('main.demo.meta.trades'), value: totalTrades }
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
            const capitalAfterDrawdownUsd = startCapitalUsd * (1 - maxDdPct / 100)
            const avgStakePct = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'AvgStake%'), 'AvgStake%')
            const avgStakeUsd = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'AvgStake$'), 'AvgStake$')
            const dailyTpAvg = parseCompositeAverageValue(
                resolveMetricValue(bestPolicyState.best, 'DailyTP%'),
                'DailyTP%'
            )
            const dailySlAvg = parseCompositeAverageValue(
                resolveMetricValue(bestPolicyState.best, 'DailySL%'),
                'DailySL%'
            )
            const hadLiqValue = resolveMetricValue(bestPolicyState.best, 'HadLiq').trim().toLowerCase()
            const policySummaryKey = resolveMainDemoPolicySummaryKey(bestPolicyState.best.policy)
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

            let liquidationSentenceKey: 'main.demo.summary.liquidationsNo' | 'main.demo.summary.liquidationsYes'
            if (hadLiqValue === 'no') {
                liquidationSentenceKey = 'main.demo.summary.liquidationsNo'
            } else if (hadLiqValue === 'yes') {
                liquidationSentenceKey = 'main.demo.summary.liquidationsYes'
            } else {
                throw new Error(`[main.demo] HadLiq must be "yes" or "no". value=${hadLiqValue}.`)
            }

            const tradesPerDay = trades / days
            let drawdownSentenceKey:
                | 'main.demo.summary.drawdownLow'
                | 'main.demo.summary.drawdownModerate'
                | 'main.demo.summary.drawdownHigh'

            if (maxDdPct < 5) {
                drawdownSentenceKey = 'main.demo.summary.drawdownLow'
            } else if (maxDdPct < 10) {
                drawdownSentenceKey = 'main.demo.summary.drawdownModerate'
            } else {
                drawdownSentenceKey = 'main.demo.summary.drawdownHigh'
            }

            return {
                data: {
                    items: [
                        t('main.demo.summary.executionCadence'),
                        t('main.demo.summary.performance', {
                            periodStart,
                            periodEnd,
                            totalPnlPct: formatLocalizedPercent(totalPnlPct, i18n.language, 2),
                            totalPnlUsd: formatLocalizedCompactUsd(totalPnlUsd, i18n.language),
                            startCapitalUsd: formatLocalizedCompactUsd(startCapitalUsd, i18n.language)
                        }),
                        t(policySummaryKey),
                        t('main.demo.summary.capitalFlow', {
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
                            })
                        }),
                        t('main.demo.summary.noTrade', {
                            noTradePct: formatLocalizedPercent(noTradePct, i18n.language, 1)
                        }),
                        t('main.demo.summary.avgStake', {
                            avgStakeUsd: formatLocalizedCompactUsd(avgStakeUsd, i18n.language),
                            avgStakePct: formatLocalizedPercent(avgStakePct, i18n.language, 1)
                        }),
                        dailyTpAvg !== null && dailySlAvg !== null ?
                            t('main.demo.summary.avgTargets', {
                                dailyTpAvg: formatLocalizedPercent(dailyTpAvg, i18n.language, 2),
                                dailySlAvg: formatLocalizedPercent(dailySlAvg, i18n.language, 2)
                            })
                        :   t('main.demo.summary.avgTargetsNoSl', {
                                dailyTpAvg:
                                    dailyTpAvg === null ? '—' : formatLocalizedPercent(dailyTpAvg, i18n.language, 2)
                            }),
                        t('main.demo.summary.winRate', {
                            winRatePct: formatLocalizedPercent(winRatePct, i18n.language, 1)
                        }),
                        t(drawdownSentenceKey, {
                            maxDdPct: formatLocalizedPercent(maxDdPct, i18n.language, 2),
                            capitalAfterDrawdownUsd: formatLocalizedCompactUsd(capitalAfterDrawdownUsd, i18n.language)
                        }),
                        t(liquidationSentenceKey, {
                            maxDdPct: formatLocalizedPercent(maxDdPct, i18n.language, 2)
                        })
                    ],
                    verdictProsItems: [
                        t('main.demo.summary.verdictStrength', {
                            totalPnlPct: formatLocalizedPercent(totalPnlPct, i18n.language, 2)
                        }),
                        t('main.demo.summary.verdictRisk', {
                            maxDdPct: formatLocalizedPercent(maxDdPct, i18n.language, 2)
                        })
                    ],
                    verdictConsItems: [
                        t('main.demo.summary.verdictActivity', {
                            noTradePct: formatLocalizedPercent(noTradePct, i18n.language, 1),
                            tradesPerDay: formatLocalizedNumber(tradesPerDay, i18n.language, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                            })
                        }),
                        t('main.demo.summary.verdictEdge', {
                            winRatePct: formatLocalizedPercent(winRatePct, i18n.language, 1)
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

    const demoMetricState = useMemo(() => {
        const bestPolicy = bestPolicyState.best
        if (!bestPolicy) {
            return {
                items: [] as Array<{ label: string; termKey: string; termTitle: string; value: string }>,
                error: null as Error | null
            }
        }

        try {
            return {
                items: DEMO_METRIC_DEFINITIONS.map(definition => {
                    return {
                        label: t(`main.demo.metrics.${definition.labelKey}`),
                        termKey: definition.termKey,
                        termTitle: definition.termTitle,
                        value: localizeReportCellValue(
                            definition.termKey,
                            resolveMetricValue(bestPolicy, definition.termKey),
                            i18n.language
                        )
                    }
                }),
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
                        {renderTermTooltipRichText(t(resolveMainDemoHeadingKey(bestPolicyState.best.policy)))}
                    </Text>
                    <Text className={cls.demoResult}>
                        {renderTermTooltipRichText(
                            t('main.demo.bestResult', {
                                value: formatLocalizedPercent(bestPolicyState.best.totalPnlPct, i18n.language, 2)
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
                <>
                    <BulletList
                        className={cls.demoSummary}
                        markerTone='primary'
                        contentClassName={cls.demoSummaryText}
                        items={demoSummaryState.data.items.map((item, index) => ({
                            key: `main-demo-summary-${index}`,
                            content: renderTermTooltipRichText(item)
                        }))}
                    />
                    <div className={cls.demoVerdictDivider} />
                    <div className={cls.demoVerdictBlock}>
                        <Text type='h4' className={cls.demoVerdictTitle}>
                            {t('main.demo.summary.verdictTitle')}
                        </Text>
                        <Text className={cls.demoVerdictSubTitle}>{t('main.demo.summary.verdictProsTitle')}</Text>
                        <BulletList
                            className={cls.demoSummary}
                            markerTone='primary'
                            contentClassName={cls.demoSummaryText}
                            items={demoSummaryState.data.verdictProsItems.map((item, index) => ({
                                key: `main-demo-verdict-pros-${index}`,
                                content: renderTermTooltipRichText(item)
                            }))}
                        />
                        <Text className={cls.demoVerdictSubTitle}>{t('main.demo.summary.verdictConsTitle')}</Text>
                        <BulletList
                            className={cls.demoSummary}
                            markerTone='primary'
                            contentClassName={cls.demoSummaryText}
                            items={demoSummaryState.data.verdictConsItems.map((item, index) => ({
                                key: `main-demo-verdict-cons-${index}`,
                                content: renderTermTooltipRichText(item)
                            }))}
                        />
                    </div>
                </>
            :   null}

            {demoMetricState.error ?
                <DemoErrorCard
                    title={t('main.demo.errors.metricsTitle')}
                    description={t('main.demo.errors.metricsDescription')}
                    details={demoMetricState.error.message}
                />
            :   <div className={cls.demoMetricGrid}>
                    {demoMetricState.items.map(item => (
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
