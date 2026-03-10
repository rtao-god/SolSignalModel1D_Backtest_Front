import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import classNames from '@/shared/lib/helpers/classNames'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import cls from './GuidePage.module.scss'
import type { GuidePageProps } from './types'

const GUIDE_HOME_CARDS = [
    {
        id: 'models',
        route: AppRoute.GUIDE_MODELS
    },
    {
        id: 'branches',
        route: AppRoute.GUIDE_BRANCHES
    },
    {
        id: 'splits',
        route: AppRoute.GUIDE_SPLITS
    },
    {
        id: 'time',
        route: AppRoute.GUIDE_TIME
    },
    {
        id: 'features',
        route: AppRoute.GUIDE_FEATURES
    },
    {
        id: 'truthfulness',
        route: AppRoute.GUIDE_TRUTHFULNESS
    },
    {
        id: 'tests',
        route: AppRoute.GUIDE_TESTS
    }
] as const

export default function GuidePage({ className }: GuidePageProps) {
    const { t } = useTranslation('guide')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch)
        },
        [dispatch, queryClient]
    )

    return (
        <div className={classNames(cls.GuidePageRoot, {}, [className ?? ''])}>
            <header className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('home.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('home.hero.subtitle')}</Text>
                <div className={cls.heroMeta}>
                    <span className={cls.metaPill}>{t('home.hero.meta.meaning')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.interface')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.logic')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.contract')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.checks')}</span>
                </div>
            </header>

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
                                <Text className={cls.cardText}>{t(`home.sections.cards.${card.id}.description`)}</Text>
                                <span className={cls.cardHint}>{t(`home.sections.cards.${card.id}.hint`)}</span>
                            </article>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
