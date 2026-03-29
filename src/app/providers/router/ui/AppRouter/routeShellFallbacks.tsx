import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import RouteShellFallback from '../RouteShellFallback/RouteShellFallback'
import { AppRoute } from '../../config/types'
import { readPredictionPageStringList } from '@/pages/predictions/ui/shared/predictionPageI18n'

export interface RouteShellStateProps {
    routeLabelDefault: string
    loadingTitle: string
    state: 'loading' | 'error'
    error?: Error | null
    resetErrorBoundary?: () => void
}

function createBulletItems(items: readonly ReactNode[]) {
    return items.map((content, index) => ({
        key: `route-shell-bullet-${index}`,
        content
    }))
}

function createReportsShell(
    titleKey: string,
    titleDefault: string,
    subtitleKey?: string,
    subtitleDefault?: string
): ComponentType<RouteShellStateProps> {
    return function ReportsRouteShellFallback({
        loadingTitle,
        state,
        error,
        resetErrorBoundary
    }: RouteShellStateProps) {
        const { t } = useTranslation('reports')

        return (
            <RouteShellFallback
                title={t(titleKey, { defaultValue: titleDefault })}
                subtitle={
                    subtitleKey ? t(subtitleKey, { defaultValue: subtitleDefault ?? subtitleKey }) : undefined
                }
                state={state}
                loadingTitle={loadingTitle}
                error={error}
                onRetry={resetErrorBoundary}
            />
        )
    }
}

function CurrentPredictionRouteShellFallback({
    loadingTitle,
    state,
    error,
    resetErrorBoundary
}: RouteShellStateProps) {
    const { t, i18n } = useTranslation('reports')

    return (
        <RouteShellFallback
            title={renderTermTooltipRichText(t('currentPrediction.page.intro.title'))}
            subtitle={renderTermTooltipRichText(t('currentPrediction.page.intro.lead'))}
            bullets={createBulletItems(
                readPredictionPageStringList(i18n, 'currentPrediction.page.intro.bullets').map(item =>
                    renderTermTooltipRichText(item)
                )
            )}
            state={state}
            loadingTitle={loadingTitle}
            error={error}
            onRetry={resetErrorBoundary}
        />
    )
}

function PredictionHistoryRouteShellFallback({
    loadingTitle,
    state,
    error,
    resetErrorBoundary
}: RouteShellStateProps) {
    const { t, i18n } = useTranslation('reports')

    return (
        <RouteShellFallback
            title={renderTermTooltipRichText(t('predictionHistory.page.intro.title'))}
            subtitle={renderTermTooltipRichText(t('predictionHistory.page.intro.lead'))}
            bullets={createBulletItems(
                readPredictionPageStringList(i18n, 'predictionHistory.page.intro.bullets').map(item =>
                    renderTermTooltipRichText(item)
                )
            )}
            state={state}
            loadingTitle={loadingTitle}
            error={error}
            onRetry={resetErrorBoundary}
        />
    )
}

function AggregationRouteShellFallback({
    loadingTitle,
    state,
    error,
    resetErrorBoundary
}: RouteShellStateProps) {
    const { t } = useTranslation('reports')

    return (
        <RouteShellFallback
            // Loading shell держит только общий смысл экрана. Локальные правила чтения остаются в самих секциях страницы.
            title={renderTermTooltipRichText(t('aggregation.inner.header.title'))}
            subtitle={renderTermTooltipRichText(t('aggregation.inner.header.subtitle'))}
            state={state}
            loadingTitle={loadingTitle}
            error={error}
            onRetry={resetErrorBoundary}
        />
    )
}

function PolicySetupsRouteShellFallback({
    loadingTitle,
    state,
    error,
    resetErrorBoundary
}: RouteShellStateProps) {
    return (
        <RouteShellFallback
            title='Policy setup history'
            subtitle='Отдельная витрина для полных торговых конфигураций: свечи SOL, дневные блоки, исполнение TP/SL и кривая баланса.'
            state={state}
            loadingTitle={loadingTitle}
            error={error}
            onRetry={resetErrorBoundary}
        />
    )
}

function GenericRouteShellFallback({
    routeLabelDefault,
    loadingTitle,
    state,
    error,
    resetErrorBoundary
}: RouteShellStateProps) {
    return (
        <RouteShellFallback
            title={routeLabelDefault}
            subtitle={loadingTitle}
            state={state}
            loadingTitle={loadingTitle}
            error={error}
            onRetry={resetErrorBoundary}
        />
    )
}

