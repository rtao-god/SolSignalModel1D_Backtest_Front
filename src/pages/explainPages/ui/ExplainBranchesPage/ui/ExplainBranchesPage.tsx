import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_BRANCHES_TABS } from '@/shared/utils/explainTabs'
import {
    readExplainTableRowsOrThrow,
    readExplainTermItemsOrThrow,
    type ExplainLocalizedTermItem
} from '@/pages/explainPages/ui/shared/explainI18n'
import cls from './ExplainBranchesPage.module.scss'
import type { ExplainBranchesPageProps } from './types'

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

export default function ExplainBranchesPage({ className }: ExplainBranchesPageProps) {
    const { t } = useTranslation('explain')

    const sections = useMemo(
        () =>
            EXPLAIN_BRANCHES_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    const overviewTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'branchesPage.sections.overview.terms'), [t])
    const baseTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'branchesPage.sections.base.terms'), [t])
    const antiTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'branchesPage.sections.anti.terms'), [t])
    const conditionsTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'branchesPage.sections.conditions.terms'), [t])
    const usageTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'branchesPage.sections.usage.terms'), [t])

    const overviewRows = useMemo(() => readExplainTableRowsOrThrow(t, 'branchesPage.sections.overview.table.rows'), [t])
    const conditionsRows = useMemo(
        () => readExplainTableRowsOrThrow(t, 'branchesPage.sections.conditions.table.rows'),
        [t]
    )

    return (
        <div className={classNames(cls.ExplainBranchesPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('branchesPage.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('branchesPage.header.subtitle')}</Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-branches-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('branchesPage.sections.overview.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('branchesPage.sections.overview.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('branchesPage.sections.overview.table.headers.branch')}</th>
                                    <th>{t('branchesPage.sections.overview.table.headers.howItWorks')}</th>
                                    <th>{t('branchesPage.sections.overview.table.headers.whenUseful')}</th>
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

                <section id='explain-branches-base' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('branchesPage.sections.base.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('branchesPage.sections.base.text')}</Text>
                    <TermGrid items={baseTerms} />
                </section>

                <section id='explain-branches-anti' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('branchesPage.sections.anti.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('branchesPage.sections.anti.text')}</Text>
                    <TermGrid items={antiTerms} />
                </section>

                <section id='explain-branches-conditions' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('branchesPage.sections.conditions.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('branchesPage.sections.conditions.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('branchesPage.sections.conditions.table.headers.filter')}</th>
                                    <th>{t('branchesPage.sections.conditions.table.headers.threshold')}</th>
                                    <th>{t('branchesPage.sections.conditions.table.headers.protection')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {conditionsRows.map((row, rowIndex) => (
                                    <tr key={`conditions-row-${rowIndex}`}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={`conditions-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={conditionsTerms} />
                </section>

                <section id='explain-branches-usage' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('branchesPage.sections.usage.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('branchesPage.sections.usage.text')}</Text>
                    <TermGrid items={usageTerms} />
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
