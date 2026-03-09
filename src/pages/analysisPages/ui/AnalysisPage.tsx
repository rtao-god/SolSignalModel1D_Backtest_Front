import classNames from '@/shared/lib/helpers/classNames'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
    buildBacktestDiagnosticsQueryArgsFromSearchParams,
    buildBacktestDiagnosticsSearchFromSearchParams
} from '@/shared/utils/backtestDiagnosticsQuery'
import cls from './AnalysisPage.module.scss'
import type { AnalysisPageProps } from './types'

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
    const policyBranchMegaArgs = useMemo(
        () => ({
            bucket: currentSearchParams.get('bucket'),
            bucketView: currentSearchParams.get('bucketview'),
            metric: currentSearchParams.get('metric'),
            tpSlMode: currentSearchParams.get('tpsl'),
            slMode: currentSearchParams.get('slmode'),
            zonalMode: currentSearchParams.get('zonal')
        }),
        [currentSearchParams]
    )

    const handleRouteWarmup = useCallback((routeId: AppRoute) => {
        warmupRouteNavigation(routeId, queryClient, dispatch, {
            diagnosticsArgs,
            policyBranchMegaArgs
        })
    }, [diagnosticsArgs, dispatch, policyBranchMegaArgs, queryClient])

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])}>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('analysisHome.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('analysisHome.hero.subtitle')}</Text>
            </section>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('analysisHome.sections.title')}
                </Text>
                <div className={cls.cards}>
                    <Link
                        to={`${ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_RATINGS]}${diagnosticsSearch}`}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_RATINGS)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_RATINGS)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('analysisHome.cards.ratings.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('analysisHome.cards.ratings.description')}</Text>
                            <span className={cls.cardHint}>{t('analysisHome.cards.ratings.hint')}</span>
                        </article>
                    </Link>
                    <Link
                        to={`${ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]}${diagnosticsSearch}`}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Policy Branch Mega
                            </Text>
                            <Text className={cls.cardText}>{t('analysisHome.cards.policyBranchMega.description')}</Text>
                            <span className={cls.cardHint}>{t('analysisHome.cards.policyBranchMega.hint')}</span>
                        </article>
                    </Link>
                    <Link
                        to={`${ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS]}${diagnosticsSearch}`}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('analysisHome.cards.dayStats.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('analysisHome.cards.dayStats.description')}</Text>
                            <span className={cls.cardHint}>{t('analysisHome.cards.dayStats.hint')}</span>
                        </article>
                    </Link>
                    <Link
                        to={ROUTE_PATH[AppRoute.BACKTEST_CONFIDENCE_RISK]}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_CONFIDENCE_RISK)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_CONFIDENCE_RISK)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('analysisHome.cards.confidenceRisk.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('analysisHome.cards.confidenceRisk.description')}</Text>
                            <span className={cls.cardHint}>{t('analysisHome.cards.confidenceRisk.hint')}</span>
                        </article>
                    </Link>
                    <Link
                        to={ROUTE_PATH[AppRoute.BACKTEST_EXECUTION_PIPELINE]}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_EXECUTION_PIPELINE)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_EXECUTION_PIPELINE)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Execution Pipeline
                            </Text>
                            <Text className={cls.cardText}>
                                {t('analysisHome.cards.executionPipeline.description')}
                            </Text>
                            <span className={cls.cardHint}>{t('analysisHome.cards.executionPipeline.hint')}</span>
                        </article>
                    </Link>
                </div>
            </section>
        </div>
    )
}
