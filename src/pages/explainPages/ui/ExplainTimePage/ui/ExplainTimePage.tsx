import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { GUIDE_TIME_TABS } from '@/shared/utils/guideTabs'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import {
    readAvailableGuideTermGroups,
    readGuideStringList,
    readGuideTableRows
} from '@/pages/guidePages/ui/shared/guideI18n'
import { buildGuideGlossary, renderGuideRichText } from '@/pages/guidePages/ui/shared/guideRichText'
import cls from './ExplainTimePage.module.scss'
import type { ExplainTimePageProps } from './types'

interface GuideTimeSectionConfig {
    id: 'overview' | 'baseline' | 'dayKeys' | 'weekend'
    anchor: string
    headerKeys?: readonly string[]
}

const GUIDE_TIME_SECTIONS: readonly GuideTimeSectionConfig[] = [
    {
        id: 'overview',
        anchor: 'explain-time-overview',
        headerKeys: ['season', 'entryTime', 'comment'] as const
    },
    {
        id: 'baseline',
        anchor: 'explain-time-baseline'
    },
    {
        id: 'dayKeys',
        anchor: 'explain-time-day-keys'
    },
    {
        id: 'weekend',
        anchor: 'explain-time-weekend'
    }
]

export default function ExplainTimePage({ className, translationNamespace = 'guide' }: ExplainTimePageProps) {
    const { t, i18n } = useTranslation(translationNamespace)

    const sections = useMemo(
        () =>
            GUIDE_TIME_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const buildPageGlossary = () =>
        buildGuideGlossary(
            readAvailableGuideTermGroups(
                i18n,
                GUIDE_TIME_SECTIONS.map(section => `timePage.sections.${section.id}.terms`)
            )
        )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.ExplainTimePage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('timePage.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('timePage.header.subtitle')}</Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                {GUIDE_TIME_SECTIONS.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {t(`timePage.sections.${section.id}.title`)}
                        </Text>

                        <LocalizedContentBoundary name={`GuideTime:${section.id}:paragraphs`}>
                            {() => {
                                const glossary = buildPageGlossary()
                                const paragraphs = readGuideStringList(
                                    i18n,
                                    `timePage.sections.${section.id}.paragraphs`
                                )

                                return (
                                    <div className={cls.copyBlock}>
                                        {paragraphs.map((paragraph, paragraphIndex) => (
                                            <Text
                                                key={`${section.id}-paragraph-${paragraphIndex}`}
                                                className={cls.sectionText}>
                                                {renderGuideRichText(paragraph, { glossary })}
                                            </Text>
                                        ))}
                                    </div>
                                )
                            }}
                        </LocalizedContentBoundary>

                        {section.headerKeys && (
                            <LocalizedContentBoundary name={`GuideTime:${section.id}:table`}>
                                {() => {
                                    const headerKeys = section.headerKeys
                                    if (!headerKeys) {
                                        return null
                                    }

                                    const glossary = buildPageGlossary()
                                    const rows = readGuideTableRows(i18n, `timePage.sections.${section.id}.table.rows`)

                                    return (
                                        <div className={cls.tableWrap}>
                                            <table className={cls.infoTable}>
                                                <thead>
                                                    <tr>
                                                        {headerKeys.map(headerKey => (
                                                            <th key={`${section.id}-header-${headerKey}`}>
                                                                {t(
                                                                    `timePage.sections.${section.id}.table.headers.${headerKey}`
                                                                )}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row, rowIndex) => (
                                                        <tr key={`${section.id}-row-${rowIndex}`}>
                                                            {row.map((cell, cellIndex) => (
                                                                <td
                                                                    key={`${section.id}-row-${rowIndex}-cell-${cellIndex}`}>
                                                                    {renderGuideRichText(cell, { glossary })}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                                }}
                            </LocalizedContentBoundary>
                        )}

                        <div className={cls.calloutGrid}>
                            <article className={cls.callout}>
                                <Text type='h4' className={cls.calloutTitle}>
                                    {t('labels.why')}
                                </Text>
                                <LocalizedContentBoundary name={`GuideTime:${section.id}:why`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderGuideRichText(t(`timePage.sections.${section.id}.why`), {
                                                    glossary
                                                })}
                                            </Text>
                                        )
                                    }}
                                </LocalizedContentBoundary>
                            </article>

                            <article className={cls.callout}>
                                <Text type='h4' className={cls.calloutTitle}>
                                    {t('labels.example')}
                                </Text>
                                <LocalizedContentBoundary name={`GuideTime:${section.id}:example`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderGuideRichText(t(`timePage.sections.${section.id}.example`), {
                                                    glossary
                                                })}
                                            </Text>
                                        )
                                    }}
                                </LocalizedContentBoundary>
                            </article>
                        </div>
                    </section>
                ))}
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
