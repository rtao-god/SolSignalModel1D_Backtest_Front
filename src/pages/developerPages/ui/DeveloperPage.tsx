import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import classNames from '@/shared/lib/helpers/classNames'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import cls from './DeveloperPage.module.scss'
import type { DeveloperPageProps } from './types'
import { DEVELOPER_HOME_CARDS } from './shared/developerHomeContent'

export default function DeveloperPage({ className }: DeveloperPageProps) {
    const { t } = useTranslation('developer')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()

    const handleRouteWarmup = useCallback(
        (routeId: (typeof DEVELOPER_HOME_CARDS)[number]['route']) => {
            warmupRouteNavigation(routeId, queryClient, dispatch)
        },
        [dispatch, queryClient]
    )

    return (
        <div className={classNames(cls.DeveloperPageRoot, {}, [className ?? ''])}>
            <header className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('home.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('home.hero.subtitle')}</Text>
                <div className={cls.heroMeta}>
                    <span className={cls.metaPill}>{t('home.hero.meta.structure')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.runtime')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.delivery')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.guards')}</span>
                </div>
            </header>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('home.sections.title')}
                </Text>

                <div className={cls.cards}>
                    {DEVELOPER_HOME_CARDS.map(card => (
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
