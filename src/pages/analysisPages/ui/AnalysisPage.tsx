import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { DomainOverview, Link, Text } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS } from '@/shared/api/tanstackQueries/policyBranchMega'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import {
    buildBacktestDiagnosticsQueryArgsFromSearchParams,
    buildBacktestDiagnosticsSearchFromSearchParams
} from '@/shared/utils/backtestDiagnosticsQuery'
import cls from './AnalysisPage.module.scss'
import type { AnalysisPageProps } from './types'
import { ANALYSIS_HOME_CARDS } from './shared/analysisHomeCards'
import {
    ANALYSIS_HOME_FACT_ROWS,
    ANALYSIS_HOME_METRIC_IDS,
    ANALYSIS_HOME_OVERVIEW_BLOCKS
} from './shared/analysisHomeContent'

export default function AnalysisPage({ className }: AnalysisPageProps) {
    const { t } = useTranslation('reports')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()
    const location = useLocation()
    const currentSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
    const diagnosticsSearch = useMemo(
        () => buildBacktestDiagnosticsSearchFromSearchParams(currentSearchParams),
        [currentSearchParams]
    )
    const diagnosticsArgs = useMemo(
        () => buildBacktestDiagnosticsQueryArgsFromSearchParams(currentSearchParams),
        [currentSearchParams]
    )
    const policyBranchMegaArgs = DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch, {
                diagnosticsArgs,
                policyBranchMegaArgs
            })
        },
        [diagnosticsArgs, dispatch, policyBranchMegaArgs, queryClient]
    )

    // Analysis-хаб рендерит и hero, и overview, и карточки через один rich-text pipeline,
    // чтобы glossary был одинаковым во всех верхних входных точках раздела.
    const renderAnalysisText = useCallback((text: string) => renderTermTooltipRichText(text), [])

    const buildRouteHref = useCallback(
        (routeId: AppRoute) =>
            (
                routeId === AppRoute.BACKTEST_DIAGNOSTICS_RATINGS ||
                routeId === AppRoute.BACKTEST_POLICY_BRANCH_MEGA ||
                routeId === AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS ||
                routeId === AppRoute.BACKTEST_EXECUTION_PIPELINE
            ) ?
                `${ROUTE_PATH[routeId]}${diagnosticsSearch}`
            :   ROUTE_PATH[routeId],
        [diagnosticsSearch]
    )

    const buildOverviewLinks = useCallback(
        (links: readonly { id: string; route: AppRoute }[]) =>
            links.map(link => ({
                id: link.id,
                label: t(`analysisHome.overview.links.${link.id}`),
                to: buildRouteHref(link.route),
                onWarmup: () => handleRouteWarmup(link.route)
            })),
        [buildRouteHref, handleRouteWarmup, t]
    )

    const overviewMetrics = useMemo(
        () =>
            ANALYSIS_HOME_METRIC_IDS.map(metricId => ({
                id: metricId,
                label: t(`analysisHome.overview.metrics.${metricId}.label`),
                value: t(`analysisHome.overview.metrics.${metricId}.value`)
            })),
        [t]
    )

    const overviewFactRows = useMemo(
        () =>
            ANALYSIS_HOME_FACT_ROWS.map(row => ({
                id: row.id,
                question: renderAnalysisText(t(`analysisHome.overview.factTable.rows.${row.id}.question`)),
                answer: renderAnalysisText(t(`analysisHome.overview.factTable.rows.${row.id}.answer`)),
                links: buildOverviewLinks(row.links)
            })),
        [buildOverviewLinks, renderAnalysisText, t]
    )

    const overviewBlocks = useMemo(
        () =>
            ANALYSIS_HOME_OVERVIEW_BLOCKS.map(block => {
                const bulletIds = 'bulletIds' in block ? block.bulletIds : undefined
                const stepIds = 'stepIds' in block ? block.stepIds : undefined

                return {
                    id: block.id,
                    title: t(`analysisHome.overview.blocks.${block.id}.title`),
                    bullets: bulletIds?.map(bulletId =>
                        renderAnalysisText(t(`analysisHome.overview.blocks.${block.id}.bullets.${bulletId}`))
                    ),
                    steps: stepIds?.map(stepId =>
                        renderAnalysisText(t(`analysisHome.overview.blocks.${block.id}.steps.${stepId}`))
                    ),
                    links: buildOverviewLinks(block.links)
                }
            }),
        [buildOverviewLinks, renderAnalysisText, t]
    )

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('analysisHome.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{renderAnalysisText(t('analysisHome.hero.subtitle'))}</Text>
            </section>

            <DomainOverview
                title={t('analysisHome.overview.title')}
                subtitle={renderAnalysisText(t('analysisHome.overview.subtitle'))}
                metrics={overviewMetrics}
                factTable={{
                    title: t('analysisHome.overview.factTable.title'),
                    columns: {
                        question: t('analysisHome.overview.factTable.columns.question'),
                        answer: t('analysisHome.overview.factTable.columns.answer'),
                        details: t('analysisHome.overview.factTable.columns.details')
                    },
                    rows: overviewFactRows
                }}
                blocks={overviewBlocks}
            />

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('analysisHome.sections.title')}
                </Text>
                <div className={cls.cards}>
                    {ANALYSIS_HOME_CARDS.map(card => (
                        <Link
                            key={card.id}
                            to={buildRouteHref(card.route)}
                            className={cls.cardLink}
                            onMouseEnter={() => handleRouteWarmup(card.route)}
                            onFocus={() => handleRouteWarmup(card.route)}>
                            <article className={cls.card}>
                                <Text type='h3' className={cls.cardTitle}>
                                    {t(`analysisHome.cards.${card.id}.title`, {
                                        defaultValue:
                                            card.id === 'policyBranchMega' ? 'Policy Branch Mega'
                                            : card.id === 'executionPipeline' ? 'Execution Pipeline'
                                            : card.id === 'realForecastJournal' ? 'Real Forecast Journal'
                                            : undefined
                                    })}
                                </Text>
                                <Text className={cls.cardText}>
                                    {renderAnalysisText(t(`analysisHome.cards.${card.id}.description`))}
                                </Text>
                                <span className={cls.cardHint}>{t(`analysisHome.cards.${card.id}.hint`)}</span>
                            </article>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
