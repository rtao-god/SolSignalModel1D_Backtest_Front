import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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
import {
    DEFAULT_BACKFILLED_HISTORY_SCOPE,
    useCurrentPredictionIndexQuery
} from '@/shared/api/tanstackQueries/currentPrediction'
import { useBacktestBaselineSummaryReportQuery } from '@/shared/api/tanstackQueries/backtest'
import type { CurrentPredictionIndexItemDto } from '@/shared/api/endpoints/reportEndpoints'
import type { KeyValueSectionDto, ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'
import { useTranslation } from 'react-i18next'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { BulletList } from '@/shared/ui/BulletList'
import { formatDateWithLocaleOrThrow } from '@/shared/utils/dateFormat'
import cls from './Main.module.scss'
import MainProps from './types'
import { readMainStringListOrThrow } from './mainLandingI18n'
import { MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY } from './mainPolicyBranchMegaQuery'

const HERO_BULLETS_KEY = 'main.hero.bullets'
const HERO_SUBTITLE_PARAGRAPHS_KEY = 'main.hero.subtitleParagraphs'
const PROOF_SECTION_DOM_ID = 'main-proof'
const AUDIENCE_CARD_IDS = ['business', 'analyst', 'quantRisk'] as const
const WORKFLOW_STEP_IDS = ['forecast', 'archive', 'validate'] as const
const TOUR_GROUP_DEFS = [
    {
        id: 'today',
        tiles: [{ id: 'forecast', routeId: AppRoute.CURRENT_PREDICTION }]
    },
    {
        id: 'validation',
        tiles: [
            { id: 'history', routeId: AppRoute.CURRENT_PREDICTION_HISTORY },
            { id: 'summary', routeId: AppRoute.BACKTEST_SUMMARY },
            { id: 'mega', routeId: AppRoute.BACKTEST_POLICY_BRANCH_MEGA }
        ]
    },
    {
        id: 'causes',
        tiles: [
            { id: 'diagnostics', routeId: AppRoute.DIAGNOSTICS_HOME },
            { id: 'guardrail', routeId: AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL },
            { id: 'hotspots', routeId: AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS }
        ]
    }
] as const
const importMainBestPolicySection = () => import('./MainBestPolicySection')
const MainBestPolicySection = lazy(importMainBestPolicySection)

type DeferredWarmupWindow = Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (handle: number) => void
}

interface MainTextCardProps {
    badge?: string
    bodyKey: string
    renderText: (text: string) => ReactNode
    title: string
}

interface MainSectionHeaderProps {
    eyebrow: string
    renderText: (text: string) => ReactNode
    subtitle: string
    title: string
}

interface MainCardErrorProps {
    description: string
    details?: string
    title: string
}

