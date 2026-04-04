import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBacktestSlStrongDayStatsReportQuery } from '@/shared/api/tanstackQueries/backtestSlStrongDayStats'
import { useStatisticsSlStrongDayLiveReportQuery } from '@/shared/api/tanstackQueries/statisticsSlStrongDayLive'
import StatisticsDualReportPage from '../../shared/StatisticsDualReportPage'
import {
    buildProvidedTermsFromTranslations,
    extractItems,
    findKeyValueSection,
    resolveLine,
    type StatisticsProvidedTermDefinition,
    type StatisticsSummaryCard
} from '../../shared/statisticsReportPageHelpers'
import type { SlStrongDayStatsPageProps } from './types'
import cls from './SlStrongDayStatsPage.module.scss'

const SL_STRONG_DAY_TERM_DEFINITIONS: readonly StatisticsProvidedTermDefinition[] = [
    {
        key: 'baseThreshold',
        titleDefault: 'Base threshold',
        descriptionDefault: 'The core MinMove value from which the weak, gray, and strong day zones are derived.'
    },
    {
        key: 'weakCut',
        titleDefault: 'Weak cut',
        descriptionDefault: 'The lower boundary below which the day is weak without extra conditions.'
    },
    {
        key: 'strongCut',
        titleDefault: 'Strong cut',
        descriptionDefault: 'The upper boundary above which the day is strong without extra conditions.'
    },
    {
        key: 'grayZone',
        titleDefault: 'Gray zone',
        descriptionDefault:
            'The interval between weak cut and strong cut where the final verdict depends on the down regime.'
    },
    {
        key: 'strongSlFirstRate',
        titleDefault: 'Strong-day SL-first rate',
        descriptionDefault: 'How often stop-loss came before the target on strong tradeable days.'
    },
    {
        key: 'weakSlFirstRate',
        titleDefault: 'Weak-day SL-first rate',
        descriptionDefault: 'How often stop-loss came before the target on weak tradeable days.'
    },
    {
        key: 'separation',
        titleDefault: 'Strong-vs-weak separation',
        descriptionDefault: 'The percentage-point gap between SL-first frequency on strong and weak days.'
    },
    {
        key: 'usedDays',
        titleDefault: 'Used days',
        descriptionDefault:
            'Real-journal days that passed the strict completeness filter and entered the factual layer.'
    }
] as const

export default function SlStrongDayStatsPage({ className }: SlStrongDayStatsPageProps) {
    const { t } = useTranslation('reports')
    const backtestQuery = useBacktestSlStrongDayStatsReportQuery()
    const liveQuery = useStatisticsSlStrongDayLiveReportQuery()

    const summaryCards = useMemo<StatisticsSummaryCard[]>(() => {
        const cards: StatisticsSummaryCard[] = []
        const configSection = findKeyValueSection(backtestQuery.data, 'sl_strong_day_stats_config')
        const backtestSummarySection = findKeyValueSection(backtestQuery.data, 'owner_rule_summary')
        const liveSummarySection = findKeyValueSection(liveQuery.data, 'live_sl_strong_day_owner_summary')
        const liveScopeSection = findKeyValueSection(liveQuery.data, 'live_sl_strong_day_scope')

        const projectDefaults = extractItems(configSection, [
            'base_threshold_default',
            'weak_cut_default',
            'strong_cut_default'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (projectDefaults.length > 0) {
            cards.push({
                id: 'project-defaults',
                title: t('slStrongDayStats.page.summary.projectDefaults'),
                lines: projectDefaults
            })
        }

        const backtestLines = extractItems(backtestSummarySection, [
            'strong_days',
            'gray_days',
            'gray_down_regime_days',
            'strong_sl_first_rate',
            'weak_sl_first_rate',
            'separation_strong_minus_weak'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (backtestLines.length > 0) {
            cards.push({
                id: 'history-summary',
                title: t('slStrongDayStats.page.summary.backtest'),
                lines: backtestLines
            })
        }

        const liveLines = extractItems(liveSummarySection, [
            'strong_days',
            'gray_days',
            'gray_down_regime_days',
            'strong_sl_first_rate',
            'weak_sl_first_rate',
            'separation_strong_minus_weak'
        ])
            .map(item => resolveLine(item, item.key))
            .filter(Boolean) as StatisticsSummaryCard['lines']
        if (liveLines.length > 0) {
            cards.push({
                id: 'live-summary',
                title: t('slStrongDayStats.page.summary.live'),
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
                title: t('slStrongDayStats.page.summary.liveScope'),
                lines: liveScopeLines
            })
        }

        return cards
    }, [backtestQuery.data, liveQuery.data, t])

    const terms = useMemo(
        () => buildProvidedTermsFromTranslations(t, 'slStrongDayStats.terms', SL_STRONG_DAY_TERM_DEFINITIONS),
        [t]
    )

    return (
        <StatisticsDualReportPage
            className={className ?? cls.root}
            title={t('slStrongDayStats.page.title')}
            subtitle={t('slStrongDayStats.page.subtitle')}
            summaryTitle={t('slStrongDayStats.page.summary.title')}
            summaryCards={summaryCards}
            termsTitle={t('slStrongDayStats.page.terms.title')}
            termsSubtitle={t('slStrongDayStats.page.terms.subtitle')}
            terms={terms}
            backtest={{
                title: t('slStrongDayStats.page.backtestTitle'),
                loadingText: t('slStrongDayStats.page.loadingBacktest'),
                errorTitle: t('slStrongDayStats.page.errorBacktestTitle'),
                errorMessage: t('slStrongDayStats.page.errorBacktestMessage'),
                freshnessTitle: t('slStrongDayStats.page.status.backtestTitle'),
                freshnessMessage: t('slStrongDayStats.page.status.backtestMessage'),
                query: backtestQuery
            }}
            live={{
                title: t('slStrongDayStats.page.liveTitle'),
                loadingText: t('slStrongDayStats.page.loadingLive'),
                errorTitle: t('slStrongDayStats.page.errorLiveTitle'),
                errorMessage: t('slStrongDayStats.page.errorLiveMessage'),
                freshnessTitle: t('slStrongDayStats.page.status.liveTitle'),
                freshnessMessage: t('slStrongDayStats.page.status.liveMessage'),
                query: liveQuery
            }}
        />
    )
}
