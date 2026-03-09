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
import cls from './DiagnosticsPage.module.scss'
import type { DiagnosticsPageProps } from './types'

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

    const handleRouteWarmup = useCallback((routeId: AppRoute) => {
        warmupRouteNavigation(routeId, queryClient, dispatch, {
            diagnosticsArgs
        })
    }, [diagnosticsArgs, dispatch, queryClient])

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])}>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('diagnosticsHome.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('diagnosticsHome.hero.subtitle')}</Text>
            </section>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('diagnosticsHome.sections.title')}
                </Text>
                <div className={cls.cards}>
                    <Link
                        to={`${ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS]}${diagnosticsSearch}`}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('diagnosticsHome.cards.risk.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('diagnosticsHome.cards.risk.description')}</Text>
                            <span className={cls.cardHint}>{t('diagnosticsHome.cards.risk.hint')}</span>
                        </article>
                    </Link>
                    <Link
                        to={`${ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]}${diagnosticsSearch}`}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Guardrail / Specificity
                            </Text>
                            <Text className={cls.cardText}>{t('diagnosticsHome.cards.guardrail.description')}</Text>
                            <span className={cls.cardHint}>{t('diagnosticsHome.cards.guardrail.hint')}</span>
                        </article>
                    </Link>
                    <Link
                        to={`${ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]}${diagnosticsSearch}`}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('diagnosticsHome.cards.decisions.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('diagnosticsHome.cards.decisions.description')}</Text>
                            <span className={cls.cardHint}>{t('diagnosticsHome.cards.decisions.hint')}</span>
                        </article>
                    </Link>
                    <Link
                        to={`${ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]}${diagnosticsSearch}`}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Hotspots / NoTrade
                            </Text>
                            <Text className={cls.cardText}>{t('diagnosticsHome.cards.hotspots.description')}</Text>
                            <span className={cls.cardHint}>{t('diagnosticsHome.cards.hotspots.hint')}</span>
                        </article>
                    </Link>
                    <Link
                        to={`${ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_OTHER]}${diagnosticsSearch}`}
                        className={cls.cardLink}
                        onMouseEnter={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_OTHER)}
                        onFocus={() => handleRouteWarmup(AppRoute.BACKTEST_DIAGNOSTICS_OTHER)}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('diagnosticsHome.cards.other.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('diagnosticsHome.cards.other.description')}</Text>
                            <span className={cls.cardHint}>{t('diagnosticsHome.cards.other.hint')}</span>
                        </article>
                    </Link>
                </div>
            </section>
        </div>
    )
}