interface MainProofFactItem {
    label: string
    value: string
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

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

function formatLocalizedDateOrThrow(value: string, locale: string): string {
    const isoValue = value.includes('T') ? value : `${value}T00:00:00Z`
    const parsed = new Date(isoValue)

    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`[main] Invalid date value: ${value}.`)
    }

    return formatDateWithLocaleOrThrow(parsed, locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

function formatLocalizedNumberOrThrow(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[main] Number must be finite. value=${value}.`)
    }

    return new Intl.NumberFormat(locale, options).format(value)
}

function formatPercentValueOrThrow(rawValue: string, locale: string): string {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
        throw new Error(`[main] Percent value must be finite. value=${rawValue}.`)
    }

    return `${formatLocalizedNumberOrThrow(parsed, locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}%`
}

function formatIntegerValueOrThrow(rawValue: string, locale: string): string {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
        throw new Error(`[main] Integer-like value must be finite. value=${rawValue}.`)
    }

    return formatLocalizedNumberOrThrow(parsed, locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })
}

function buildPredictionArchiveProofFactsOrThrow(
    index: CurrentPredictionIndexItemDto[],
    locale: string
): { firstDate: string; lastDate: string; totalDays: string } {
    const orderedDates = Array.from(new Set(index.map(item => item.predictionDateUtc))).sort((left, right) =>
        left < right ? -1
        : left > right ? 1
        : 0
    )

    if (orderedDates.length === 0) {
        throw new Error('[main] Current prediction backfilled index is empty.')
    }

    return {
        firstDate: formatLocalizedDateOrThrow(orderedDates[0], locale),
        lastDate: formatLocalizedDateOrThrow(orderedDates[orderedDates.length - 1], locale),
        totalDays: formatLocalizedNumberOrThrow(orderedDates.length, locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })
    }
}

function findKeyValueSectionOrThrow(report: ReportDocumentDto, sectionKey: string): KeyValueSectionDto {
    const section = report.sections.find(candidate => candidate.sectionKey === sectionKey)
    if (!section) {
        throw new Error(`[main] Key-value section is missing. sectionKey=${sectionKey}.`)
    }

    if (!isKeyValueSection(section)) {
        throw new Error(`[main] Section is not key-value. sectionKey=${sectionKey}.`)
    }

    return section
}

function findSectionItemValueOrThrow(section: KeyValueSectionDto, itemKey: string): string {
    const item = (section.items ?? []).find(candidate => (candidate.itemKey ?? '').trim() === itemKey)
    if (!item) {
        throw new Error(
            `[main] Key-value item is missing. section=${section.sectionKey ?? 'unknown'}, itemKey=${itemKey}.`
        )
    }

    if (typeof item.value !== 'string' || item.value.trim().length === 0) {
        throw new Error(
            `[main] Key-value item is invalid. section=${section.sectionKey ?? 'unknown'}, itemKey=${itemKey}.`
        )
    }

    return item.value
}

function buildBacktestProofFactsOrThrow(
    report: ReportDocumentDto,
    locale: string
): {
    dateRange: string
    signalDays: string
    bestTotalPnlPct: string
    worstMaxDdPct: string
    policiesWithLiquidation: string
} {
    const summarySection = findKeyValueSectionOrThrow(report, 'summary_parameters')
    const fromDateUtc = findSectionItemValueOrThrow(summarySection, 'from_date_utc')
    const toDateUtc = findSectionItemValueOrThrow(summarySection, 'to_date_utc')
    const signalDays = findSectionItemValueOrThrow(summarySection, 'signal_days')
    const bestTotalPnlPct = findSectionItemValueOrThrow(summarySection, 'best_total_pnl_pct')
    const worstMaxDdPct = findSectionItemValueOrThrow(summarySection, 'worst_max_dd_pct')
    const policiesWithLiquidation = findSectionItemValueOrThrow(summarySection, 'policies_with_liquidation')

    return {
        dateRange: `${formatLocalizedDateOrThrow(fromDateUtc, locale)} - ${formatLocalizedDateOrThrow(toDateUtc, locale)}`,
        signalDays: formatIntegerValueOrThrow(signalDays, locale),
        bestTotalPnlPct: formatPercentValueOrThrow(bestTotalPnlPct, locale),
        worstMaxDdPct: formatPercentValueOrThrow(worstMaxDdPct, locale),
        policiesWithLiquidation: formatIntegerValueOrThrow(policiesWithLiquidation, locale)
    }
}

function MainTextCard({ badge, title, bodyKey, renderText }: MainTextCardProps) {
    const { i18n } = useTranslation('reports')

    return (
        <article className={cls.contentCard}>
            {badge && <span className={cls.contentCardBadge}>{badge}</span>}
            <Text type='h3' className={cls.contentCardTitle}>
                {renderText(title)}
            </Text>
            <LocalizedContentBoundary name={`Main:${bodyKey}`}>
                {() => {
                    const paragraphs = readMainStringListOrThrow(i18n, bodyKey)

                    return (
                        <div className={cls.contentCardBody}>
                            {paragraphs.map((paragraph, index) => (
                                <Text key={`${bodyKey}-${index}`} className={cls.contentCardText}>
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

function MainSectionHeader({ eyebrow, title, subtitle, renderText }: MainSectionHeaderProps) {
    return (
        <div className={cls.sectionHeader}>
            <span className={cls.sectionEyebrow}>{eyebrow}</span>
            <Text type='h2' className={cls.sectionTitle}>
                {renderText(title)}
            </Text>
            <Text className={cls.sectionSubtitle}>{renderText(subtitle)}</Text>
        </div>
    )
}

function MainCardError({ title, description, details }: MainCardErrorProps) {
    return (
        <div className={cls.cardError}>
            <Text type='p' className={cls.cardErrorTitle}>
                {title}
            </Text>
            <Text className={cls.cardErrorText}>{description}</Text>
            {details && <Text className={cls.cardErrorDetails}>{details}</Text>}
        </div>
    )
}

function MainProofFacts({
    items,
    renderText
}: {
    items: MainProofFactItem[]
    renderText: (text: string) => ReactNode
}) {
    return (
        <dl className={cls.proofFacts}>
            {items.map(item => (
                <div key={item.label} className={cls.proofFactRow}>
                    <dt className={cls.proofFactLabel}>{renderText(item.label)}</dt>
                    <dd className={cls.proofFactValue}>{item.value}</dd>
                </div>
            ))}
        </dl>
    )
}

export default function Main({ className }: MainProps) {
    const { t, i18n } = useTranslation('reports')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()
    const [isBestPolicyReady, setIsBestPolicyReady] = useState(false)

    const locale = i18n.resolvedLanguage ?? i18n.language
    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch)
        },
        [dispatch, queryClient]
    )
    const rootClassName = classNames(cls.MainPage, {}, [className ?? ''])

    useEffect(() => {
        let isCancelled = false

        const cancelWarmup = scheduleAfterFirstPaint(() => {
            // Полная таблица Policy Branch Mega остаётся deferred-слоем, чтобы hero и proof-карточки были приоритетом первого экрана.
            prefetchRouteChunk(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)
            void importMainBestPolicySection()

            void prefetchPolicyBranchMegaReportWithFreshness(queryClient, MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY)
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

    const {
        data: archiveIndex,
        isLoading: isArchiveLoading,
        error: archiveError
    } = useCurrentPredictionIndexQuery('backfilled', undefined, DEFAULT_BACKFILLED_HISTORY_SCOPE)
    const {
        data: backtestSummaryReport,
        isLoading: isBacktestProofLoading,
        error: backtestProofError
    } = useBacktestBaselineSummaryReportQuery()

    const audienceCards = useMemo(
        () =>
            AUDIENCE_CARD_IDS.map(cardId => ({
                key: cardId,
                title: t(`main.audience.cards.${cardId}.title`),
                bodyKey: `main.audience.cards.${cardId}.body`
            })),
        [t]
    )
    const workflowSteps = useMemo(
        () =>
            WORKFLOW_STEP_IDS.map((stepId, index) => ({
                key: stepId,
                badge: String(index + 1),
                title: t(`main.workflow.steps.${stepId}.title`),
                bodyKey: `main.workflow.steps.${stepId}.body`
            })),
        [t]
    )
    const archiveProofState = useMemo(() => {
        if (!archiveIndex) {
            return {
                data: null as ReturnType<typeof buildPredictionArchiveProofFactsOrThrow> | null,
                error: null as Error | null
            }
        }

        try {
            return {
                data: buildPredictionArchiveProofFactsOrThrow(archiveIndex, locale),
                error: null as Error | null
            }
        } catch (error) {
            return {
                data: null as ReturnType<typeof buildPredictionArchiveProofFactsOrThrow> | null,
                error: error instanceof Error ? error : new Error(String(error))
            }
        }
    }, [archiveIndex, locale])
    const backtestProofState = useMemo(() => {
        if (!backtestSummaryReport) {
            return {
                data: null as ReturnType<typeof buildBacktestProofFactsOrThrow> | null,
                error: null as Error | null
            }
        }

        try {
            return {
                data: buildBacktestProofFactsOrThrow(backtestSummaryReport, locale),
                error: null as Error | null
            }
        } catch (error) {
            return {
                data: null as ReturnType<typeof buildBacktestProofFactsOrThrow> | null,
                error: error instanceof Error ? error : new Error(String(error))
            }
        }
    }, [backtestSummaryReport, locale])
    const archiveProofCardError = useMemo(() => {
        if (archiveError) {
            return archiveError
        }

        if (archiveProofState.error) {
            return archiveProofState.error
        }

        if (!isArchiveLoading && !archiveProofState.data) {
            return new Error('[main] Archive proof data is missing after query resolution.')
        }

        return null
    }, [archiveError, archiveProofState.data, archiveProofState.error, isArchiveLoading])
    const backtestProofCardError = useMemo(() => {
        if (backtestProofError) {
            return backtestProofError
        }

        if (backtestProofState.error) {
            return backtestProofState.error
        }

        if (!isBacktestProofLoading && !backtestProofState.data) {
            return new Error('[main] Backtest proof data is missing after query resolution.')
        }

        return null
    }, [backtestProofError, backtestProofState.data, backtestProofState.error, isBacktestProofLoading])
    const resolveMainExplicitTermLink = useCallback(
        (termId: string) => {
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
                case 'landing-no-trade':
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
                case 'landing-trading-policy':
                    return resolveRouteLink(AppRoute.EXPLAIN_MODELS)
                case 'landing-time-horizon':
                    return resolveRouteLink(AppRoute.EXPLAIN_TIME)
                case 'landing-path-labeling':
                    return resolveRouteLink(AppRoute.EXPLAIN_PROJECT)
                default:
                    return null
            }
        },
        [handleRouteWarmup]
    )
    const renderMainRichText = useCallback(
        (text: string) =>
            renderTermTooltipRichText(text, {
                resolveExplicitTermLink: resolveMainExplicitTermLink
            }),
        [resolveMainExplicitTermLink]
    )
    const scrollToProofSection = useCallback(() => {
        document.getElementById(PROOF_SECTION_DOM_ID)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        })
    }, [])

    return (
        <div className={rootClassName}>
            <section className={cls.hero}>
                <div className={cls.heroContent}>
                    <span className={cls.heroEyebrow}>{t('main.hero.eyebrow')}</span>
                    <Text type='h1' className={cls.heroTitle}>
                        {renderMainRichText(t('main.hero.title'))}
                    </Text>
                    <LocalizedContentBoundary name='MainHeroSubtitle'>
                        {() => {
                            const heroSubtitleParagraphs = readMainStringListOrThrow(i18n, HERO_SUBTITLE_PARAGRAPHS_KEY)

                            return (
                                <div className={cls.heroSubtitle}>
                                    {heroSubtitleParagraphs.map((paragraph, index) => (
                                        <Text key={`hero-subtitle-${index}`} className={cls.heroSubtitleParagraph}>
                                            {renderMainRichText(paragraph)}
                                        </Text>
                                    ))}
                                </div>
                            )
                        }}
                    </LocalizedContentBoundary>

                    <div className={cls.heroActions}>
                        <Link
                            to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION]}
                            className={classNames(cls.heroAction, {}, [cls.heroActionPrimary])}
                            onMouseEnter={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION)}
                            onFocus={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION)}>
                            {renderTermTooltipRichText(t('main.hero.ctaForecast'))}
                        </Link>
                        <button
                            type='button'
                            className={classNames(cls.heroAction, {}, [cls.heroActionSecondary])}
                            onClick={scrollToProofSection}>
                            {renderTermTooltipRichText(t('main.hero.ctaProof'))}
                        </button>
                    </div>
                </div>

                <div className={cls.heroPanel}>
                    <Text type='h3' className={cls.heroPanelTitle}>
                        {t('main.hero.panelTitle')}
                    </Text>
                    <LocalizedContentBoundary name='MainHeroBullets'>
                        {() => {
                            const heroBullets = readMainStringListOrThrow(i18n, HERO_BULLETS_KEY)

                            return (
                                <BulletList
                                    className={cls.heroBulletList}
                                    itemClassName={cls.heroBulletItem}
                                    contentClassName={cls.heroBulletText}
                                    items={heroBullets.map((bullet, index) => ({
                                        key: `hero-bullet-${index}`,
                                        content: renderMainRichText(bullet)
                                    }))}
                                />
                            )
                        }}
                    </LocalizedContentBoundary>
                </div>
            </section>

            <section className={cls.sectionSurface}>
                <MainSectionHeader
                    eyebrow={t('main.audience.eyebrow')}
                    title={t('main.audience.title')}
                    subtitle={t('main.audience.subtitle')}
                    renderText={renderMainRichText}
                />
                <div className={cls.audienceGrid}>
                    {audienceCards.map(card => (
                        <MainTextCard
                            key={card.key}
                            title={card.title}
                            bodyKey={card.bodyKey}
                            renderText={renderMainRichText}
                        />
                    ))}
                </div>
            </section>

            <section className={cls.sectionSurface}>
                <MainSectionHeader
                    eyebrow={t('main.workflow.eyebrow')}
                    title={t('main.workflow.title')}
                    subtitle={t('main.workflow.subtitle')}
                    renderText={renderMainRichText}
                />
                <div className={cls.workflowGrid}>
                    {workflowSteps.map(step => (
                        <MainTextCard
                            key={step.key}
                            badge={step.badge}
                            title={step.title}
                            bodyKey={step.bodyKey}
                            renderText={renderMainRichText}
                        />
                    ))}
                </div>
            </section>

            <section id={PROOF_SECTION_DOM_ID} className={cls.sectionSurface}>
                <MainSectionHeader
                    eyebrow={t('main.proof.eyebrow')}
                    title={t('main.proof.title')}
                    subtitle={t('main.proof.subtitle')}
                    renderText={renderMainRichText}
                />
                <div className={cls.proofGrid}>
                    <article className={cls.proofCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {renderMainRichText(t('main.proof.cards.archive.title'))}
                        </Text>
                        <Text className={cls.cardText}>
                            {renderMainRichText(t('main.proof.cards.archive.description'))}
                        </Text>

                        {isArchiveLoading ?
                            <Text className={cls.cardStatus}>{t('main.proof.cards.archive.loading')}</Text>
                        : archiveProofCardError ?
                            <MainCardError
                                title={t('main.proof.cards.archive.errorTitle')}
                                description={t('main.proof.cards.archive.errorDescription')}
                                details={archiveProofCardError.message}
                            />
                        : archiveProofState.data ?
                            <MainProofFacts
                                renderText={renderMainRichText}
                                items={[
                                    {
                                        label: t('main.proof.cards.archive.facts.start'),
                                        value: archiveProofState.data.firstDate
                                    },
                                    {
                                        label: t('main.proof.cards.archive.facts.latest'),
                                        value: archiveProofState.data.lastDate
                                    },
                                    {
                                        label: t('main.proof.cards.archive.facts.days'),
                                        value: archiveProofState.data.totalDays
                                    }
                                ]}
                            />
                        :   null}

                        <Link
                            to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY]}
                            className={cls.cardLink}
                            onMouseEnter={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION_HISTORY)}
                            onFocus={() => handleRouteWarmup(AppRoute.CURRENT_PREDICTION_HISTORY)}>
                            {renderTermTooltipRichText(t('main.proof.cards.archive.linkLabel'))}
                        </Link>
                    </article>

                    <article className={cls.proofCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {renderMainRichText(t('main.proof.cards.backtest.title'))}
                        </Text>
                        <Text className={cls.cardText}>
                            {renderMainRichText(t('main.proof.cards.backtest.description'))}
                        </Text>

                        {isBacktestProofLoading ?
                            <Text className={cls.cardStatus}>{t('main.proof.cards.backtest.loading')}</Text>
                        : backtestProofCardError ?
                            <MainCardError
                                title={t('main.proof.cards.backtest.errorTitle')}
                                description={t('main.proof.cards.backtest.errorDescription')}
                                details={backtestProofCardError.message}
                            />
                        : backtestProofState.data ?
                            <MainProofFacts
                                renderText={renderMainRichText}
                                items={[
                                    {
                                        label: t('main.proof.cards.backtest.facts.range'),
                                        value: backtestProofState.data.dateRange
                                    },
                                    {
                                        label: t('main.proof.cards.backtest.facts.signalDays'),
                                        value: backtestProofState.data.signalDays
                                    },
                                    {
                                        label: t('main.proof.cards.backtest.facts.bestTotalPnl'),
                                        value: backtestProofState.data.bestTotalPnlPct
                                    },
                                    {
                                        label: t('main.proof.cards.backtest.facts.worstMaxDd'),
                                        value: backtestProofState.data.worstMaxDdPct
                                    },
                                    {
                                        label: t('main.proof.cards.backtest.facts.policiesWithLiquidation'),
                                        value: backtestProofState.data.policiesWithLiquidation
                                    }
                                ]}
                            />
                        :   null}

                        <Link
                            to={ROUTE_PATH[AppRoute.BACKTEST_SUMMARY]}
                            className={cls.cardLink}
                            onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_SUMMARY)}
                            onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_SUMMARY)}>
                            {renderTermTooltipRichText(t('main.proof.cards.backtest.linkLabel'))}
                        </Link>
                    </article>

                    <article className={cls.proofCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            {renderMainRichText(t('main.proof.cards.truth.title'))}
                        </Text>
                        <Text className={cls.cardText}>
                            {renderMainRichText(t('main.proof.cards.truth.description'))}
                        </Text>
                        <Link
                            to={`${ROUTE_PATH[AppRoute.DOCS_TRUTHFULNESS]}#truth-overview`}
                            className={cls.cardLink}
                            onMouseEnter={() => handleRouteWarmup(AppRoute.DOCS_TRUTHFULNESS)}
                            onFocus={() => handleRouteWarmup(AppRoute.DOCS_TRUTHFULNESS)}>
                            {renderTermTooltipRichText(t('main.proof.cards.truth.linkLabel'))}
                        </Link>
                    </article>
                </div>
            </section>

            <section className={cls.sectionSurface}>
                <MainSectionHeader
                    eyebrow={t('main.tour.eyebrow')}
                    title={t('main.tour.title')}
                    subtitle={t('main.tour.subtitle')}
                    renderText={renderMainRichText}
                />
                <div className={cls.tourGroups}>
                    {TOUR_GROUP_DEFS.map(group => (
                        <div key={group.id} className={cls.tourGroup}>
                            <div className={cls.tourGroupHeader}>
                                <Text type='h3' className={cls.cardTitle}>
                                    {renderMainRichText(t(`main.tour.groups.${group.id}.title`))}
                                </Text>
                                <Text className={cls.cardText}>
                                    {renderMainRichText(t(`main.tour.groups.${group.id}.description`))}
                                </Text>
                            </div>

                            <div className={cls.tourTiles}>
                                {group.tiles.map(tile => (
                                    <article key={tile.id} className={cls.tourTile}>
                                        <Text type='h4' className={cls.tourTileTitle}>
                                            {renderMainRichText(
                                                t(`main.tour.groups.${group.id}.tiles.${tile.id}.title`)
                                            )}
                                        </Text>
                                        <Text className={cls.tourTileText}>
                                            {renderMainRichText(
                                                t(`main.tour.groups.${group.id}.tiles.${tile.id}.description`)
                                            )}
                                        </Text>
                                        <Link
                                            to={ROUTE_PATH[tile.routeId]}
                                            className={cls.cardLink}
                                            onMouseEnter={() => handleRouteWarmup(tile.routeId)}
                                            onFocus={() => handleRouteWarmup(tile.routeId)}>
                                            {renderTermTooltipRichText(
                                                t(`main.tour.groups.${group.id}.tiles.${tile.id}.linkLabel`)
                                            )}
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <SectionErrorBoundary name='MainDemoConfiguration'>
                <section className={cls.sectionSurface}>
                    <div className={cls.demoHeader}>
                        <MainSectionHeader
                            eyebrow={t('main.demo.eyebrow')}
                            title={t('main.demo.title')}
                            subtitle={t('main.demo.subtitle')}
                            renderText={renderMainRichText}
                        />
                        <Link
                            to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]}
                            className={cls.cardLink}
                            onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}
                            onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}>
                            {renderTermTooltipRichText(t('main.demo.openMega'))}
                        </Link>
                    </div>

                    {isBestPolicyReady ?
                        <Suspense fallback={<Text className={cls.cardStatus}>{t('main.demo.loading')}</Text>}>
                            <MainBestPolicySection />
                        </Suspense>
                    :   <Text className={cls.cardStatus}>{t('main.demo.loading')}</Text>}
                </section>
            </SectionErrorBoundary>
        </div>
    )
}
