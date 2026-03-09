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
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import { prefetchPolicyBranchMegaReportWithFreshness } from '@/shared/api/tanstackQueries/policyBranchMega'
import { useTranslation } from 'react-i18next'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import cls from './Main.module.scss'
import MainProps from './types'
import { readMainIntroStringListOrThrow } from './mainIntroI18n'

const DEFAULT_POLICY_BRANCH_TAB_ANCHORS = [
    'policy-branch-section-1',
    'policy-branch-section-2',
    'policy-branch-section-3',
    'policy-branch-section-4'
] as const
const MAIN_INTRO_CARD_IDS = ['project', 'data', 'window', 'models', 'history'] as const
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

interface MainIntroCardProps {
    bodyKey: string
    renderText: (text: string) => ReturnType<typeof renderTermTooltipRichText>
    title: string
}

function MainIntroCard({ title, bodyKey, renderText }: MainIntroCardProps) {
    const { i18n } = useTranslation('reports')

    return (
        <article className={cls.introCard}>
            <Text type='h3' className={cls.introCardTitle}>
                {renderText(title)}
            </Text>
            <LocalizedContentBoundary name={`MainIntro:${bodyKey}`}>
                {() => {
                    const paragraphs = readMainIntroStringListOrThrow(i18n, bodyKey)

                    return (
                        <div className={cls.introCardBody}>
                            {paragraphs.map((paragraph, index) => (
                                <Text key={`${title}-paragraph-${index}`} className={cls.introCardText}>
                                    {renderText(paragraph)}
                                </Text>
                            ))}
                        </div>
                    )
                }}
            </LocalizedContentBoundary>
        </article>
    )
}

