import classNames from '@/shared/lib/helpers/classNames'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { useTranslation } from 'react-i18next'
import cls from './ExplainPage.module.scss'
import type { ExplainPageProps } from './types'

export default function ExplainPage({ className }: ExplainPageProps) {
    const { t } = useTranslation('explain')

    return (
        <div className={classNames(cls.ExplainPageRoot, {}, [className ?? ''])}>
            <header className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('home.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('home.hero.subtitle')}</Text>
                <div className={cls.heroMeta}>
                    <span className={cls.metaPill}>{t('home.hero.meta.models')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.branches')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.data')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.time')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.architecture')}</span>
                </div>
            </header>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('home.sections.title')}
                </Text>
                <div className={cls.cards}>
                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_MODELS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('home.sections.cards.models.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('home.sections.cards.models.description')}</Text>
                            <span className={cls.cardHint}>{t('home.sections.cards.models.hint')}</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_BRANCHES]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('home.sections.cards.branches.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('home.sections.cards.branches.description')}</Text>
                            <span className={cls.cardHint}>{t('home.sections.cards.branches.hint')}</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_SPLITS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('home.sections.cards.splits.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('home.sections.cards.splits.description')}</Text>
                            <span className={cls.cardHint}>{t('home.sections.cards.splits.hint')}</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_PROJECT]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('home.sections.cards.project.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('home.sections.cards.project.description')}</Text>
                            <span className={cls.cardHint}>{t('home.sections.cards.project.hint')}</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_TIME]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('home.sections.cards.time.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('home.sections.cards.time.description')}</Text>
                            <span className={cls.cardHint}>{t('home.sections.cards.time.hint')}</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_FEATURES]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('home.sections.cards.features.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('home.sections.cards.features.description')}</Text>
                            <span className={cls.cardHint}>{t('home.sections.cards.features.hint')}</span>
                        </article>
                    </Link>
                </div>
            </section>
        </div>
    )
}
