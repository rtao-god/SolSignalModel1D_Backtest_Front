import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TermTooltip, Text } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import {
    getPolicyBranchMegaTerm,
    resolvePolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermLocale
} from '@/shared/utils/policyBranchMegaTerms'
import { localizeReportCellValue } from '@/shared/utils/reportCellLocalization'
import { usePolicyBranchMegaReportDocumentQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import {
    buildMainDemoPolicyBranchMegaSections,
    resolveMainDemoBestPolicyRows,
    type MainBestPolicyRowBundle
} from './mainBestPolicySectionModel'
import cls from './Main.module.scss'
import { MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY } from './mainPolicyBranchMegaQuery'

interface DemoMetricDefinition {
    labelKey: 'totalPnl' | 'maxDd' | 'winRate' | 'trades' | 'liquidations'
    termKey: string
    termTitle: string
}

interface DemoMetaItem {
    label: string
    value: string
}

const DEMO_METRIC_DEFINITIONS: DemoMetricDefinition[] = [
    { labelKey: 'totalPnl', termKey: 'TotalPnl%', termTitle: 'TotalPnl%' },
    { labelKey: 'maxDd', termKey: 'MaxDD%', termTitle: 'MaxDD%' },
    { labelKey: 'winRate', termKey: 'WinRate%', termTitle: 'WinRate%' },
    { labelKey: 'trades', termKey: 'Tr', termTitle: 'Tr' },
    { labelKey: 'liquidations', termKey: 'HadLiq', termTitle: 'HadLiq' }
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
 * Компактная карточка лучшей Policy для главной страницы.
 * Карточка читает только два опубликованных part-среза: лидерство берётся из part 1,
 * а хвостовой риск HadLiq добирается из соседнего part 2. Полная таблица и графики
 * остаются на отдельной странице.
 */
export default function MainBestPolicySection() {
    const { t, i18n } = useTranslation('reports')
    const termsLocale = useMemo(() => resolvePolicyBranchMegaTermLocale(i18n.language), [i18n.language])
    const primaryReportQueryArgs = useMemo(
        () => ({
            ...MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY,
            part: 1
        }),
        []
    )
    const secondaryReportQueryArgs = useMemo(
        () => ({
            ...MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY,
            part: 2
        }),
        []
    )
    const {
        data: primaryReport,
        isError: isPrimaryError,
        error: primaryError,
        isLoading: isPrimaryLoading
    } = usePolicyBranchMegaReportDocumentQuery(primaryReportQueryArgs, { enabled: true })
    const {
        data: secondaryReport,
        isError: isSecondaryError,
        error: secondaryError,
        isLoading: isSecondaryLoading
    } = usePolicyBranchMegaReportDocumentQuery(secondaryReportQueryArgs, { enabled: true })

    const reportLoadError = primaryError ?? secondaryError ?? null
    const isLoading = isPrimaryLoading || isSecondaryLoading
    const isError = isPrimaryError || isSecondaryError

    const bestPolicyState = useMemo(() => {
        if (!primaryReport || !secondaryReport) {
            return { best: null as MainBestPolicyRowBundle | null, error: null as Error | null }
        }

        try {
            // Мини-демо читает только два опубликованных part-среза:
            // первый отвечает за лидерство, второй приносит хвостовой риск HadLiq.
            const sections = buildMainDemoPolicyBranchMegaSections([
                ...(primaryReport.sections ?? []),
                ...(secondaryReport.sections ?? [])
            ])
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
    }, [primaryReport, secondaryReport])

    const demoMetaState = useMemo(() => {
        if (!bestPolicyState.best) {
            return { items: [] as DemoMetaItem[], error: null as Error | null }
        }

        try {
            const startDay = localizeReportCellValue(
                'StartDay',
                resolveMetricValue(bestPolicyState.best, 'StartDay'),
                i18n.language
            )
            const endDay = localizeReportCellValue(
                'EndDay',
                resolveMetricValue(bestPolicyState.best, 'EndDay'),
                i18n.language
            )
            const days = formatLocalizedNumber(
                parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'Days'), 'Days'),
                i18n.language,
                { minimumFractionDigits: 0, maximumFractionDigits: 0 }
            )
            const trades = formatLocalizedNumber(
                parseRequiredNumber(resolveMetricValue(bestPolicyState.best, 'Tr'), 'Tr'),
                i18n.language,
                { minimumFractionDigits: 0, maximumFractionDigits: 0 }
            )

            return {
                items: [
                    { label: t('main.demo.meta.periodStart'), value: startDay },
                    { label: t('main.demo.meta.periodEnd'), value: endDay },
                    { label: t('main.demo.meta.days'), value: days },
                    { label: t('main.demo.meta.trades'), value: trades }
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
                    const rawValue = resolveMetricValue(bestPolicy, definition.termKey)
                    const normalizedRawValue = rawValue.trim().toLowerCase()
                    const value =
                        definition.termKey === 'HadLiq' ?
                            t(
                                `main.demo.values.${
                                    normalizedRawValue === 'yes' || normalizedRawValue === 'true' || normalizedRawValue === '1' ?
                                        'yes'
                                    :   'no'
                                }`
                            )
                        :   definition.termKey === 'Tr' ?
                            formatLocalizedNumber(
                                parseRequiredNumber(rawValue, definition.termKey),
                                i18n.language,
                                { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                            )
                        :   formatLocalizedPercent(
                                parseRequiredNumber(rawValue, definition.termKey),
                                i18n.language,
                                definition.termKey === 'WinRate%' ? 1 : 2
                            )

                    return {
                        label: t(`main.demo.metrics.${definition.labelKey}`),
                        termKey: definition.termKey,
                        termTitle: definition.termTitle,
                        value
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
                details={reportLoadError instanceof Error ? reportLoadError.message : String(reportLoadError ?? '')}
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
                    <Text className={cls.demoNote}>
                        {renderTermTooltipRichText(t(resolveMainDemoPolicySummaryKey(bestPolicyState.best.policy)))}
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

            <Text className={cls.demoNote}>{t('main.demo.compactNote')}</Text>
        </div>
    )
}
