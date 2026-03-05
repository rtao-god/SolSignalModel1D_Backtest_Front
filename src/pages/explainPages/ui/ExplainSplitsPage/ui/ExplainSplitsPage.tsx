import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_SPLITS_TABS } from '@/shared/utils/explainTabs'
import {
    readExplainTableRowsOrThrow,
    readExplainTermItemsOrThrow,
    type ExplainLocalizedTermItem
} from '@/pages/explainPages/ui/shared/explainI18n'
import cls from './ExplainSplitsPage.module.scss'
import type { ExplainSplitsPageProps } from './types'

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

export default function ExplainSplitsPage({ className }: ExplainSplitsPageProps) {
    const { t } = useTranslation('explain')

    const sections = useMemo(
        () =>
            EXPLAIN_SPLITS_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    const overviewTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'splitsPage.sections.overview.terms'), [t])
    const trainTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'splitsPage.sections.train.terms'), [t])
    const oosTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'splitsPage.sections.oos.terms'), [t])
    const recentTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'splitsPage.sections.recent.terms'), [t])
    const fullTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'splitsPage.sections.full.terms'), [t])

    const overviewRows = useMemo(() => readExplainTableRowsOrThrow(t, 'splitsPage.sections.overview.table.rows'), [t])

    return (
        <div className={classNames(cls.ExplainSplitsPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('splitsPage.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('splitsPage.header.subtitle')}</Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-splits-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('splitsPage.sections.overview.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('splitsPage.sections.overview.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('splitsPage.sections.overview.table.headers.slice')}</th>
                                    <th>{t('splitsPage.sections.overview.table.headers.includes')}</th>
                                    <th>{t('splitsPage.sections.overview.table.headers.question')}</th>
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

                <section id='explain-splits-train' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('splitsPage.sections.train.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('splitsPage.sections.train.text')}</Text>
                    <TermGrid items={trainTerms} />
                </section>

                <section id='explain-splits-oos' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('splitsPage.sections.oos.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('splitsPage.sections.oos.text')}</Text>
                    <TermGrid items={oosTerms} />
                </section>

                <section id='explain-splits-recent' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('splitsPage.sections.recent.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('splitsPage.sections.recent.text')}</Text>
                    <TermGrid items={recentTerms} />
                </section>

                <section id='explain-splits-full' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('splitsPage.sections.full.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('splitsPage.sections.full.text')}</Text>
                    <TermGrid items={fullTerms} />
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
