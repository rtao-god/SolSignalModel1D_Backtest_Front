import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import classNames from '@/shared/lib/helpers/classNames'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { Link, Text } from '@/shared/ui'
import { BulletList } from '@/shared/ui/BulletList'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import cls from './DeveloperPage.module.scss'
import type { DeveloperPageProps } from './types'
import type { DeveloperHomeLinkConfig } from './shared/types'
import {
    DEVELOPER_HOME_CARDS,
    DEVELOPER_HOME_FACT_ROWS,
    DEVELOPER_HOME_METRICS,
    DEVELOPER_HOME_OVERVIEW_BLOCKS,
    DEVELOPER_HOME_TEST_SUITE_ROWS
} from './shared/developerHomeContent'
import { readAvailableDeveloperTermGroups, readDeveloperSentence } from './shared/developerI18n'
import { buildDeveloperGlossary, renderDeveloperRichText } from './shared/developerRichText'

export default function DeveloperPage({ className }: DeveloperPageProps) {
    const { t, i18n } = useTranslation('developer')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()

    const handleRouteWarmup = useCallback(
        (routeId: DeveloperHomeLinkConfig['route']) => {
            warmupRouteNavigation(routeId, queryClient, dispatch)
        },
        [dispatch, queryClient]
    )
    const glossary = useMemo(
        () => buildDeveloperGlossary(readAvailableDeveloperTermGroups(i18n, ['home.terms'])),
        [i18n, i18n.language]
    )

    // Верхний overview-блок должен читать тот же snapshot-глоссарий, что и детальные developer-страницы,
    // иначе базовое описание и подробные карты начинают расходиться по терминам.
    const renderHomeRichText = useCallback(
        (key: string) =>
            renderDeveloperRichText(readDeveloperSentence(i18n, key), {
                glossary
            }),
        [glossary, i18n]
    )

    const renderRouteLinks = useCallback(
        (links: readonly DeveloperHomeLinkConfig[]) => (
            <div className={cls.linkRow}>
                {links.map(link => (
                    <Link
                        key={`${link.route}-${link.id}`}
                        to={ROUTE_PATH[link.route]}
                        className={cls.linkPill}
                        onMouseEnter={() => handleRouteWarmup(link.route)}
                        onFocus={() => handleRouteWarmup(link.route)}>
                        {t(`home.overview.links.${link.id}`)}
                    </Link>
                ))}
            </div>
        ),
        [handleRouteWarmup, t]
    )

    return (
        <div className={classNames(cls.DeveloperPageRoot, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('home.hero.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{renderHomeRichText('home.hero.subtitle')}</Text>
                <div className={cls.heroMeta}>
                    <span className={cls.metaPill}>{t('home.hero.meta.structure')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.runtime')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.delivery')}</span>
                    <span className={cls.metaPill}>{t('home.hero.meta.guards')}</span>
                </div>
            </header>

            <section className={cls.overviewSection}>
                <div className={cls.overviewLead}>
                    <Text type='h2' className={cls.overviewTitle}>
                        {t('home.overview.title')}
                    </Text>
                    <Text className={cls.overviewSubtitle}>{renderHomeRichText('home.overview.subtitle')}</Text>
                </div>

                <div className={cls.metricsGrid}>
                    {DEVELOPER_HOME_METRICS.map(metric => (
                        <article key={metric.id} className={cls.metricCard}>
                            <Text className={cls.metricLabel}>{t(`home.overview.metrics.${metric.id}.label`)}</Text>
                            <Text type='h3' className={cls.metricValue}>
                                {t(`home.overview.metrics.${metric.id}.value`)}
                            </Text>
                        </article>
                    ))}
                </div>

                <article className={cls.snapshotCard}>
                    <Text type='h3' className={cls.snapshotTitle}>
                        {t('home.overview.snapshotTable.title')}
                    </Text>

                    <div className={cls.snapshotTableScroll}>
                        <table className={cls.snapshotTable}>
                            <thead>
                                <tr>
                                    <th>{t('home.overview.snapshotTable.columns.question')}</th>
                                    <th>{t('home.overview.snapshotTable.columns.answer')}</th>
                                    <th>{t('home.overview.snapshotTable.columns.details')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DEVELOPER_HOME_FACT_ROWS.map(row => (
                                    <tr key={row.id}>
                                        <th scope='row'>{t(`home.overview.snapshotTable.rows.${row.id}.question`)}</th>
                                        <td>
                                            {renderHomeRichText(`home.overview.snapshotTable.rows.${row.id}.answer`)}
                                        </td>
                                        <td>{renderRouteLinks(row.links)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>

                <div className={cls.detailGrid}>
                    {DEVELOPER_HOME_OVERVIEW_BLOCKS.map(block => (
                        <article
                            key={block.id}
                            className={classNames(cls.detailCard, {
                                [cls.detailCardWide]: block.layout === 'fullWidth'
                            })}>
                            <Text type='h3' className={cls.detailTitle}>
                                {t(`home.overview.blocks.${block.id}.title`)}
                            </Text>

                            {block.bulletIds && block.bulletIds.length > 0 && (
                                <BulletList
                                    className={cls.detailBulletList}
                                    itemClassName={cls.detailBulletItem}
                                    contentClassName={cls.detailBulletContent}
                                    items={block.bulletIds.map(bulletId => ({
                                        key: `${block.id}-${bulletId}`,
                                        content: renderHomeRichText(
                                            `home.overview.blocks.${block.id}.bullets.${bulletId}`
                                        )
                                    }))}
                                />
                            )}

                            {block.stepIds && block.stepIds.length > 0 && (
                                <div className={cls.stepList}>
                                    {block.stepIds.map((stepId, index) => (
                                        <div key={`${block.id}-${stepId}`} className={cls.stepItem}>
                                            <span className={cls.stepIndex}>{index + 1})</span>
                                            <Text className={cls.stepText}>
                                                {renderHomeRichText(`home.overview.blocks.${block.id}.steps.${stepId}`)}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {block.tableId === 'suiteSummary' && (
                                <div className={cls.inlineTableShell}>
                                    <Text type='h4' className={cls.inlineTableTitle}>
                                        {t(`home.overview.tables.${block.tableId}.title`)}
                                    </Text>
                                    <div className={cls.inlineTableScroll}>
                                        <table className={cls.inlineTable}>
                                            <thead>
                                                <tr>
                                                    <th>{t(`home.overview.tables.${block.tableId}.columns.suite`)}</th>
                                                    <th>{t(`home.overview.tables.${block.tableId}.columns.count`)}</th>
                                                    <th>{t(`home.overview.tables.${block.tableId}.columns.scope`)}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {DEVELOPER_HOME_TEST_SUITE_ROWS.map(row => (
                                                    <tr key={`${block.tableId}-${row.id}`}>
                                                        <th scope='row'>
                                                            {t(
                                                                `home.overview.tables.${block.tableId}.rows.${row.id}.suite`
                                                            )}
                                                        </th>
                                                        <td>
                                                            {t(
                                                                `home.overview.tables.${block.tableId}.rows.${row.id}.count`
                                                            )}
                                                        </td>
                                                        <td>
                                                            {renderHomeRichText(
                                                                `home.overview.tables.${block.tableId}.rows.${row.id}.scope`
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {renderRouteLinks(block.links)}
                        </article>
                    ))}
                </div>
            </section>

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