const ROUTE_SHELLS: Partial<Record<AppRoute, ComponentType<RouteShellStateProps>>> = {
    [AppRoute.CURRENT_PREDICTION]: CurrentPredictionRouteShellFallback,
    [AppRoute.CURRENT_PREDICTION_HISTORY]: PredictionHistoryRouteShellFallback,
    [AppRoute.MODELS_STATS]: createReportsShell(
        'modelStats.inner.header.titleFallback',
        'Model statistics',
        'modelStats.inner.header.subtitle',
        'Model comparison by the selected data segment and reading mode.'
    ),
    [AppRoute.AGGREGATION_STATS]: AggregationRouteShellFallback,
    [AppRoute.BACKTEST_BASELINE]: createReportsShell(
        'backtestBaseline.header.title',
        'Baseline backtest'
    ),
    [AppRoute.BACKTEST_SUMMARY]: createReportsShell(
        'route.backtest_summary',
        'Backtest summary'
    ),
    [AppRoute.BACKTEST_FULL]: createReportsShell(
        'backtestFull.header.title',
        'Experimental backtest',
        'backtestFull.header.subtitle',
        'Interactive comparison between baseline and custom backtest profiles.'
    ),
    [AppRoute.BACKTEST_DIAGNOSTICS]: createReportsShell(
        'diagnosticsReport.pages.risk.title',
        'Risk and liquidations',
        'diagnosticsReport.pages.risk.subtitle',
        'Диагностика риска, ликвидаций и деградации equity-кривой.'
    ),
    [AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]: createReportsShell(
        'diagnosticsReport.pages.guardrail.title',
        'Guardrail / Specificity',
        'diagnosticsReport.pages.guardrail.subtitle',
        'Диагностика drift и качества фильтра guardrail.'
    ),
    [AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]: createReportsShell(
        'diagnosticsReport.pages.decisions.title',
        'Decisions / Attribution',
        'diagnosticsReport.pages.decisions.subtitle',
        'Разбор решений модели, attribution и потерь по сценариям.'
    ),
    [AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]: createReportsShell(
        'diagnosticsReport.pages.hotspots.title',
        'Hotspots / NoTrade',
        'diagnosticsReport.pages.hotspots.subtitle',
        'Точки концентрации проблем и причины no-trade дней.'
    ),
    [AppRoute.BACKTEST_DIAGNOSTICS_OTHER]: createReportsShell(
        'diagnosticsReport.pages.other.title',
        'Other diagnostics',
        'diagnosticsReport.pages.other.subtitle',
        'Дополнительные диагностики, не попавшие в основные группы.'
    ),
    [AppRoute.BACKTEST_DIAGNOSTICS_RATINGS]: createReportsShell(
        'diagnosticsReport.pages.ratings.title',
        'Policy ratings',
        'diagnosticsReport.pages.ratings.subtitle',
        'Лучшие и худшие дни, сделки и policy-сценарии.'
    ),
    [AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS]: createReportsShell(
        'diagnosticsReport.pages.dayStats.title',
        'Day statistics',
        'diagnosticsReport.pages.dayStats.subtitle',
        'Разрезы по типам дня, weekday и рыночным сценариям.'
    ),
    [AppRoute.BACKTEST_POLICY_BRANCH_MEGA]: createReportsShell(
        'policyBranchMega.page.title',
        'Policy Branch Mega',
        'policyBranchMega.page.subtitle',
        'Сравнение policy и branch-режимов по ключевым торговым метрикам.'
    ),
    [AppRoute.BACKTEST_POLICY_SETUPS]: PolicySetupsRouteShellFallback,
    [AppRoute.BACKTEST_POLICY_SETUP_DETAIL]: PolicySetupsRouteShellFallback,
    [AppRoute.BACKTEST_CONFIDENCE_RISK]: createReportsShell(
        'confidenceRisk.page.title',
        'Confidence statistics',
        'confidenceRisk.page.subtitle',
        'Связь confidence, bucket и риска на уровне фактических сделок.'
    ),
    [AppRoute.BACKTEST_SHARP_MOVE_STATS]: createReportsShell(
        'sharpMoveStats.page.title',
        'Sharp move statistics',
        'sharpMoveStats.page.subtitle',
        'Сетка сценариев по продолжению и развороту после резкого движения цены.'
    ),
    [AppRoute.ANALYSIS_REAL_FORECAST_JOURNAL]: createReportsShell(
        'realForecastJournal.page.title',
        'Real Forecast Journal',
        'realForecastJournal.page.subtitle',
        'Журнал реальных прогнозов и последующего факта по торговым дням.'
    ),
    [AppRoute.BACKTEST_EXECUTION_PIPELINE]: createReportsShell(
        'executionPipeline.page.title',
        'Execution Pipeline',
        'executionPipeline.page.subtitle',
        'Пошаговый разбор пути от модели до исполнения и учёта результата.'
    ),
    [AppRoute.PFI_PER_MODEL]: createReportsShell(
        'pfi.page.header.titleFallback',
        'PFI daily models',
        'pfi.page.header.subtitle',
        'Влияние признаков на дневные модели по опубликованным секциям PFI.'
    ),
    [AppRoute.PFI_SL_MODEL]: createReportsShell(
        'pfi.page.header.slTitleFallback',
        'PFI SL model',
        'pfi.page.header.slSubtitle',
        'Влияние признаков на SL-модель и ее пороги в отдельном published-отчёте.'
    )
}

export function resolveRouteShellFallback(routeId: AppRoute): ComponentType<RouteShellStateProps> {
    return ROUTE_SHELLS[routeId] ?? GenericRouteShellFallback
}
