import classNames from '@/shared/lib/helpers/classNames'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { useTranslation } from 'react-i18next'
import cls from './DiagnosticsPage.module.scss'
import type { DiagnosticsPageProps } from './types'

export default function DiagnosticsPage({ className }: DiagnosticsPageProps) {
    const { t } = useTranslation('reports')

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
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('diagnosticsHome.cards.risk.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('diagnosticsHome.cards.risk.description')}</Text>
                            <span className={cls.cardHint}>{t('diagnosticsHome.cards.risk.hint')}</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Guardrail / Specificity
                            </Text>
                            <Text className={cls.cardText}>{t('diagnosticsHome.cards.guardrail.description')}</Text>
                            <span className={cls.cardHint}>{t('diagnosticsHome.cards.guardrail.hint')}</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                {t('diagnosticsHome.cards.decisions.title')}
                            </Text>
                            <Text className={cls.cardText}>{t('diagnosticsHome.cards.decisions.description')}</Text>
                            <span className={cls.cardHint}>{t('diagnosticsHome.cards.decisions.hint')}</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Hotspots / NoTrade
                            </Text>
                            <Text className={cls.cardText}>{t('diagnosticsHome.cards.hotspots.description')}</Text>
                            <span className={cls.cardHint}>{t('diagnosticsHome.cards.hotspots.hint')}</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_OTHER]} className={cls.cardLink}>
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
