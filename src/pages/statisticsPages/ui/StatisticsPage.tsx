import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { DomainOverview, Link, Text } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import cls from '@/pages/analysisPages/ui/AnalysisPage.module.scss'
import type { StatisticsPageProps } from './types'
import { STATISTICS_HOME_CARDS } from './shared/statisticsHomeCards'
import {
    STATISTICS_HOME_FACT_ROWS,
    STATISTICS_HOME_METRIC_IDS,
    STATISTICS_HOME_OVERVIEW_BLOCKS
} from './shared/statisticsHomeContent'

export default function StatisticsPage({ className }: StatisticsPageProps) {
    const { t } = useTranslation('reports')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()

    // Statistics-хаб, как и analysis-хаб, гонит весь верхний текст через единый rich-text pipeline,
    // чтобы glossary и ссылки читались одинаково на hero, overview и карточках раздела.
    const renderStatisticsText = useCallback((text: string) => renderTermTooltipRichText(text), [])

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch)
        },
        [dispatch, queryClient]
    )

    const buildOverviewLinks = useCallback(
        (links: readonly { id: string; route: AppRoute }[]) =>
            links.map(link => ({
                id: link.id,
                label: t(`statisticsHome.overview.links.${link.id}`),
                to: ROUTE_PATH[link.route],
                onWarmup: () => handleRouteWarmup(link.route)
            })),
        [handleRouteWarmup, t]
    )

    const overviewMetrics = useMemo(
        () =>
            STATISTICS_HOME_METRIC_IDS.map(metricId => ({
                id: metricId,
                label: t(`statisticsHome.overview.metrics.${metricId}.label`),
                value: t(`statisticsHome.overview.metrics.${metricId}.value`)
            })),
        [t]
    )

    const overviewFactRows = useMemo(
        () =>
            STATISTICS_HOME_FACT_ROWS.map(row => ({
                id: row.id,
                question: renderStatisticsText(t(`statisticsHome.overview.factTable.rows.${row.id}.question`)),
                answer: renderStatisticsText(t(`statisticsHome.overview.factTable.rows.${row.id}.answer`)),
                links: buildOverviewLinks(row.links)
            })),
        [buildOverviewLinks, renderStatisticsText, t]
    )

    const overviewBlocks = useMemo(
        () =>
            STATISTICS_HOME_OVERVIEW_BLOCKS.map(block => {
                const bulletIds = 'bulletIds' in block ? block.bulletIds : undefined
                const stepIds = 'stepIds' in block ? block.stepIds : undefined

                return {
                    id: block.id,
                    title: t(`statisticsHome.overview.blocks.${block.id}.title`),
                    bullets: bulletIds?.map(bulletId =>
                        renderStatisticsText(t(`statisticsHome.overview.blocks.${block.id}.bullets.${bulletId}`))
                    ),
                    steps: stepIds?.map(stepId =>
                        renderStatisticsText(t(`statisticsHome.overview.blocks.${block.id}.steps.${stepId}`))
                    ),
                    links: buildOverviewLinks(block.links)
                }
            }),
        [buildOverviewLinks, renderStatisticsText, t]
    )

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('statisticsHome.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{renderStatisticsText(t('statisticsHome.hero.subtitle'))}</Text>
            </section>

            <DomainOverview
                title={t('statisticsHome.overview.title')}
                subtitle={renderStatisticsText(t('statisticsHome.overview.subtitle'))}
                metrics={overviewMetrics}
                factTable={{
                    title: t('statisticsHome.overview.factTable.title'),
                    columns: {
                        question: t('statisticsHome.overview.factTable.columns.question'),
                        answer: t('statisticsHome.overview.factTable.columns.answer'),
                        details: t('statisticsHome.overview.factTable.columns.details')
                    },
                    rows: overviewFactRows
                }}
                blocks={overviewBlocks}
            />

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('statisticsHome.sections.title')}
                </Text>
                <div className={cls.cards}>
                    {STATISTICS_HOME_CARDS.map(card => (
                        <Link
                            key={card.id}
                            to={ROUTE_PATH[card.route]}
                            className={cls.cardLink}
                            onMouseEnter={() => handleRouteWarmup(card.route)}
                            onFocus={() => handleRouteWarmup(card.route)}>
                            <article className={cls.card}>
                                <Text type='h3' className={cls.cardTitle}>
                                    {t(`statisticsHome.cards.${card.id}.title`)}
                                </Text>
                                <Text className={cls.cardText}>
                                    {renderStatisticsText(t(`statisticsHome.cards.${card.id}.description`))}
                                </Text>
                                <span className={cls.cardHint}>{t(`statisticsHome.cards.${card.id}.hint`)}</span>
                            </article>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
