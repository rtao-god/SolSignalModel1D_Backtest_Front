import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_PROJECT_TABS } from '@/shared/utils/explainTabs'
import {
    readExplainTableRowsOrThrow,
    readExplainTermItemsOrThrow,
    type ExplainLocalizedTermItem
} from '@/pages/explainPages/ui/shared/explainI18n'
import cls from './ExplainProjectPage.module.scss'
import type { ExplainProjectPageProps } from './types'

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

export default function ExplainProjectPage({ className }: ExplainProjectPageProps) {
    const { t } = useTranslation('explain')

    const sections = useMemo(
        () =>
            EXPLAIN_PROJECT_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    const pipelineTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'projectPage.sections.overview.terms'), [t])
    const causalTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'projectPage.sections.causal.terms'), [t])
    const structureTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'projectPage.sections.structure.terms'), [t])
    const reportsTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'projectPage.sections.reports.terms'), [t])
    const testsTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'projectPage.sections.tests.terms'), [t])

    const overviewRows = useMemo(() => readExplainTableRowsOrThrow(t, 'projectPage.sections.overview.table.rows'), [t])
    const structureRows = useMemo(
        () => readExplainTableRowsOrThrow(t, 'projectPage.sections.structure.table.rows'),
        [t]
    )
    const testsRows = useMemo(() => readExplainTableRowsOrThrow(t, 'projectPage.sections.tests.table.rows'), [t])

    return (
        <div className={classNames(cls.ExplainProjectPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('projectPage.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('projectPage.header.subtitle')}</Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-project-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('projectPage.sections.overview.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('projectPage.sections.overview.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('projectPage.sections.overview.table.headers.stage')}</th>
                                    <th>{t('projectPage.sections.overview.table.headers.artifact')}</th>
                                    <th>{t('projectPage.sections.overview.table.headers.why')}</th>
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
                    <TermGrid items={pipelineTerms} />
                </section>

                <section id='explain-project-causal' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('projectPage.sections.causal.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('projectPage.sections.causal.text')}</Text>
                    <TermGrid items={causalTerms} />
                </section>

                <section id='explain-project-structure' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('projectPage.sections.structure.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('projectPage.sections.structure.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('projectPage.sections.structure.table.headers.project')}</th>
                                    <th>{t('projectPage.sections.structure.table.headers.task')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {structureRows.map((row, rowIndex) => (
                                    <tr key={`structure-row-${rowIndex}`}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={`structure-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={structureTerms} />
                </section>

                <section id='explain-project-reports' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('projectPage.sections.reports.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('projectPage.sections.reports.text')}</Text>
                    <TermGrid items={reportsTerms} />
                </section>

                <section id='explain-project-tests' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('projectPage.sections.tests.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('projectPage.sections.tests.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('projectPage.sections.tests.table.headers.group')}</th>
                                    <th>{t('projectPage.sections.tests.table.headers.example')}</th>
                                    <th>{t('projectPage.sections.tests.table.headers.problem')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {testsRows.map((row, rowIndex) => (
                                    <tr key={`tests-row-${rowIndex}`}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={`tests-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={testsTerms} />
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
