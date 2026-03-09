import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { DOCS_TRUTHFULNESS_TABS } from '@/shared/utils/docsTabs'
import { useTranslation } from 'react-i18next'
import { buildDocsGlossaryOrThrow, renderDocsRichText } from '@/pages/docsPages/ui/shared/docsRichText'
import { readAvailableDocsTermGroups, readDocsStringListOrThrow, readDocsTableRowsOrThrow } from '@/pages/docsPages/ui/shared/docsI18n'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import cls from './DocsTruthfulnessPage.module.scss'
import type { DocsTruthfulnessPageProps } from './types'

const SECTION_TABLE_KEYS: Partial<Record<string, string>> = {
    'truth-overview': 'truthfulnessPage.sections.truth-overview.table.rows',
    'truth-structure': 'truthfulnessPage.sections.truth-structure.table.rows',
    'truth-tests': 'truthfulnessPage.sections.truth-tests.table.rows'
}

export default function DocsTruthfulnessPage({ className }: DocsTruthfulnessPageProps) {
    const { t, i18n } = useTranslation('docs')
    const sections = useMemo(
        () =>
            DOCS_TRUTHFULNESS_TABS.map(section => ({
                ...section,
                label: t(`truthfulnessPage.labels.${section.id}`, { defaultValue: section.label })
            })),
        [t]
    )
    const termKeys = DOCS_TRUTHFULNESS_TABS.map(section => `truthfulnessPage.sections.${section.id}.terms`)
    const buildPageGlossary = () => buildDocsGlossaryOrThrow(readAvailableDocsTermGroups(i18n, termKeys))
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.DocsTruthfulnessPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <Text type='h2'>{t('truthfulnessPage.title')}</Text>
                <Text className={cls.subtitle}>{t('truthfulnessPage.subtitle')}</Text>
            </header>

            <div className={cls.sectionsGrid}>
                {sections.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {section.label}
                        </Text>

                        <LocalizedContentBoundary name={`DocsTruthfulness:${section.id}:paragraphs`}>
                            {() => {
                                const paragraphs = readDocsStringListOrThrow(
                                    i18n,
                                    `truthfulnessPage.sections.${section.id}.paragraphs`
                                )
                                const glossary = buildPageGlossary()

                                return (
                                    <div className={cls.copyBlock}>
                                        {paragraphs.map((paragraph, paragraphIndex) => (
                                            <Text key={`${section.id}-paragraph-${paragraphIndex}`} className={cls.sectionText}>
                                                {renderDocsRichText(paragraph, { glossary })}
                                            </Text>
                                        ))}
                                    </div>
                                )
                            }}
                        </LocalizedContentBoundary>

                        {SECTION_TABLE_KEYS[section.id] && (
                            <LocalizedContentBoundary name={`DocsTruthfulness:${section.id}:table`}>
                                {() => {
                                    const tableRows = readDocsTableRowsOrThrow(i18n, SECTION_TABLE_KEYS[section.id]!)
                                    const glossary = buildPageGlossary()

                                    return (
                                        <div className={cls.tableWrap}>
                                            <table className={cls.infoTable}>
                                                <thead>
                                                    <tr>
                                                        <th>{t(`truthfulnessPage.sections.${section.id}.table.headers.col1`)}</th>
                                                        <th>{t(`truthfulnessPage.sections.${section.id}.table.headers.col2`)}</th>
                                                        <th>{t(`truthfulnessPage.sections.${section.id}.table.headers.col3`)}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tableRows.map((row, rowIndex) => (
                                                        <tr key={`${section.id}-row-${rowIndex}`}>
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={`${section.id}-row-${rowIndex}-cell-${cellIndex}`}>
                                                                    {renderDocsRichText(cell, { glossary })}
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
                                <LocalizedContentBoundary name={`DocsTruthfulness:${section.id}:why`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderDocsRichText(t(`truthfulnessPage.sections.${section.id}.why`), { glossary })}
                                            </Text>
                                        )
                                    }}
                                </LocalizedContentBoundary>
                            </article>

                            {section.id !== 'truth-overview' && (
                                <article className={cls.callout}>
                                    <Text type='h4' className={cls.calloutTitle}>
                                        {t('labels.example')}
                                    </Text>
                                    <LocalizedContentBoundary name={`DocsTruthfulness:${section.id}:example`}>
                                        {() => {
                                            const glossary = buildPageGlossary()

                                            return (
                                                <Text className={cls.calloutText}>
                                                    {renderDocsRichText(t(`truthfulnessPage.sections.${section.id}.example`), { glossary })}
                                                </Text>
                                            )
                                        }}
                                    </LocalizedContentBoundary>
                                </article>
                            )}
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


