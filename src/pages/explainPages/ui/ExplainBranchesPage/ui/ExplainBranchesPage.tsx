import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { GUIDE_BRANCHES_TABS } from '@/shared/utils/guideTabs'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import {
    readAvailableGuideTermGroups,
    readGuideStringList,
    readGuideTableRows
} from '@/pages/guidePages/ui/shared/guideI18n'
import { buildGuideGlossary, renderGuideRichText } from '@/pages/guidePages/ui/shared/guideRichText'
import cls from './ExplainBranchesPage.module.scss'
import type { ExplainBranchesPageProps } from './types'

interface GuideBranchesSectionConfig {
    id: 'overview' | 'base' | 'anti' | 'conditions' | 'usage'
    anchor: string
    headerKeys?: readonly string[]
}

const GUIDE_BRANCHES_SECTIONS: readonly GuideBranchesSectionConfig[] = [
    {
        id: 'overview',
        anchor: 'explain-branches-overview',
        headerKeys: ['branch', 'howItWorks', 'whenUseful'] as const
    },
    {
        id: 'base',
        anchor: 'explain-branches-base'
    },
    {
        id: 'anti',
        anchor: 'explain-branches-anti'
    },
    {
        id: 'conditions',
        anchor: 'explain-branches-conditions',
        headerKeys: ['filter', 'threshold', 'protection'] as const
    },
    {
        id: 'usage',
        anchor: 'explain-branches-usage'
    }
]

export default function ExplainBranchesPage({ className, translationNamespace = 'guide' }: ExplainBranchesPageProps) {
    const { t, i18n } = useTranslation(translationNamespace)

    const sections = useMemo(
        () =>
            GUIDE_BRANCHES_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const buildPageGlossary = () =>
        buildGuideGlossary(
            readAvailableGuideTermGroups(
                i18n,
                GUIDE_BRANCHES_SECTIONS.map(section => `branchesPage.sections.${section.id}.terms`)
            )
        )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.ExplainBranchesPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('branchesPage.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('branchesPage.header.subtitle')}</Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                {GUIDE_BRANCHES_SECTIONS.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {t(`branchesPage.sections.${section.id}.title`)}
                        </Text>

                        <LocalizedContentBoundary name={`GuideBranches:${section.id}:paragraphs`}>
                            {() => {
                                const glossary = buildPageGlossary()
                                const paragraphs = readGuideStringList(
                                    i18n,
                                    `branchesPage.sections.${section.id}.paragraphs`
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
                            <LocalizedContentBoundary name={`GuideBranches:${section.id}:table`}>
                                {() => {
                                    const headerKeys = section.headerKeys
                                    if (!headerKeys) {
                                        return null
                                    }

                                    const glossary = buildPageGlossary()
                                    const rows = readGuideTableRows(
                                        i18n,
                                        `branchesPage.sections.${section.id}.table.rows`
                                    )

                                    return (
                                        <div className={cls.tableWrap}>
                                            <table className={cls.infoTable}>
                                                <thead>
                                                    <tr>
                                                        {headerKeys.map(headerKey => (
                                                            <th key={`${section.id}-header-${headerKey}`}>
                                                                {t(
                                                                    `branchesPage.sections.${section.id}.table.headers.${headerKey}`
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
                                <LocalizedContentBoundary name={`GuideBranches:${section.id}:why`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderGuideRichText(t(`branchesPage.sections.${section.id}.why`), {
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
                                <LocalizedContentBoundary name={`GuideBranches:${section.id}:example`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderGuideRichText(t(`branchesPage.sections.${section.id}.example`), {
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
