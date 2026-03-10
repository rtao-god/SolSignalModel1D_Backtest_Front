import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { GUIDE_SPLITS_TABS } from '@/shared/utils/guideTabs'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import {
    readAvailableGuideTermGroups,
    readGuideStringListOrThrow,
    readGuideTableRowsOrThrow
} from '@/pages/guidePages/ui/shared/guideI18n'
import { buildGuideGlossaryOrThrow, renderGuideRichText } from '@/pages/guidePages/ui/shared/guideRichText'
import cls from './ExplainSplitsPage.module.scss'
import type { ExplainSplitsPageProps } from './types'

interface GuideSplitsSectionConfig {
    id: 'overview' | 'train' | 'oos' | 'recent' | 'full'
    anchor: string
    headerKeys?: readonly string[]
}

const GUIDE_SPLITS_SECTIONS: readonly GuideSplitsSectionConfig[] = [
    {
        id: 'overview',
        anchor: 'explain-splits-overview',
        headerKeys: ['slice', 'includes', 'question'] as const
    },
    {
        id: 'train',
        anchor: 'explain-splits-train'
    },
    {
        id: 'oos',
        anchor: 'explain-splits-oos'
    },
    {
        id: 'recent',
        anchor: 'explain-splits-recent'
    },
    {
        id: 'full',
        anchor: 'explain-splits-full'
    }
]

export default function ExplainSplitsPage({
    className,
    translationNamespace = 'guide'
}: ExplainSplitsPageProps) {
    const { t, i18n } = useTranslation(translationNamespace)

    const sections = useMemo(
        () =>
            GUIDE_SPLITS_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const buildPageGlossary = () =>
        buildGuideGlossaryOrThrow(
            readAvailableGuideTermGroups(
                i18n,
                GUIDE_SPLITS_SECTIONS.map(section => `splitsPage.sections.${section.id}.terms`)
            )
        )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.ExplainSplitsPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('splitsPage.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('splitsPage.header.subtitle')}</Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                {GUIDE_SPLITS_SECTIONS.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {t(`splitsPage.sections.${section.id}.title`)}
                        </Text>

                        <LocalizedContentBoundary name={`GuideSplits:${section.id}:paragraphs`}>
                            {() => {
                                const glossary = buildPageGlossary()
                                const paragraphs = readGuideStringListOrThrow(i18n, `splitsPage.sections.${section.id}.paragraphs`)

                                return (
                                    <div className={cls.copyBlock}>
                                        {paragraphs.map((paragraph, paragraphIndex) => (
                                            <Text key={`${section.id}-paragraph-${paragraphIndex}`} className={cls.sectionText}>
                                                {renderGuideRichText(paragraph, { glossary })}
                                            </Text>
                                        ))}
                                    </div>
                                )
                            }}
                        </LocalizedContentBoundary>

                        {section.headerKeys && (
                            <LocalizedContentBoundary name={`GuideSplits:${section.id}:table`}>
                                {() => {
                                    const headerKeys = section.headerKeys
                                    if (!headerKeys) {
                                        return null
                                    }

                                    const glossary = buildPageGlossary()
                                    const rows = readGuideTableRowsOrThrow(i18n, `splitsPage.sections.${section.id}.table.rows`)

                                    return (
                                        <div className={cls.tableWrap}>
                                            <table className={cls.infoTable}>
                                                <thead>
                                                    <tr>
                                                        {headerKeys.map(headerKey => (
                                                            <th key={`${section.id}-header-${headerKey}`}>
                                                                {t(`splitsPage.sections.${section.id}.table.headers.${headerKey}`)}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row, rowIndex) => (
                                                        <tr key={`${section.id}-row-${rowIndex}`}>
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={`${section.id}-row-${rowIndex}-cell-${cellIndex}`}>
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
                                <LocalizedContentBoundary name={`GuideSplits:${section.id}:why`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderGuideRichText(t(`splitsPage.sections.${section.id}.why`), { glossary })}
                                            </Text>
                                        )
                                    }}
                                </LocalizedContentBoundary>
                            </article>

                            <article className={cls.callout}>
                                <Text type='h4' className={cls.calloutTitle}>
                                    {t('labels.example')}
                                </Text>
                                <LocalizedContentBoundary name={`GuideSplits:${section.id}:example`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderGuideRichText(t(`splitsPage.sections.${section.id}.example`), { glossary })}
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



