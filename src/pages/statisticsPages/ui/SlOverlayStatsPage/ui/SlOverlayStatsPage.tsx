import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBacktestSlOverlayStatsReportQuery } from '@/shared/api/tanstackQueries/backtestSlOverlayStats'
import { useStatisticsSlOverlayLiveReportQuery } from '@/shared/api/tanstackQueries/statisticsSlOverlayLive'
import StatisticsDualReportPage from '../../shared/StatisticsDualReportPage'
import {
    buildProvidedTermsFromTranslations,
    extractItems,
    findKeyValueSection,
    resolveLine,
    type StatisticsProvidedTermDefinition,
    type StatisticsSummaryCard
} from '../../shared/statisticsReportPageHelpers'
import type { SlOverlayStatsPageProps } from './types'
import cls from './SlOverlayStatsPage.module.scss'

const SL_OVERLAY_TERM_DEFINITIONS: readonly StatisticsProvidedTermDefinition[] = [
    {
        key: 'highRiskDays',
        titleDefault: 'High-risk days',
        descriptionDefault:
            'Days where the trade-risk model crossed the threshold and actually started to move the final probabilities.'
    },
    {
        key: 'slFirstPrecision',
        titleDefault: 'SL-first precision',
        descriptionDefault: 'How often stop-loss really came before the target on high-risk days.'
    },
    {
        key: 'binaryAccuracy',
        titleDefault: 'Binary accuracy',
        descriptionDefault:
            'Agreement between the high-risk prediction and the factual SL-first versus all other outcomes.'
    },
    {
        key: 'actualImpact',
        titleDefault: 'Actual impact',
        descriptionDefault: 'The factual probability mass that the risk layer removed from the leading direction.'
    },
    {
        key: 'addedToFlat',
        titleDefault: 'Mass moved into sideways',
        descriptionDefault: 'The share of removed mass that the risk layer moved into the sideways outcome.'
    },
    {
        key: 'addedToOpposite',
        titleDefault: 'Mass moved into the opposite direction',
        descriptionDefault: 'The share of removed mass that the risk layer moved into the opposite direction.'
    },
    {
        key: 'topClamp',
        titleDefault: 'Top-class clamp',
        descriptionDefault:
            'The hard bound that stops a risky day from looking artificially obvious after redistribution.'
    },
    {
        key: 'defaultPathProfile',
        titleDefault: 'Default TP/SL profile',
        descriptionDefault:
            'The fixed take-profit and stop-loss profile used to check the factual SL-first outcome in history and live days.'
    }
] as const

export default function SlOverlayStatsPage({ className }: SlOverlayStatsPageProps) {
    const { t } = useTranslation('reports')
    const backtestQuery = useBacktestSlOverlayStatsReportQuery()
    const liveQuery = useStatisticsSlOverlayLiveReportQuery()

    const summaryCards = useMemo<StatisticsSummaryCard[]>(() => {
        const cards: StatisticsSummaryCard[] = []
        const configSection = findKeyValueSection(backtestQuery.data, 'sl_overlay_stats_config')
        const backtestSummarySection = findKeyValueSection(backtestQuery.data, 'owner_rule_summary')
        const liveSummarySection = findKeyValueSection(liveQuery.data, 'live_sl_overlay_owner_summary')
        const liveScopeSection = findKeyValueSection(liveQuery.data, 'live_sl_overlay_scope')

        const projectDefaults = extractItems(configSection, [
            'min_confidence_default',
            'strong_confidence_default',
            'max_impact_default',
            'gamma_sl_default',
            'min_top_class_default',
            'max_top_class_default',
            'default_path_profile'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (projectDefaults.length > 0) {
            cards.push({
                id: 'project-defaults',
                title: t('slOverlayStats.page.summary.projectDefaults'),
                lines: projectDefaults
            })
        }

        const backtestLines = extractItems(backtestSummarySection, [
            'high_risk_days',
            'high_risk_rate',
            'sl_first_precision_high_risk',
            'binary_accuracy_total',
            'clamp_min_days',
            'clamp_max_days'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (backtestLines.length > 0) {
            cards.push({
                id: 'history-summary',
                title: t('slOverlayStats.page.summary.backtest'),
                lines: backtestLines
            })
        }

        const liveLines = extractItems(liveSummarySection, [
            'high_risk_days',
            'high_risk_rate',
            'sl_first_precision_high_risk',
            'binary_accuracy_total',
            'clamp_min_days',
            'clamp_max_days'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (liveLines.length > 0) {
            cards.push({
                id: 'live-summary',
                title: t('slOverlayStats.page.summary.live'),
                lines: liveLines
            })
        }

        const liveScopeLines = extractItems(liveScopeSection, [
            'used_days',
            'finalized_with_fact_days',
            'missing_default_sl_path_outcome_days',
            'non_strict_live_days'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (liveScopeLines.length > 0) {
            cards.push({
                id: 'live-scope',
                title: t('slOverlayStats.page.summary.liveScope'),
                lines: liveScopeLines
            })
        }

        return cards
    }, [backtestQuery.data, liveQuery.data, t])

    const terms = useMemo(
        () => buildProvidedTermsFromTranslations(t, 'slOverlayStats.terms', SL_OVERLAY_TERM_DEFINITIONS),
        [t]
    )

    return (
        <StatisticsDualReportPage
            className={className ?? cls.root}
            title={t('slOverlayStats.page.title')}
            subtitle={t('slOverlayStats.page.subtitle')}
            summaryTitle={t('slOverlayStats.page.summary.title')}
            summaryCards={summaryCards}
            termsTitle={t('slOverlayStats.page.terms.title')}
            termsSubtitle={t('slOverlayStats.page.terms.subtitle')}
            terms={terms}
            backtest={{
                title: t('slOverlayStats.page.backtestTitle'),
                loadingText: t('slOverlayStats.page.loadingBacktest'),
                errorTitle: t('slOverlayStats.page.errorBacktestTitle'),
                errorMessage: t('slOverlayStats.page.errorBacktestMessage'),
                freshnessTitle: t('slOverlayStats.page.status.backtestTitle'),
                freshnessMessage: t('slOverlayStats.page.status.backtestMessage'),
                query: backtestQuery
            }}
            live={{
                title: t('slOverlayStats.page.liveTitle'),
                loadingText: t('slOverlayStats.page.loadingLive'),
                errorTitle: t('slOverlayStats.page.errorLiveTitle'),
                errorMessage: t('slOverlayStats.page.errorLiveMessage'),
                freshnessTitle: t('slOverlayStats.page.status.liveTitle'),
                freshnessMessage: t('slOverlayStats.page.status.liveMessage'),
                query: liveQuery
            }}
        />
    )
}
