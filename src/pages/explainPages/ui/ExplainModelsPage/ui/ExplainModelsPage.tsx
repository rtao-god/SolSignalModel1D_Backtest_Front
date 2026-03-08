import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { Link, TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_MODELS_TABS } from '@/shared/utils/explainTabs'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import {
    readExplainStringListOrThrow,
    readExplainTableRowsOrThrow,
    readExplainTermItemsOrThrow,
    type ExplainLocalizedTermItem
} from '@/pages/explainPages/ui/shared/explainI18n'
import cls from './ExplainModelsPage.module.scss'
import type { ExplainModelsPageProps } from './types'

function TermGrid({ items }: { items: ExplainLocalizedTermItem[] }) {
    return (
        <div className={cls.termGrid}>
            {items.map(item => (
                <TermTooltip
                    key={item.term}
                    term={item.term}
                    description={enrichTermTooltipDescription(item.description, { term: item.term })}
                    type='span'
                    className={cls.termItem}
                />
            ))}
        </div>
    )
}

export default function ExplainModelsPage({ className }: ExplainModelsPageProps) {
    const { t } = useTranslation('explain')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()
    const handleModelsStatsWarmup = useCallback(() => {
        warmupRouteNavigation(AppRoute.MODELS_STATS, queryClient, dispatch)
    }, [dispatch, queryClient])

    const sections = useMemo(
        () =>
            EXPLAIN_MODELS_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    const overviewTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'modelsPage.sections.overview.terms'), [t])
    const dailyTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'modelsPage.sections.daily.terms'), [t])
    const microTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'modelsPage.sections.micro.terms'), [t])
    const slTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'modelsPage.sections.sl.terms'), [t])
    const aggregationTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'modelsPage.sections.aggregation.terms'), [t])

    const overviewRows = useMemo(() => readExplainTableRowsOrThrow(t, 'modelsPage.sections.overview.table.rows'), [t])
    const dailyRows = useMemo(() => readExplainTableRowsOrThrow(t, 'modelsPage.sections.daily.table.rows'), [t])
    const slRows = useMemo(() => readExplainTableRowsOrThrow(t, 'modelsPage.sections.sl.table.rows'), [t])
    const microNotes = useMemo(() => readExplainStringListOrThrow(t, 'modelsPage.sections.micro.notes'), [t])
    const aggregationSteps = useMemo(
        () => readExplainStringListOrThrow(t, 'modelsPage.sections.aggregation.steps'),
        [t]
    )

    return (
        <div className={classNames(cls.ExplainModelsPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('modelsPage.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('modelsPage.header.subtitle')}</Text>
                    <div className={cls.linkRow}>
                        <Text className={cls.linkLabel}>{t('modelsPage.header.linkLabel')}</Text>
                        <Link
                            to={ROUTE_PATH[AppRoute.MODELS_STATS]}
                            className={cls.linkButton}
                            onMouseEnter={handleModelsStatsWarmup}
                            onFocus={handleModelsStatsWarmup}>
                            {t('modelsPage.header.linkButton')}
                        </Link>
                    </div>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-models-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.overview.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('modelsPage.sections.overview.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('modelsPage.sections.overview.table.headers.layer')}</th>
                                    <th>{t('modelsPage.sections.overview.table.headers.role')}</th>
                                    <th>{t('modelsPage.sections.overview.table.headers.output')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overviewRows.map((row, rowIndex) => (
                                    <tr key={`overview-row-${rowIndex}`}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={`overview-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={overviewTerms} />
                </section>

                <section id='explain-models-daily' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.daily.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('modelsPage.sections.daily.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('modelsPage.sections.daily.table.headers.class')}</th>
                                    <th>{t('modelsPage.sections.daily.table.headers.condition')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyRows.map((row, rowIndex) => (
                                    <tr key={`daily-row-${rowIndex}`}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={`daily-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={dailyTerms} />
                </section>

                <section id='explain-models-micro' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.micro.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('modelsPage.sections.micro.text')}</Text>
                    <ul className={cls.noteList}>
                        {microNotes.map((note, index) => (
                            <li key={`micro-note-${index}`}>{note}</li>
                        ))}
                    </ul>
                    <TermGrid items={microTerms} />
                </section>

                <section id='explain-models-sl' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.sl.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('modelsPage.sections.sl.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('modelsPage.sections.sl.table.headers.parameter')}</th>
                                    <th>{t('modelsPage.sections.sl.table.headers.rule')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slRows.map((row, rowIndex) => (
                                    <tr key={`sl-row-${rowIndex}`}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={`sl-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={slTerms} />
                </section>

                <section id='explain-models-aggregation' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.aggregation.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('modelsPage.sections.aggregation.text')}</Text>
                    <ol className={cls.noteList}>
                        {aggregationSteps.map((step, index) => (
                            <li key={`aggregation-step-${index}`}>{step}</li>
                        ))}
                    </ol>
                    <TermGrid items={aggregationTerms} />
                </section>
            </div>

            <SectionPager
                sections={sections}
                currentIndex={currentIndex}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={handlePrev}
                onNext={handleNext}
            />
        </div>
    )
}
