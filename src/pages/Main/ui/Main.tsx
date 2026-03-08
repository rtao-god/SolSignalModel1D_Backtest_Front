import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { prefetchRouteChunk } from '@/app/providers/router/config/routeConfig'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { prefetchPolicyBranchMegaReportWithFreshness } from '@/shared/api/tanstackQueries/policyBranchMega'
import { useTranslation } from 'react-i18next'
import cls from './Main.module.scss'
import MainProps from './types'

const DEFAULT_POLICY_BRANCH_TAB_ANCHORS = [
    'policy-branch-section-1',
    'policy-branch-section-2',
    'policy-branch-section-3'
] as const
const importMainBestPolicySection = () => import('./MainBestPolicySection')
const MainBestPolicySection = lazy(importMainBestPolicySection)

type DeferredWarmupWindow = Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (handle: number) => void
}

function scheduleAfterFirstPaint(callback: () => void): () => void {
    const deferredWindow = window as DeferredWarmupWindow
    let frameHandle: number | null = null
    let idleHandle: number | null = null
    let timeoutHandle: number | null = null

    frameHandle = window.requestAnimationFrame(() => {
        frameHandle = null

        if (typeof deferredWindow.requestIdleCallback === 'function') {
            idleHandle = deferredWindow.requestIdleCallback(() => callback(), {
                timeout: 1200
            })
            return
        }

        timeoutHandle = window.setTimeout(callback, 220)
    })

    return () => {
        if (frameHandle !== null) {
            window.cancelAnimationFrame(frameHandle)
        }

        if (idleHandle !== null && typeof deferredWindow.cancelIdleCallback === 'function') {
            deferredWindow.cancelIdleCallback(idleHandle)
        }

        if (timeoutHandle !== null) {
            window.clearTimeout(timeoutHandle)
        }
    }
}

function logMainWarmupError(error: unknown): void {
    if (!import.meta.env.DEV) {
        return
    }

    const safeError = error instanceof Error ? error : new Error(String(error ?? 'Unknown warmup error.'))
    console.warn('[main] Failed to warm up Policy Branch Mega.', safeError)
}

