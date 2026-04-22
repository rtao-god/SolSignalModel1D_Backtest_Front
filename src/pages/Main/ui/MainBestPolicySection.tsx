import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { QUERY_POLICY_REGISTRY } from '@/shared/configs/queryPolicies'
import { BulletList } from '@/shared/ui/BulletList'
import { TermTooltip, Text } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import { formatDateWithLocale } from '@/shared/utils/dateFormat'
import {
    fetchPolicyBranchMegaReportPayload,
    POLICY_BRANCH_MEGA_CANONICAL_PARTS,
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
import {
    resolvePolicyBranchMegaMetricRawValue
} from '@/shared/utils/policyBranchMegaCurrentBalance'
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
    { labelKey: 'bucketNow', termKey: 'EquityNowUsd', termTitle: 'EquityNowUsd' },
    { labelKey: 'maxDd', termKey: 'MaxDD%', termTitle: 'MaxDD%' },
    { labelKey: 'liquidations', termKey: 'HadLiquidation', termTitle: 'HadLiquidation' },
    { labelKey: 'accountRuin', termKey: 'AccountRuinCount', termTitle: 'AccountRuinCount' },
    { labelKey: 'recovery', termKey: 'RecovDays', termTitle: 'RecovDays' },
    { labelKey: 'winRate', termKey: 'WinRate%', termTitle: 'WinRate%' },
    { labelKey: 'meanRet', termKey: 'MeanRet%', termTitle: 'MeanRet%' },
    { labelKey: 'sharpe', termKey: 'Sharpe', termTitle: 'Sharpe' },
    { labelKey: 'trades', termKey: 'TradesCount', termTitle: 'TradesCount' },
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

function resolveRequiredPolicyMetricNumber(
    value: number | null | undefined,
    metricTitle: string
): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`[main.demo] ${metricTitle} is missing in owner PolicyPerformanceMetricsDto.`)
    }

    return value
}

function resolveRequiredPolicyMetricBoolean(
    value: boolean | null | undefined,
    metricTitle: string
): boolean {
    if (typeof value !== 'boolean') {
        throw new Error(`[main.demo] ${metricTitle} is missing in owner PolicyPerformanceMetricsDto.`)
    }

    return value
}

function convertFractionToPercent(value: number | null | undefined, metricTitle: string): number {
    return resolveRequiredPolicyMetricNumber(value, metricTitle) * 100
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
    return resolvePolicyBranchMegaMetricRawValue(bundle.sectionRows, title, `main.demo.metric.${title}`)
}

function formatLocalizedDateMetric(rawValue: string, locale: string, metricTitle: string): string {
    const normalizedValue = rawValue.trim()
    if (!normalizedValue) {
        throw new Error(`[main.demo] ${metricTitle} is empty.`)
    }

    const isoValue = normalizedValue.includes('T') ? normalizedValue : `${normalizedValue}T00:00:00Z`
    const parsed = new Date(isoValue)
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`[main.demo] ${metricTitle} is not a valid date value: ${rawValue}.`)
    }

    return formatDateWithLocale(parsed, locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    })
}

