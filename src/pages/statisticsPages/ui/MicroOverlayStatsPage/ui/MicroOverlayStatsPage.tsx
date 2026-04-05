import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBacktestMicroOverlayStatsReportQuery } from '@/shared/api/tanstackQueries/backtestMicroOverlayStats'
import { useStatisticsMicroOverlayLiveReportQuery } from '@/shared/api/tanstackQueries/statisticsMicroOverlayLive'
import StatisticsDualReportPage from '../../shared/StatisticsDualReportPage'
import {
    buildProvidedTermsFromTranslations,
    extractItems,
    findKeyValueSection,
    resolveLine,
    type StatisticsProvidedTermDefinition,
    type StatisticsSummaryCard
} from '../../shared/statisticsReportPageHelpers'
import type { MicroOverlayStatsPageProps } from './types'
import cls from './MicroOverlayStatsPage.module.scss'

const MICRO_OVERLAY_TERM_DEFINITIONS: readonly StatisticsProvidedTermDefinition[] = [
    {
        key: 'threshold',
        titleDefault: 'Threshold',
        descriptionDefault: 'The value after which the rule starts treating the signal as strong enough to intervene.'
    },
    {
        key: 'projectDefault',
        titleDefault: 'Project default',
        descriptionDefault: 'The row with the working runtime thresholds of the project.'
    },
    {
        key: 'baseFlatDays',
        titleDefault: 'Base flat days',
        descriptionDefault: 'Days where the base day answer was already sideways before the micro model stepped in.'
    },
    {
        key: 'gatePassedDays',
        titleDefault: 'Gate-passed days',
        descriptionDefault:
            'Days where micro confidence crossed the working threshold and the signal was allowed to move probabilities.'
    },
    {
        key: 'microTruthAccuracy',
        titleDefault: 'Micro-direction accuracy',
        descriptionDefault:
            'How often the micro direction matched the factual outcome on days where the rule really intervened.'
    },
    {
        key: 'dayUncertainty',
        titleDefault: 'Day uncertainty',
        descriptionDefault:
            'The share of probability mass that the base day model still leaves open for the micro layer.'
    },
    {
        key: 'actualImpact',
        titleDefault: 'Actual impact',
        descriptionDefault: 'The factual probability mass that the micro layer really moved into the chosen direction.'
    },
    {
        key: 'usedDays',
        titleDefault: 'Used days',
        descriptionDefault:
            'Real-journal days that passed the strict completeness filter and entered the factual layer.'
    }
] as const

export default function MicroOverlayStatsPage({ className }: MicroOverlayStatsPageProps) {
    const { t } = useTranslation('reports')
    const backtestQuery = useBacktestMicroOverlayStatsReportQuery()
    const liveQuery = useStatisticsMicroOverlayLiveReportQuery()

    const summaryCards = useMemo<StatisticsSummaryCard[]>(() => {
        const cards: StatisticsSummaryCard[] = []
        const configSection = findKeyValueSection(backtestQuery.data, 'micro_overlay_stats_config')
        const backtestSummarySection = findKeyValueSection(backtestQuery.data, 'owner_rule_summary')
        const liveSummarySection = findKeyValueSection(liveQuery.data, 'live_micro_overlay_owner_summary')
        const liveScopeSection = findKeyValueSection(liveQuery.data, 'live_micro_overlay_scope')

        const projectDefaults = extractItems(configSection, [
            'min_confidence_default',
            'strong_confidence_default',
            'max_impact_default',
            'beta_micro_default'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (projectDefaults.length > 0) {
            cards.push({
                id: 'project-defaults',
                title: t('microOverlayStats.page.summary.projectDefaults'),
                lines: projectDefaults
            })
        }

        const backtestLines = extractItems(backtestSummarySection, [
            'base_flat_days',
            'gate_passed_days',
            'changed_days',
            'micro_truth_accuracy_gate_passed',
            'average_actual_impact_gate_passed'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (backtestLines.length > 0) {
            cards.push({
                id: 'history-summary',
                title: t('microOverlayStats.page.summary.backtest'),
                lines: backtestLines
            })
        }

        const liveLines = extractItems(liveSummarySection, [
            'base_flat_days',
            'gate_passed_days',
            'changed_days',
            'micro_truth_accuracy_gate_passed',
            'average_actual_impact_gate_passed'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (liveLines.length > 0) {
            cards.push({
                id: 'live-summary',
                title: t('microOverlayStats.page.summary.live'),
                lines: liveLines
            })
        }

        const liveScopeLines = extractItems(liveScopeSection, [
            'used_days',
            'finalized_with_fact_days',
            'missing_raw_micro_inputs_days',
            'non_strict_live_days'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (liveScopeLines.length > 0) {
            cards.push({
                id: 'live-scope',
                title: t('microOverlayStats.page.summary.liveScope'),
                lines: liveScopeLines
            })
        }

        return cards
    }, [backtestQuery.data, liveQuery.data, t])

    const terms = useMemo(
        () => buildProvidedTermsFromTranslations(t, 'microOverlayStats.terms', MICRO_OVERLAY_TERM_DEFINITIONS),
        [t]
    )

    return (
        <StatisticsDualReportPage
            className={className ?? cls.root}
            title={t('microOverlayStats.page.title')}
            subtitle={t('microOverlayStats.page.subtitle')}
            summaryTitle={t('microOverlayStats.page.summary.title')}
            summaryCards={summaryCards}
            termsTitle={t('microOverlayStats.page.terms.title')}
            termsSubtitle={t('microOverlayStats.page.terms.subtitle')}
            terms={terms}
            backtest={{
                title: t('microOverlayStats.page.backtestTitle'),
                loadingText: t('microOverlayStats.page.loadingBacktest'),
                errorTitle: t('microOverlayStats.page.errorBacktestTitle'),
                errorMessage: t('microOverlayStats.page.errorBacktestMessage'),
                freshnessTitle: t('microOverlayStats.page.status.backtestTitle'),
                freshnessMessage: t('microOverlayStats.page.status.backtestMessage'),
                query: backtestQuery
            }}
            live={{
                title: t('microOverlayStats.page.liveTitle'),
                loadingText: t('microOverlayStats.page.loadingLive'),
                errorTitle: t('microOverlayStats.page.errorLiveTitle'),
                errorMessage: t('microOverlayStats.page.errorLiveMessage'),
                freshnessTitle: t('microOverlayStats.page.status.liveTitle'),
                freshnessMessage: t('microOverlayStats.page.status.liveMessage'),
                query: liveQuery
            }}
        />
    )
}
