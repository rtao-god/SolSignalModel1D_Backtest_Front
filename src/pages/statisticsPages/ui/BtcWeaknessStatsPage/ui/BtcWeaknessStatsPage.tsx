import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { useBacktestBtcWeaknessStatsReportQuery } from '@/shared/api/tanstackQueries/backtestBtcWeaknessStats'
import { useStatisticsBtcWeaknessLiveReportQuery } from '@/shared/api/tanstackQueries/statisticsBtcWeaknessLive'
import type { KeyValueItemDto, KeyValueSectionDto, ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'
import { ReportDocumentView, ReportTableTermsBlock, Text } from '@/shared/ui'
import { PageDataState, PageSectionDataState } from '@/shared/ui/errors/PageDataState'
import type { BtcWeaknessProvidedTerm, SummaryCard, SummaryCardLine } from './types'
import cls from './BtcWeaknessStatsPage.module.scss'

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

function findKeyValueSection(report: ReportDocumentDto | undefined, sectionKey: string): KeyValueSectionDto | null {
    if (!report) {
        return null
    }

    return report.sections.find(section => isKeyValueSection(section) && section.sectionKey === sectionKey) ?? null
}

function resolveLine(item: KeyValueItemDto | undefined | null, fallbackLabel: string): SummaryCardLine | null {
    if (!item?.value) {
        return null
    }

    return {
        label: item.key || fallbackLabel,
        value: item.value
    }
}

function extractItems(section: KeyValueSectionDto | null, itemKeys: string[]): KeyValueItemDto[] {
    if (!section?.items) {
        return []
    }

    return itemKeys
        .map(itemKey => section.items?.find(item => item.itemKey === itemKey) ?? null)
        .filter((item): item is KeyValueItemDto => Boolean(item))
}

function buildBtcWeaknessTerms(translate: (key: string, options?: Record<string, unknown>) => string): BtcWeaknessProvidedTerm[] {
    const definitions = [
        ['threshold', 'Threshold', 'The value at which one weakness sign starts counting as triggered.'],
        ['ownerDefault', 'Project default', 'Marks the row that matches the working thresholds used by the project runtime.'],
        ['totalDays', 'Total days', 'All days that entered the current slice.'],
        ['triggerDays', 'Trigger days', 'Days where all three weakness signs were true for the current threshold.'],
        ['triggerRate', 'Trigger rate', 'Share of trigger days inside the full day set.'],
        ['upToFlatDays', 'Up to flat days', 'How many times an up forecast was forcibly moved into sideways.'],
        ['forecastAccuracyTotal', 'Forecast accuracy total', 'Overall forecast accuracy after the rule was applied to the full set.'],
        ['forecastAccuracyTriggerDays', 'Forecast accuracy on trigger days', 'Forecast accuracy only on days where the Bitcoin weakness rule actually fired.'],
        ['accuracyDelta', 'Accuracy delta', 'Accuracy difference versus the project default or the pre-block baseline.'],
        ['actualDownTriggerDays', 'Actual down trigger days', 'Trigger days that finished with a fall in the Solana coin price.'],
        ['actualFlatTriggerDays', 'Actual flat trigger days', 'Trigger days that finished with sideways movement in the Solana coin price.'],
        ['actualUpTriggerDays', 'Actual up trigger days', 'Trigger days that finished with growth in the Solana coin price.'],
        ['usedDays', 'Used days', 'Real journal days that passed the strict completeness filter and entered the factual statistics.'],
        ['finalizedWithFactDays', 'Finalized with fact days', 'Journal days where the final factual outcome already exists.'],
        ['missingIndicatorsDays', 'Missing indicator days', 'Days excluded because Bitcoin indicators were missing at session open.'],
        ['missingRawInputsDays', 'Missing raw input days', 'Days excluded because the raw PMove or PUpGivenMove inputs were missing.']
    ] as const

    return definitions.map(([key, title, description]) => ({
        key,
        title: translate(`btcWeaknessStats.terms.${key}.title`, { defaultValue: title }),
        description: translate(`btcWeaknessStats.terms.${key}.description`, { defaultValue: description }),
        tooltip: translate(`btcWeaknessStats.terms.${key}.tooltip`, { defaultValue: description })
    }))
}

export default function BtcWeaknessStatsPage() {
    const { t } = useTranslation('reports')
    const backtestQuery = useBacktestBtcWeaknessStatsReportQuery()
    const liveQuery = useStatisticsBtcWeaknessLiveReportQuery()

    const summaryCards = useMemo<SummaryCard[]>(() => {
        const result: SummaryCard[] = []

        const configSection = findKeyValueSection(backtestQuery.data, 'btc_weakness_stats_config')
        const backtestSummarySection = findKeyValueSection(backtestQuery.data, 'owner_rule_summary')
        const liveSummarySection = findKeyValueSection(liveQuery.data, 'live_btc_weakness_owner_summary')
        const liveScopeSection = findKeyValueSection(liveQuery.data, 'live_btc_weakness_scope')

        const projectDefaultLines = extractItems(configSection, ['ema_gap_default', 'ret1_drop_default', 'ret30_drop_default'])
            .map(item => resolveLine(item, item.key))
            .filter((line): line is SummaryCardLine => Boolean(line))
        if (projectDefaultLines.length > 0) {
            result.push({
                id: 'project-defaults',
                title: t('btcWeaknessStats.page.summary.projectDefaults', {
                    defaultValue: 'Project thresholds'
                }),
                lines: projectDefaultLines
            })
        }

        const backtestLines = extractItems(backtestSummarySection, [
            'trigger_days',
            'trigger_rate',
            'up_to_flat_days',
            'accuracy_owner_default',
            'accuracy_delta_vs_before_block'
        ])
            .map(item => resolveLine(item, item.key))
            .filter((line): line is SummaryCardLine => Boolean(line))
        if (backtestLines.length > 0) {
            result.push({
                id: 'backtest-summary',
                title: t('btcWeaknessStats.page.summary.backtest', {
                    defaultValue: 'History summary'
                }),
                lines: backtestLines
            })
        }

        const liveLines = extractItems(liveSummarySection, [
            'trigger_days',
            'trigger_rate',
            'up_to_flat_days',
            'accuracy_owner_default',
            'accuracy_delta_vs_before_block'
        ])
            .map(item => resolveLine(item, item.key))
            .filter((line): line is SummaryCardLine => Boolean(line))
        if (liveLines.length > 0) {
            result.push({
                id: 'live-summary',
                title: t('btcWeaknessStats.page.summary.live', {
                    defaultValue: 'Real-day summary'
                }),
                lines: liveLines
            })
        }

        const liveScopeLines = extractItems(liveScopeSection, [
            'used_days',
            'finalized_with_fact_days',
            'missing_indicators_days',
            'missing_raw_btc_weakness_inputs_days'
        ])
            .map(item => resolveLine(item, item.key))
            .filter((line): line is SummaryCardLine => Boolean(line))
        if (liveScopeLines.length > 0) {
            result.push({
                id: 'live-scope',
                title: t('btcWeaknessStats.page.summary.liveScope', {
                    defaultValue: 'Real-day coverage'
                }),
                lines: liveScopeLines
            })
        }

        return result
    }, [backtestQuery.data, liveQuery.data, t])

    const terms = useMemo(() => buildBtcWeaknessTerms(t), [t])

    const backtestFreshness = useMemo(
        () => ({
            statusMode: 'debug' as const,
            statusTitle: t('btcWeaknessStats.page.status.backtestTitle', {
                defaultValue: 'ACTUAL: latest published history report'
            }),
            statusMessage: t('btcWeaknessStats.page.status.backtestMessage', {
                defaultValue: 'The page shows the latest published Bitcoin-weakness report built on historical days.'
            })
        }),
        [t]
    )
    const liveFreshness = useMemo(
        () => ({
            statusMode: 'debug' as const,
            statusTitle: t('btcWeaknessStats.page.status.liveTitle', {
                defaultValue: 'ACTUAL: live journal snapshot'
            }),
            statusMessage: t('btcWeaknessStats.page.status.liveMessage', {
                defaultValue: 'The page shows the current factual report built from the canonical real-forecast journal.'
            })
        }),
        [t]
    )

    return (
        <div className={classNames(cls.root, {}, [])} data-tooltip-boundary>
            <PageDataState
                shell={
                    <>
                        <section className={cls.hero}>
                            <Text type='h1'>
                                {t('btcWeaknessStats.page.title', { defaultValue: 'Bitcoin weakness statistics' })}
                            </Text>
                            <Text>
                                {t('btcWeaknessStats.page.subtitle', {
                                    defaultValue:
                                        'The page shows the project rule that removes an up forecast for the Solana coin price and moves it into sideways when Bitcoin shows three weakness signs at the same time.'
                                })}
                            </Text>
                        </section>

                        {summaryCards.length > 0 && (
                            <section className={cls.block}>
                                <Text type='h2' className={cls.blockTitle}>
                                    {t('btcWeaknessStats.page.summary.title', { defaultValue: 'Short project summary' })}
                                </Text>
                                <div className={cls.summaryGrid}>
                                    {summaryCards.map(card => (
                                        <article key={card.id} className={cls.summaryCard}>
                                            <Text className={cls.summaryTitle}>{card.title}</Text>
                                            <div className={cls.summaryList}>
                                                {card.lines.map(line => (
                                                    <div key={`${card.id}:${line.label}`} className={cls.summaryRow}>
                                                        <span className={cls.summaryLabel}>{line.label}</span>
                                                        <span className={cls.summaryValue}>{line.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className={cls.block}>
                            <ReportTableTermsBlock
                                className={cls.termsBlock}
                                title={t('btcWeaknessStats.page.terms.title', { defaultValue: 'Table terms' })}
                                subtitle={t('btcWeaknessStats.page.terms.subtitle', {
                                    defaultValue:
                                        'One glossary is shared by the historical tables and the real-day tables, so the main page text can stay focused on interpretation.'
                                })}
                                terms={terms}
                                collapsible
                            />
                        </section>
                    </>
                }
                hasData={Boolean(backtestQuery.data || liveQuery.data)}
                isLoading={false}
                isError={false}
                title={t('btcWeaknessStats.page.title', { defaultValue: 'Bitcoin weakness statistics' })}>
                <section className={cls.block}>
                    <Text type='h2' className={cls.blockTitle}>
                        {t('btcWeaknessStats.page.backtestTitle', { defaultValue: 'Historical statistics' })}
                    </Text>
                    <PageSectionDataState
                        hasData={Boolean(backtestQuery.data)}
                        isLoading={backtestQuery.isLoading}
                        isError={Boolean(backtestQuery.error)}
                        error={backtestQuery.error ?? null}
                        loadingText={t('btcWeaknessStats.page.loadingBacktest', {
                            defaultValue: 'Loading historical Bitcoin-weakness statistics'
                        })}
                        title={t('btcWeaknessStats.page.errorBacktestTitle', {
                            defaultValue: 'Failed to load historical Bitcoin-weakness statistics'
                        })}
                        description={t('btcWeaknessStats.page.errorBacktestMessage', {
                            defaultValue: 'Check the /api/backtest/btc-weakness-stats endpoint and the published report.'
                        })}
                        onRetry={() => {
                            void backtestQuery.refetch()
                        }}>
                        {backtestQuery.data && (
                            <ReportDocumentView
                                report={backtestQuery.data}
                                freshness={backtestFreshness}
                                showTableTermsBlock={false}
                            />
                        )}
                    </PageSectionDataState>
                </section>

                <section className={cls.block}>
                    <Text type='h2' className={cls.blockTitle}>
                        {t('btcWeaknessStats.page.liveTitle', { defaultValue: 'Real-day statistics' })}
                    </Text>
                    <PageSectionDataState
                        hasData={Boolean(liveQuery.data)}
                        isLoading={liveQuery.isLoading}
                        isError={Boolean(liveQuery.error)}
                        error={liveQuery.error ?? null}
                        loadingText={t('btcWeaknessStats.page.loadingLive', {
                            defaultValue: 'Loading real-day Bitcoin-weakness statistics'
                        })}
                        title={t('btcWeaknessStats.page.errorLiveTitle', {
                            defaultValue: 'Failed to load real-day Bitcoin-weakness statistics'
                        })}
                        description={t('btcWeaknessStats.page.errorLiveMessage', {
                            defaultValue: 'Check the /api/statistics/btc-weakness/live endpoint and the real forecast journal.'
                        })}
                        onRetry={() => {
                            void liveQuery.refetch()
                        }}>
                        {liveQuery.data && (
                            <ReportDocumentView report={liveQuery.data} freshness={liveFreshness} showTableTermsBlock={false} />
                        )}
                    </PageSectionDataState>
                </section>
            </PageDataState>
        </div>
    )
}