export default function Main({ className }: MainProps) {
    const { t, i18n } = useTranslation('reports')
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
            // Сначала отдаем вводный экран и карту разделов, а heavy mega-report и его chunk прогреваем после первого paint.
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
            { label: t('main.bestPolicy.parts.part3'), anchor: DEFAULT_POLICY_BRANCH_TAB_ANCHORS[2] },
            { label: t('main.bestPolicy.parts.part4'), anchor: DEFAULT_POLICY_BRANCH_TAB_ANCHORS[3] }
        ],
        [t]
    )
    const introCards = useMemo(
        () => MAIN_INTRO_CARD_IDS.map(cardId => ({
            key: cardId,
            title: t(`main.intro.cards.${cardId}.title`),
            bodyKey: `main.intro.cards.${cardId}.body`
        })),
        [t]
    )
    const resolveMainExplicitTermLink = useCallback((termId: string) => {
        const resolveRouteLink = (routeId: AppRoute) => ({
            to: ROUTE_PATH[routeId],
            onWarmup: () => handleRouteWarmup(routeId)
        })
        const resolveRouteAnchorLink = (routeId: AppRoute, anchor: string) => ({
            to: `${ROUTE_PATH[routeId]}#${anchor}`,
            onWarmup: () => handleRouteWarmup(routeId)
        })

        switch (termId) {
            case 'backtest':
            case 'landing-backtest':
            case 'landing-backtest-summary':
                return resolveRouteLink(AppRoute.BACKTEST_SUMMARY)
            case 'landing-baseline-backtest':
                return resolveRouteLink(AppRoute.BACKTEST_BASELINE)
            case 'landing-experimental-backtest':
                return resolveRouteLink(AppRoute.BACKTEST_FULL)
            case 'landing-current-prediction':
            case 'landing-forecast':
                return resolveRouteLink(AppRoute.CURRENT_PREDICTION)
            case 'landing-prediction-history':
                return resolveRouteLink(AppRoute.CURRENT_PREDICTION_HISTORY)
            case 'landing-diagnostics':
                return resolveRouteLink(AppRoute.DIAGNOSTICS_HOME)
            case 'landing-analysis':
                return resolveRouteLink(AppRoute.ANALYSIS_HOME)
            case 'landing-policy-branch-mega':
                return resolveRouteLink(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)
            case 'landing-guardrail':
            case 'landing-specificity':
                return resolveRouteLink(AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL)
            case 'landing-attribution':
                return resolveRouteLink(AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS)
            case 'landing-hotspots':
                return resolveRouteLink(AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS)
            case 'landing-model-metrics':
                return resolveRouteLink(AppRoute.MODELS_STATS)
            case 'landing-aggregation':
                return resolveRouteLink(AppRoute.AGGREGATION_STATS)
            case 'landing-pfi':
                return resolveRouteLink(AppRoute.PFI_PER_MODEL)
            case 'landing-features':
                return resolveRouteLink(AppRoute.EXPLAIN_FEATURES)
            case 'landing-model-confidence':
                return resolveRouteLink(AppRoute.BACKTEST_CONFIDENCE_RISK)
            case 'landing-explain':
                return resolveRouteLink(AppRoute.EXPLAIN)
            case 'landing-truthfulness':
                return resolveRouteAnchorLink(AppRoute.DOCS_TRUTHFULNESS, 'truth-overview')
            case 'landing-ml-model':
            case 'landing-multi-layer':
            case 'landing-micro-model':
                return resolveRouteLink(AppRoute.EXPLAIN_MODELS)
            case 'landing-time-horizon':
                return resolveRouteLink(AppRoute.EXPLAIN_TIME)
            case 'landing-path-labeling':
                return resolveRouteLink(AppRoute.EXPLAIN_PROJECT)
            default:
                return null
        }
    }, [handleRouteWarmup])
    const renderMainRichText = useCallback(
        (text: string) =>
            renderTermTooltipRichText(text, {
                resolveExplicitTermLink: resolveMainExplicitTermLink
            }),
        [resolveMainExplicitTermLink]
    )
    const renderProjectRichText = useCallback(
        (text: string) => renderTermTooltipRichText(text),
        []
    )

    return (
        <div className={rootClassName}>
            <section className={cls.intro}>
                <div className={cls.introHeader}>
                    <span className={cls.introEyebrow}>{t('main.intro.eyebrow')}</span>
                    <Text type='h2' className={cls.introTitle}>
                        {renderProjectRichText(t('main.intro.title'))}
                    </Text>
                    <Text className={cls.introSubtitle}>{renderProjectRichText(t('main.intro.subtitle'))}</Text>
                </div>

                <div className={cls.introGrid}>
                    {introCards.map(card => (
                        <MainIntroCard
                            key={card.key}
                            title={card.title}
                            bodyKey={card.bodyKey}
                            renderText={renderProjectRichText}
                        />
                    ))}
                </div>
            </section>

            <section className={cls.sections}>
                <div className={cls.sectionHeader}>
                    <span className={cls.sectionEyebrow}>{t('main.sections.eyebrow')}</span>
                    <Text type='h2' className={cls.sectionTitle}>
                        {t('main.sections.title')}
                    </Text>
                    <Text className={cls.sectionSubtitle}>
                        {renderMainRichText(t('main.sections.subtitle'))}
                    </Text>
                </div>
                <div className={cls.navCards}>
                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {renderMainRichText(t('main.sections.cards.predictions.title'))}
                        </Text>
                        <Text className={cls.cardText}>
                            {renderMainRichText(t('main.sections.cards.predictions.description'))}
                        </Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION)}
                                onFocus={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION)}>
                                {renderTermTooltipRichText(t('main.sections.cards.predictions.links.currentPrediction'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION_HISTORY)}
                                onFocus={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION_HISTORY)}>
                                {renderTermTooltipRichText(t('main.sections.cards.predictions.links.history'))}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {renderMainRichText(t('main.sections.cards.backtest.title'))}
                        </Text>
                        <Text className={cls.cardText}>
                            {renderMainRichText(t('main.sections.cards.backtest.description'))}
                        </Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_SUMMARY]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_SUMMARY)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_SUMMARY)}>
                                {renderTermTooltipRichText(t('main.sections.cards.backtest.links.summary'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_BASELINE]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_BASELINE)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_BASELINE)}>
                                {renderTermTooltipRichText(t('main.sections.cards.backtest.links.baseline'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_FULL]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_FULL)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_FULL)}>
                                {renderTermTooltipRichText(t('main.sections.cards.backtest.links.experimental'))}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {renderMainRichText(t('main.sections.cards.analysis.title'))}
                        </Text>
                        <Text className={cls.cardText}>
                            {renderMainRichText(t('main.sections.cards.analysis.description'))}
                        </Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_RATINGS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_RATINGS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_RATINGS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.analysis.links.ratings'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.analysis.links.dayStats'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_CONFIDENCE_RISK]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_CONFIDENCE_RISK)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_CONFIDENCE_RISK)}>
                                {renderTermTooltipRichText(t('main.sections.cards.analysis.links.confidence'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}>
                                {renderTermTooltipRichText(t('main.sections.cards.analysis.links.policyBranchMega'))}
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
                            {renderMainRichText(t('main.sections.cards.diagnostics.title'))}
                        </Text>
                        <Text className={cls.cardText}>
                            {renderMainRichText(t('main.sections.cards.diagnostics.description'))}
                        </Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.diagnostics.links.risk'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL)}>
                                {renderTermTooltipRichText(t('main.sections.cards.diagnostics.links.guardrail'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.diagnostics.links.decisions'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.diagnostics.links.hotspots'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_OTHER]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_OTHER)}
                                onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_OTHER)}>
                                {renderTermTooltipRichText(t('main.sections.cards.diagnostics.links.other'))}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {renderMainRichText(t('main.sections.cards.models.title'))}
                        </Text>
                        <Text className={cls.cardText}>
                            {renderMainRichText(t('main.sections.cards.models.description'))}
                        </Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.MODELS_STATS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.MODELS_STATS)}
                                onFocus={() => handleRouteWarmup(AppRoute.MODELS_STATS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.models.links.modelStats'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.AGGREGATION_STATS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.AGGREGATION_STATS)}
                                onFocus={() => handleRouteWarmup(AppRoute.AGGREGATION_STATS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.models.links.aggregation'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.PFI_PER_MODEL]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.PFI_PER_MODEL)}
                                onFocus={() => handleRouteWarmup(AppRoute.PFI_PER_MODEL)}>
                                {renderTermTooltipRichText(t('main.sections.cards.models.links.pfi'))}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {renderMainRichText(t('main.sections.cards.docs.title'))}
                        </Text>
                        <Text className={cls.cardText}>{renderMainRichText(t('main.sections.cards.docs.description'))}</Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.DOCS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.DOCS)}
                                onFocus={() => handleRouteWarmup(AppRoute.DOCS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.docs.links.docsHome'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.DOCS_MODELS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.DOCS_MODELS)}
                                onFocus={() => handleRouteWarmup(AppRoute.DOCS_MODELS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.docs.links.models'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.DOCS_TESTS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.DOCS_TESTS)}
                                onFocus={() => handleRouteWarmup(AppRoute.DOCS_TESTS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.docs.links.tests'))}
                            </Link>
                            <Link
                                to={`${ROUTE_PATH[AppRoute.DOCS_TRUTHFULNESS]}#truth-overview`}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.DOCS_TRUTHFULNESS)}
                                onFocus={() => handleRouteWarmup(AppRoute.DOCS_TRUTHFULNESS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.docs.links.truthfulness'))}
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {renderMainRichText(t('main.sections.cards.explain.title'))}
                        </Text>
                        <Text className={cls.cardText}>
                            {renderMainRichText(t('main.sections.cards.explain.description'))}
                        </Text>
                        <div className={cls.navLinks}>
                            <Link
                                to={ROUTE_PATH[AppRoute.EXPLAIN]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.EXPLAIN)}
                                onFocus={() => handleRouteWarmup(AppRoute.EXPLAIN)}>
                                {renderTermTooltipRichText(t('main.sections.cards.explain.links.explainHome'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.EXPLAIN_MODELS]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.EXPLAIN_MODELS)}
                                onFocus={() => handleRouteWarmup(AppRoute.EXPLAIN_MODELS)}>
                                {renderTermTooltipRichText(t('main.sections.cards.explain.links.models'))}
                            </Link>
                            <Link
                                to={ROUTE_PATH[AppRoute.EXPLAIN_PROJECT]}
                                className={cls.navLink}
                                onMouseEnter={() => handleRouteWarmup(AppRoute.EXPLAIN_PROJECT)}
                                onFocus={() => handleRouteWarmup(AppRoute.EXPLAIN_PROJECT)}>
                                {renderTermTooltipRichText(t('main.sections.cards.explain.links.project'))}
                            </Link>
                        </div>
                    </article>
                </div>
            </section>

            <SectionErrorBoundary name='MainBestPolicy'>
                <section className={cls.bestPolicy}>
                    <div className={cls.bestPolicyHeader}>
                        <div>
                            <Text type='h2' className={cls.sectionTitle}>
                                {renderMainRichText(t('main.bestPolicy.title'))}
                            </Text>
                            <Text className={cls.bestPolicySubtitle}>
                                {renderMainRichText(t('main.bestPolicy.subtitle'))}
                            </Text>
                        </div>
                        <Link
                            to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]}
                            className={cls.bestPolicyLink}
                            onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}
                            onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}>
                            {renderTermTooltipRichText(t('main.bestPolicy.openMega'))}
                        </Link>
                    </div>

                    {isBestPolicyReady ?
                        <Suspense fallback={<Text>{renderTermTooltipRichText(t('main.bestPolicy.loading'))}</Text>}>
                            <MainBestPolicySection />
                        </Suspense>
                    :   <Text>{renderTermTooltipRichText(t('main.bestPolicy.loading'))}</Text>}
                </section>
            </SectionErrorBoundary>
        </div>
    )
}


