import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import { useTranslation } from 'react-i18next'
import cls from './DocsPage.module.scss'
import type { DocsPageProps } from './types'

export default function DocsPage({ className }: DocsPageProps) {
    const { t } = useTranslation('docs')
    const renderTooltipDescription = (term: string, description: string) =>
        enrichTermTooltipDescription(description, { term })

    return (
        <div className={classNames(cls.DocsPageRoot, {}, [className ?? ''])}>
            <header className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('page.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('page.subtitle')}</Text>
                <div className={cls.heroMeta}>
                    <span className={cls.metaPill}>{t('page.meta.model')}</span>
                    <span className={cls.metaPill}>{t('page.meta.backtests')}</span>
                    <span className={cls.metaPill}>{t('page.meta.diagnostics')}</span>
                    <span className={cls.metaPill}>{t('page.meta.currentPredictions')}</span>
                </div>
            </header>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('sections.readingReports')}
                </Text>
                <div className={cls.cards}>
                    <article className={cls.card} id='model-stats-overview'>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('cards.modelStats.title')}
                        </Text>
                        <Text className={cls.cardText}>
                            {t('cards.modelStats.text.beforeOos')}{' '}
                            <TermTooltip
                                term='OOS'
                                type='span'
                                description={renderTooltipDescription('OOS', t('cards.modelStats.tooltips.oos'))}
                            />{' '}
                            {t('cards.modelStats.text.between')}{' '}
                            <TermTooltip
                                term='Train'
                                type='span'
                                description={renderTooltipDescription('Train', t('cards.modelStats.tooltips.train'))}
                            />{' '}
                            {t('cards.modelStats.text.afterTrain')}
                        </Text>
                    </article>

                    <article className={cls.card} id='current-prediction-overview'>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('cards.currentPrediction.title')}
                        </Text>
                        <Text className={cls.cardText}>
                            {t('cards.currentPrediction.text.beforeMinMove')}{' '}
                            <TermTooltip
                                term='MinMove'
                                type='span'
                                description={renderTooltipDescription(
                                    'MinMove',
                                    t('cards.currentPrediction.tooltips.minMove')
                                )}
                            />{' '}
                            {t('cards.currentPrediction.text.between')}{' '}
                            <TermTooltip
                                term={t('cards.currentPrediction.terms.slModel')}
                                type='span'
                                description={renderTooltipDescription(
                                    t('cards.currentPrediction.terms.slModel'),
                                    t('cards.currentPrediction.tooltips.slModel')
                                )}
                            />{' '}
                            {t('cards.currentPrediction.text.afterSlModel')}
                        </Text>
                    </article>

                    <article className={cls.card} id='aggregation-overview'>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('cards.aggregation.title')}
                        </Text>
                        <Text className={cls.cardText}>
                            {t('cards.aggregation.text.beforeAccuracy')}{' '}
                            <TermTooltip
                                term='Accuracy'
                                type='span'
                                description={renderTooltipDescription(
                                    'Accuracy',
                                    t('cards.aggregation.tooltips.accuracy')
                                )}
                            />{' '}
                            {t('cards.aggregation.text.between')}{' '}
                            <TermTooltip
                                term='LogLoss'
                                type='span'
                                description={renderTooltipDescription(
                                    'LogLoss',
                                    t('cards.aggregation.tooltips.logLoss')
                                )}
                            />{' '}
                            {t('cards.aggregation.text.afterLogLoss')}
                        </Text>
                    </article>

                    <article className={cls.card} id='pfi-overview'>
                        <Text type='h3' className={cls.cardTitle}>
                            {t('cards.pfi.title')}
                        </Text>
                        <Text className={cls.cardText}>
                            {t('cards.pfi.text.beforeDeltaAuc')}{' '}
                            <TermTooltip
                                term='ΔAUC'
                                type='span'
                                description={renderTooltipDescription('ΔAUC', t('cards.pfi.tooltips.deltaAuc'))}
                            />{' '}
                            {t('cards.pfi.text.afterDeltaAuc')}
                        </Text>
                    </article>
                </div>
            </section>
        </div>
    )
}
