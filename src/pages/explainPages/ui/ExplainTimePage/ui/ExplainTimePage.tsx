import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_TIME_TABS } from '@/shared/utils/explainTabs'
import {
    readExplainTableRowsOrThrow,
    readExplainTermItemsOrThrow,
    type ExplainLocalizedTermItem
} from '@/pages/explainPages/ui/shared/explainI18n'
import cls from './ExplainTimePage.module.scss'
import type { ExplainTimePageProps } from './types'

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

export default function ExplainTimePage({ className }: ExplainTimePageProps) {
    const { t } = useTranslation('explain')

    const sections = useMemo(
        () =>
            EXPLAIN_TIME_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    const overviewTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'timePage.sections.overview.terms'), [t])
    const baselineTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'timePage.sections.baseline.terms'), [t])
    const dayKeysTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'timePage.sections.dayKeys.terms'), [t])
    const weekendTerms = useMemo(() => readExplainTermItemsOrThrow(t, 'timePage.sections.weekend.terms'), [t])

    const overviewRows = useMemo(() => readExplainTableRowsOrThrow(t, 'timePage.sections.overview.table.rows'), [t])

    return (
        <div className={classNames(cls.ExplainTimePage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('timePage.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('timePage.header.subtitle')}</Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-time-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('timePage.sections.overview.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('timePage.sections.overview.text')}</Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>{t('timePage.sections.overview.table.headers.season')}</th>
                                    <th>{t('timePage.sections.overview.table.headers.entryTime')}</th>
                                    <th>{t('timePage.sections.overview.table.headers.comment')}</th>
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

                <section id='explain-time-baseline' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('timePage.sections.baseline.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('timePage.sections.baseline.text')}</Text>
                    <TermGrid items={baselineTerms} />
                </section>

                <section id='explain-time-day-keys' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('timePage.sections.dayKeys.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('timePage.sections.dayKeys.text')}</Text>
                    <TermGrid items={dayKeysTerms} />
                </section>

                <section id='explain-time-weekend' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('timePage.sections.weekend.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('timePage.sections.weekend.text')}</Text>
                    <TermGrid items={weekendTerms} />
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