function resolveCanonicalMetricRawValue(bundle: MainBestPolicyRowBundle, title: string): string | null {
    const metrics = bundle.moneyMetrics

    switch (title) {
        case 'TotalPnl%':
            return String(resolveRequiredPolicyMetricNumber(metrics.totalPnlPct, 'totalPnlPct'))
        case 'TotalPnlUsd':
            return String(resolveRequiredPolicyMetricNumber(metrics.totalPnlUsd, 'totalPnlUsd'))
        case 'StartCapitalUsd':
            return String(resolveRequiredPolicyMetricNumber(metrics.startCapitalUsd, 'startCapitalUsd'))
        case 'EquityNowUsd':
            return String(resolveRequiredPolicyMetricNumber(metrics.equityNowUsd, 'equityNowUsd'))
        case 'WithdrawnTotalUsd':
            return String(resolveRequiredPolicyMetricNumber(metrics.withdrawnTotalUsd, 'withdrawnTotalUsd'))
        case 'MaxDD%':
            return String(resolveRequiredPolicyMetricNumber(metrics.maxDdPct, 'maxDdPct'))
        case 'HadLiquidation':
            return resolveRequiredPolicyMetricBoolean(metrics.hadLiquidation, 'hadLiquidation') ? 'Yes' : 'No'
        case 'AccountRuinCount':
            return String(resolveRequiredPolicyMetricNumber(metrics.accountRuinCount, 'accountRuinCount'))
        case 'WinRate%':
            return String(convertFractionToPercent(metrics.winRate, 'winRate'))
        case 'MeanRet%':
            return String(convertFractionToPercent(metrics.mean, 'mean'))
        case 'Sharpe':
            return String(resolveRequiredPolicyMetricNumber(metrics.sharpe, 'sharpe'))
        case 'TradesCount':
            return String(resolveRequiredPolicyMetricNumber(metrics.tradesCount, 'tradesCount'))
        default:
            return null
    }
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
    // Мини-демо на главной должно читать те же owner-artifacts, что и mega-страница:
    // published report sections + canonical money_metrics payload по тем же частям 1..4.
    const remainingPartQueries = useQueries({
        queries:
            POLICY_BRANCH_MEGA_CANONICAL_PARTS
                .filter(part => part !== 1)
                .map(part => ({
                    queryKey: ['main', 'demo', 'policy-branch-mega', 'payload', part] as const,
                    queryFn: () =>
                        fetchPolicyBranchMegaReportPayload({
                            ...MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY,
                            part
                        }),
                    staleTime: QUERY_POLICY_REGISTRY.policyBranchMega.staleTimeMs,
                    gcTime: QUERY_POLICY_REGISTRY.policyBranchMega.gcTimeMs
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

            resolvedReports.push(query.data.report)
        }

        return resolvedReports
    }, [primaryPayload, remainingPartQueries])

    const isError = isPrimaryError || remainingPartQueries.some(query => query.isError)
    const error = primaryError ?? remainingPartQueries.find(query => query.error)?.error ?? null
    const isLoading = isPrimaryLoading || remainingPartQueries.some(query => query.isLoading || query.isFetching)

    const bestPolicyState = useMemo(() => {
        if (reports.length === 0 || !primaryPayload) {
            return { best: null as MainBestPolicyRowBundle | null, error: null as Error | null }
        }

        try {
            // Главная карточка собирает narrative summary из всех опубликованных частей,
            // потому что нужные метрики распределены по part-срезам отчёта.
            const sections = buildMainDemoPolicyBranchMegaSections(reports.flatMap(report => report.sections ?? []))
            return {
                best: resolveMainDemoBestPolicyRows(sections, primaryPayload.moneyMetrics.rows),
                error: null as Error | null
            }
        } catch (err) {
            return {
                best: null as MainBestPolicyRowBundle | null,
                error: normalizeErrorLike(err, 'Failed to resolve demo configuration.', {
                    source: 'main-demo-configuration',
                    domain: 'ui_section',
                    owner: 'main-best-policy-section',
                    expected: 'Main demo should merge published mega parts into one comparable policy set.',
                    requiredAction: 'Inspect published mega report parts and demo section builder.'
                })
            }
        }
    }, [primaryPayload, reports])

    const demoMetaState = useMemo(() => {
        if (!bestPolicyState.best) {
            return { items: [] as DemoMetaItem[], error: null as Error | null }
        }

        try {
            const moneyMetrics = bestPolicyState.best.moneyMetrics
            const startCapital = formatLocalizedCompactUsd(
                resolveRequiredPolicyMetricNumber(moneyMetrics.startCapitalUsd, 'startCapitalUsd'),
                i18n.language
            )
            const finalBalance = formatLocalizedCompactUsd(
                resolveRequiredPolicyMetricNumber(moneyMetrics.equityNowUsd, 'equityNowUsd'),
                i18n.language
            )
            const withdrawnProfit = formatLocalizedCompactUsd(
                resolveRequiredPolicyMetricNumber(moneyMetrics.withdrawnTotalUsd, 'withdrawnTotalUsd'),
                i18n.language
            )
            const totalTrades = formatLocalizedNumber(
                resolveRequiredPolicyMetricNumber(moneyMetrics.tradesCount, 'tradesCount'),
                i18n.language,
                { minimumFractionDigits: 0, maximumFractionDigits: 0 }
            )

            return {
                items: [
                    {
                        label: t('main.demo.meta.periodStart'),
                        value: formatLocalizedDateMetric(
                            resolveMetricValue(bestPolicyState.best, 'StartDay'),
                            i18n.language,
                            'StartDay'
                        )
                    },
                    {
                        label: t('main.demo.meta.periodEnd'),
                        value: formatLocalizedDateMetric(
                            resolveMetricValue(bestPolicyState.best, 'EndDay'),
                            i18n.language,
                            'EndDay'
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
                error: normalizeErrorLike(err, 'Failed to build demo meta items.', {
                    source: 'main-demo-meta',
                    domain: 'ui_section',
                    owner: 'main-best-policy-section',
                    expected: 'Main demo should build meta facts from the resolved best policy.',
                    requiredAction: 'Inspect demo meta builder and required best-policy metrics.'
                })
            }
        }
    }, [bestPolicyState.best, i18n.language, t])

    const demoSummaryState = useMemo(() => {
        if (!bestPolicyState.best) {
            return { data: null as DemoNarrativeSummary | null, error: null as Error | null }
        }

        try {
            const moneyMetrics = bestPolicyState.best.moneyMetrics
            const totalPnlPct = resolveRequiredPolicyMetricNumber(moneyMetrics.totalPnlPct, 'totalPnlPct')
            const totalPnlUsd = resolveRequiredPolicyMetricNumber(moneyMetrics.totalPnlUsd, 'totalPnlUsd')
            const currentBalanceUsd = resolveRequiredPolicyMetricNumber(moneyMetrics.equityNowUsd, 'equityNowUsd')
            const withdrawnUsd = resolveRequiredPolicyMetricNumber(moneyMetrics.withdrawnTotalUsd, 'withdrawnTotalUsd')
            const startCapitalUsd = resolveRequiredPolicyMetricNumber(moneyMetrics.startCapitalUsd, 'startCapitalUsd')
            const days = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'Days'), 'Days')
            const trades = resolveRequiredPolicyMetricNumber(moneyMetrics.tradesCount, 'tradesCount')
            const noTradePct = parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'NoTrade%'), 'NoTrade%')
            const winRatePct = convertFractionToPercent(moneyMetrics.winRate, 'winRate')
            const maxDdPct = resolveRequiredPolicyMetricNumber(moneyMetrics.maxDdPct, 'maxDdPct')
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
            const policySummaryKey = resolveMainDemoPolicySummaryKey(bestPolicyState.best.policy)
            const periodStart = formatLocalizedDateMetric(
                resolveMetricValue(bestPolicyState.best, 'StartDay'),
                i18n.language,
                'StartDay'
            )
            const periodEnd = formatLocalizedDateMetric(
                resolveMetricValue(bestPolicyState.best, 'EndDay'),
                i18n.language,
                'EndDay'
            )

            let liquidationSentenceKey: 'main.demo.summary.liquidationsNo' | 'main.demo.summary.liquidationsYes'
            if (!resolveRequiredPolicyMetricBoolean(moneyMetrics.hadLiquidation, 'hadLiquidation')) {
                liquidationSentenceKey = 'main.demo.summary.liquidationsNo'
            } else {
                liquidationSentenceKey = 'main.demo.summary.liquidationsYes'
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
                            bucketNowUsd: formatLocalizedCompactUsd(currentBalanceUsd, i18n.language)
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
                error: normalizeErrorLike(err, 'Failed to build demo summary.', {
                    source: 'main-demo-summary',
                    domain: 'ui_section',
                    owner: 'main-best-policy-section',
                    expected: 'Main demo should build narrative summary from the resolved best policy.',
                    requiredAction: 'Inspect demo summary builder and required best-policy metrics.'
                })
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
                    const rawValue =
                        resolveCanonicalMetricRawValue(bestPolicy, definition.termKey) ??
                        resolveMetricValue(bestPolicy, definition.termKey)

                    return {
                        label: t(`main.demo.metrics.${definition.labelKey}`),
                        termKey: definition.termKey,
                        termTitle: definition.termTitle,
                        value: localizeReportCellValue(definition.termKey, rawValue, i18n.language)
                    }
                }),
                error: null as Error | null
            }
        } catch (err) {
            return {
                items: [] as Array<{ label: string; termKey: string; termTitle: string; value: string }>,
                error: normalizeErrorLike(err, 'Failed to build demo metrics.', {
                    source: 'main-demo-metrics',
                    domain: 'ui_section',
                    owner: 'main-best-policy-section',
                    expected: 'Main demo should build metric cards from the resolved best policy.',
                    requiredAction: 'Inspect demo metric definitions and required best-policy metrics.'
                })
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