export default function Main({ className }: MainProps) {
    const { t } = useTranslation('reports')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()
    const [isBestPolicyReady, setIsBestPolicyReady] = useState(false)

    const handleRouteWarmup = useCallback((routeId: AppRoute) => {
        warmupRouteNavigation(routeId, queryClient, dispatch)
    }, [dispatch, queryClient])
    const rootClassName = classNames(cls.MainPage, {}, [className ?? ''])

    useEffect(() => {
        let isCancelled = false

        const cancelWarmup = scheduleAfterFirstPaint(() => {
            // Сначала отдаем hero/overview/nav, а heavy mega-report и его chunk прогреваем уже после первого paint.
            prefetchRouteChunk(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)
            void importMainBestPolicySection()

            void prefetchPolicyBranchMegaReportWithFreshness(queryClient)
                .catch(logMainWarmupError)
                .finally(() => {
                    if (!isCancelled) {
                        setIsBestPolicyReady(true)
                    }
                })
        })

        return () => {
            isCancelled = true
            cancelWarmup()
        }
    }, [queryClient])

    const defaultPolicyBranchTabs = useMemo(
        () => [
            { label: t('main.bestPolicy.parts.part1'), anchor: DEFAULT_POLICY_BRANCH_TAB_ANCHORS[0] },
            { label: t('main.bestPolicy.parts.part2'), anchor: DEFAULT_POLICY_BRANCH_TAB_ANCHORS[1] },
            { label: t('main.bestPolicy.parts.part3'), anchor: DEFAULT_POLICY_BRANCH_TAB_ANCHORS[2] }
        ],
        [t]
    )

    return (
        <div className={rootClassName}>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('main.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('main.hero.subtitle')}</Text>
                <div className={cls.heroMeta}>
                    <div className={cls.metaPill}>{t('main.hero.meta.horizon')}</div>
                    <div className={cls.metaPill}>{t('main.hero.meta.pathLabeling')}</div>
                    <div className={cls.metaPill}>{t('main.hero.meta.multiLayer')}</div>
                    <div className={cls.metaPill}>{t('main.hero.meta.backtest')}</div>
                </div>
            </section>

            <section className={cls.overview}>
                <Text type='h2' className={cls.sectionTitle}>
                    {t('main.overview.title')}
                </Text>
                <div className={cls.overviewGrid}>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.overview.cards.predictions.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.overview.cards.predictions.description')}</Text>
                    </article>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.overview.cards.backtest.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.overview.cards.backtest.description')}</Text>
                    </article>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.overview.cards.diagnostics.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.overview.cards.diagnostics.description')}</Text>
                    </article>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.overview.cards.models.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.overview.cards.models.description')}</Text>
                    </article>
                </div>
            </section>

            <section className={cls.flow}>
                <Text type='h2' className={cls.sectionTitle}>
                    {t('main.flow.title')}
                </Text>
                <Text className={cls.flowSubtitle}>{t('main.flow.subtitle')}</Text>
                <div className={cls.flowRow}>
                    <div className={cls.flowStep}>{t('main.flow.steps.currentPrediction')}</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>{t('main.flow.steps.history')}</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>{t('main.flow.steps.backtestSummary')}</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>{t('main.flow.steps.policyBranchMega')}</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>{t('main.flow.steps.diagnostics')}</div>
                </div>
            </section>

            <SectionErrorBoundary name='MainBestPolicy'>
                <section className={cls.bestPolicy}>
                    <div className={cls.bestPolicyHeader}>
                        <div>
                            <Text type='h2' className={cls.sectionTitle}>
                                {t('main.bestPolicy.title')}
                            </Text>
                            <Text className={cls.bestPolicySubtitle}>{t('main.bestPolicy.subtitle')}</Text>
                        </div>
                        <Link
                            to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]}
                            className={cls.bestPolicyLink}
                            onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}
                            onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}>
                            {t('main.bestPolicy.openMega')}
                        </Link>
                    </div>

                    {isBestPolicyReady ?
                        <Suspense fallback={<Text>{t('main.bestPolicy.loading')}</Text>}>
                            <MainBestPolicySection />
                        </Suspense>
                    :   <Text>{t('main.bestPolicy.loading')}</Text>}
                </section>
            </SectionErrorBoundary>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionTitle}>
                    {t('main.sections.title')}
                </Text>
                <div className={cls.navCards}>
                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.predictions.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.predictions.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION)}
                                onFocus={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION)}>
                                {t('main.sections.cards.predictions.links.currentPrediction')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION_HISTORY)}
                                onFocus={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION_HISTORY)}>
                                {t('main.sections.cards.predictions.links.history')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.backtest.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.backtest.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_SUMMARY]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_SUMMARY)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_SUMMARY)}>
                                {t('main.sections.cards.backtest.links.summary')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_BASELINE]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_BASELINE)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_BASELINE)}>
                                {t('main.sections.cards.backtest.links.baseline')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_FULL]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_FULL)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_FULL)}>
                                {t('main.sections.cards.backtest.links.experimental')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.analysis.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.analysis.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_RATINGS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_RATINGS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_RATINGS)}>
                                {t('main.sections.cards.analysis.links.ratings')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS)}>
                                {t('main.sections.cards.analysis.links.dayStats')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_CONFIDENCE_RISK]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_CONFIDENCE_RISK)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_CONFIDENCE_RISK)}>
                                {t('main.sections.cards.analysis.links.confidence')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}>
                                {t('main.sections.cards.analysis.links.policyBranchMega')}
                            </Link>
                            <div className={cls.navSublinks}>
                                {defaultPolicyBranchTabs.map(tab => (
                                    <Link
                                        key={tab.anchor}
                                        to={`${ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]}#${tab.anchor}`}
                                        className={cls.navSubLink}
                                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}
                                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}>
                                        {tab.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.diagnostics.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.diagnostics.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS)}>
                                {t('main.sections.cards.diagnostics.links.risk')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL)}>
                                {t('main.sections.cards.diagnostics.links.guardrail')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS)}>
                                {t('main.sections.cards.diagnostics.links.decisions')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS)}>
                                {t('main.sections.cards.diagnostics.links.hotspots')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_OTHER]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_OTHER)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_OTHER)}>
                                {t('main.sections.cards.diagnostics.links.other')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.models.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.models.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.MODELS_STATS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.MODELS_STATS)}
                                onFocus={() => handleRouteWarmup(AppRoute.MODELS_STATS)}>
                                {t('main.sections.cards.models.links.modelStats')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.AGGREGATION_STATS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.AGGREGATION_STATS)}
                                onFocus={() => handleRouteWarmup(AppRoute.AGGREGATION_STATS)}>
                                {t('main.sections.cards.models.links.aggregation')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.PFI_PER_MODEL]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.PFI_PER_MODEL)}
                                onFocus={() => handleRouteWarmup(AppRoute.PFI_PER_MODEL)}>
                                {t('main.sections.cards.models.links.pfi')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.docs.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.docs.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.DOCS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.DOCS)}
                                onFocus={() => handleRouteWarmup(AppRoute.DOCS)}>
                                {t('main.sections.cards.docs.links.docsHome')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.DOCS_MODELS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.DOCS_MODELS)}
                                onFocus={() => handleRouteWarmup(AppRoute.DOCS_MODELS)}>
                                {t('main.sections.cards.docs.links.models')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.DOCS_TESTS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.DOCS_TESTS)}
                                onFocus={() => handleRouteWarmup(AppRoute.DOCS_TESTS)}>
                                {t('main.sections.cards.docs.links.tests')}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('main.sections.cards.explain.title')}
                        </Text>
                        <Text className={cls.cardText}>{t('main.sections.cards.explain.description')}</Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.EXPLAIN]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.EXPLAIN)}
                                onFocus={() => handleRouteWarmup(AppRoute.EXPLAIN)}>
                                {t('main.sections.cards.explain.links.explainHome')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.EXPLAIN_MODELS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.EXPLAIN_MODELS)}
                                onFocus={() => handleRouteWarmup(AppRoute.EXPLAIN_MODELS)}>
                                {t('main.sections.cards.explain.links.models')}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.EXPLAIN_PROJECT]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.EXPLAIN_PROJECT)}
                                onFocus={() => handleRouteWarmup(AppRoute.EXPLAIN_PROJECT)}>
                                {t('main.sections.cards.explain.links.project')}
                            </Link>
                        </div>
                    </article>
                </div>
            </section>
        </div>
    )
}
