import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { DomainOverview, Link, Text } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import {
    buildBacktestDiagnosticsQueryArgsFromSearchParams,
    buildBacktestDiagnosticsSearchFromSearchParams
} from '@/shared/utils/backtestDiagnosticsQuery'
import cls from './DiagnosticsPage.module.scss'
import type { DiagnosticsPageProps } from './types'
import { DIAGNOSTICS_HOME_CARDS } from './shared/diagnosticsHomeCards'
import {
    DIAGNOSTICS_HOME_FACT_ROWS,
    DIAGNOSTICS_HOME_METRIC_IDS,
    DIAGNOSTICS_HOME_OVERVIEW_BLOCKS
} from './shared/diagnosticsHomeContent'

export default function DiagnosticsPage({ className }: DiagnosticsPageProps) {
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

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch, {
                diagnosticsArgs
            })
        },
        [diagnosticsArgs, dispatch, queryClient]
    )

    // Diagnostics-хаб обязан держать те же tooltip-термины в hero, overview и карточках,
    // иначе пользователь видит три разных словаря одной и той же причины дефекта.
    const renderDiagnosticsText = useCallback((text: string) => renderTermTooltipRichText(text), [])

    const buildRouteHref = useCallback(
        (routeId: AppRoute) => `${ROUTE_PATH[routeId]}${diagnosticsSearch}`,
        [diagnosticsSearch]
    )

    const buildOverviewLinks = useCallback(
        (links: readonly { id: string; route: AppRoute }[]) =>
            links.map(link => ({
                id: link.id,
                label: t(`diagnosticsHome.overview.links.${link.id}`),
                to:
                    (
                        link.route === AppRoute.ANALYSIS_HOME ||
                        link.route === AppRoute.GUIDE ||
                        link.route === AppRoute.DEVELOPER
                    ) ?
                        ROUTE_PATH[link.route]
                    :   buildRouteHref(link.route),
                onWarmup: () => handleRouteWarmup(link.route)
            })),
        [buildRouteHref, handleRouteWarmup, t]
    )

    const overviewMetrics = useMemo(
        () =>
            DIAGNOSTICS_HOME_METRIC_IDS.map(metricId => ({
                id: metricId,
                label: t(`diagnosticsHome.overview.metrics.${metricId}.label`),
                value: t(`diagnosticsHome.overview.metrics.${metricId}.value`)
            })),
        [t]
    )

    const overviewFactRows = useMemo(
        () =>
            DIAGNOSTICS_HOME_FACT_ROWS.map(row => ({
                id: row.id,
                question: renderDiagnosticsText(t(`diagnosticsHome.overview.factTable.rows.${row.id}.question`)),
                answer: renderDiagnosticsText(t(`diagnosticsHome.overview.factTable.rows.${row.id}.answer`)),
                links: buildOverviewLinks(row.links)
            })),
        [buildOverviewLinks, renderDiagnosticsText, t]
    )

    const overviewBlocks = useMemo(
        () =>
            DIAGNOSTICS_HOME_OVERVIEW_BLOCKS.map(block => {
                const bulletIds = 'bulletIds' in block ? block.bulletIds : undefined
                const stepIds = 'stepIds' in block ? block.stepIds : undefined

                return {
                    id: block.id,
                    title: t(`diagnosticsHome.overview.blocks.${block.id}.title`),
                    bullets: bulletIds?.map(bulletId =>
                        renderDiagnosticsText(t(`diagnosticsHome.overview.blocks.${block.id}.bullets.${bulletId}`))
                    ),
                    steps: stepIds?.map(stepId =>
                        renderDiagnosticsText(t(`diagnosticsHome.overview.blocks.${block.id}.steps.${stepId}`))
                    ),
                    links: buildOverviewLinks(block.links)
                }
            }),
        [buildOverviewLinks, renderDiagnosticsText, t]
    )

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('diagnosticsHome.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{renderDiagnosticsText(t('diagnosticsHome.hero.subtitle'))}</Text>
            </section>

            <DomainOverview
                title={t('diagnosticsHome.overview.title')}
                subtitle={renderDiagnosticsText(t('diagnosticsHome.overview.subtitle'))}
                metrics={overviewMetrics}
                factTable={{
                    title: t('diagnosticsHome.overview.factTable.title'),
                    columns: {
                        question: t('diagnosticsHome.overview.factTable.columns.question'),
                        answer: t('diagnosticsHome.overview.factTable.columns.answer'),
                        details: t('diagnosticsHome.overview.factTable.columns.details')
                    },
                    rows: overviewFactRows
                }}
                blocks={overviewBlocks}
            />

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('diagnosticsHome.sections.title')}
                </Text>
                <div className={cls.cards}>
                    {DIAGNOSTICS_HOME_CARDS.map(card => (
                        <Link
                            key={card.id}
                            to={buildRouteHref(card.route)}
                            className={cls.cardLink}
                            onMouseEnter={() => handleRouteWarmup(card.route)}
                            onFocus={() => handleRouteWarmup(card.route)}>
                            <article className={cls.card}>
                                <Text type='h3' className={cls.cardTitle}>
                                    {t(`diagnosticsHome.cards.${card.id}.title`, {
                                        defaultValue:
                                            card.id === 'guardrail' ? 'Guardrail / Specificity'
                                            : card.id === 'hotspots' ? 'Hotspots / NoTrade'
                                            : undefined
                                    })}
                                </Text>
                                <Text className={cls.cardText}>
                                    {renderDiagnosticsText(t(`diagnosticsHome.cards.${card.id}.description`))}
                                </Text>
                                <span className={cls.cardHint}>{t(`diagnosticsHome.cards.${card.id}.hint`)}</span>
                            </article>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
