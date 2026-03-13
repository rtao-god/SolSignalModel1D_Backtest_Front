import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import classNames from '@/shared/lib/helpers/classNames'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { DomainOverview, Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import cls from './GuidePage.module.scss'
import type { GuidePageProps } from './types'
import { GUIDE_HOME_CARDS } from './shared/guideHomeCards'
import { GUIDE_HOME_FACT_ROWS, GUIDE_HOME_METRIC_IDS, GUIDE_HOME_OVERVIEW_BLOCKS } from './shared/guideHomeContent'
import { readAvailableGuideTermGroups } from './shared/guideI18n'
import { buildGuideGlossary, renderGuideRichText } from './shared/guideRichText'

export default function GuidePage({ className }: GuidePageProps) {
    const { t, i18n } = useTranslation('guide')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch)
        },
        [dispatch, queryClient]
    )
    const glossary = useMemo(
        () => buildGuideGlossary(readAvailableGuideTermGroups(i18n, ['home.terms'])),
        [i18n, i18n.language]
    )

    const renderGuideHomeText = useCallback(
        (key: string) =>
            renderGuideRichText(t(key), {
                glossary
            }),
        [glossary, t]
    )

    const buildOverviewLinks = useCallback(
        (links: readonly { id: string; route: AppRoute }[]) =>
            links.map(link => ({
                id: link.id,
                label: t(`home.overview.links.${link.id}`),
                to: ROUTE_PATH[link.route],
                onWarmup: () => handleRouteWarmup(link.route)
            })),
        [handleRouteWarmup, t]
    )

    const overviewMetrics = useMemo(
        () =>
            GUIDE_HOME_METRIC_IDS.map(metricId => ({
                id: metricId,
                label: t(`home.overview.metrics.${metricId}.label`),
                value: t(`home.overview.metrics.${metricId}.value`)
            })),
        [t]
    )

    const overviewFactRows = useMemo(
        () =>
            GUIDE_HOME_FACT_ROWS.map(row => ({
                id: row.id,
                question: renderGuideHomeText(`home.overview.factTable.rows.${row.id}.question`),
                answer: renderGuideHomeText(`home.overview.factTable.rows.${row.id}.answer`),
                links: buildOverviewLinks(row.links)
            })),
        [buildOverviewLinks, renderGuideHomeText, t]
    )

    const overviewBlocks = useMemo(
        () =>
            GUIDE_HOME_OVERVIEW_BLOCKS.map(block => {
                const bulletIds = 'bulletIds' in block ? block.bulletIds : undefined
                const stepIds = 'stepIds' in block ? block.stepIds : undefined

                return {
                    id: block.id,
                    title: t(`home.overview.blocks.${block.id}.title`),
                    bullets: bulletIds?.map(bulletId =>
                        renderGuideHomeText(`home.overview.blocks.${block.id}.bullets.${bulletId}`)
                    ),
                    steps: stepIds?.map(stepId =>
                        renderGuideHomeText(`home.overview.blocks.${block.id}.steps.${stepId}`)
                    ),
                    links: buildOverviewLinks(block.links)
                }
            }),
        [buildOverviewLinks, renderGuideHomeText, t]
    )

    return (
        <div className={classNames(cls.GuidePageRoot, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('home.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{renderGuideHomeText('home.hero.subtitle')}</Text>
                <div className={cls.heroMeta}>
                    <span className={cls.metaPill}>{t('home.hero.meta.meaning')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.interface')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.logic')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.contract')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.checks')}</span>
                </div>
            </header>

            <DomainOverview
                title={t('home.overview.title')}
                subtitle={renderGuideHomeText('home.overview.subtitle')}
                metrics={overviewMetrics}
                factTable={{
                    title: t('home.overview.factTable.title'),
                    columns: {
                        question: t('home.overview.factTable.columns.question'),
                        answer: t('home.overview.factTable.columns.answer'),
                        details: t('home.overview.factTable.columns.details')
                    },
                    rows: overviewFactRows
                }}
                blocks={overviewBlocks}
            />

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('home.sections.title')}
                </Text>

                <div className={cls.cards}>
                    {GUIDE_HOME_CARDS.map(card => (
                        <Link
                            key={card.id}
                            to={ROUTE_PATH[card.route]}
                            className={cls.cardLink}
                            onMouseEnter={() => handleRouteWarmup(card.route)}
                            onFocus={() => handleRouteWarmup(card.route)}>
                            <article className={cls.card}>
                                <Text type='h3' className={cls.cardTitle}>
                                    {t(`home.sections.cards.${card.id}.title`)}
                                </Text>
                                <Text className={cls.cardText}>
                                    {renderGuideHomeText(`home.sections.cards.${card.id}.description`)}
                                </Text>
                                <span className={cls.cardHint}>{t(`home.sections.cards.${card.id}.hint`)}</span>
                            </article>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
