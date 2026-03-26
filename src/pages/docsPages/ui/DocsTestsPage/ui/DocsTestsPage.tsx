import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { DOCS_TESTS_TABS } from '@/shared/utils/docsTabs'
import { useTranslation } from 'react-i18next'
import { buildDocsGlossary, renderDocsRichText } from '@/pages/docsPages/ui/shared/docsRichText'
import { readAvailableDocsTermGroups, readDocsStringList } from '@/pages/docsPages/ui/shared/docsI18n'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import cls from './DocsTestsPage.module.scss'
import type { DocsTestsPageProps } from './types'

export default function DocsTestsPage({ className, translationNamespace = 'docs' }: DocsTestsPageProps) {
    const { t, i18n } = useTranslation(translationNamespace)
    const sections = useMemo(
        () =>
            DOCS_TESTS_TABS.map(section => ({
                ...section,
                label: t(`testsPage.labels.${section.id}`, { defaultValue: section.label })
            })),
        [t]
    )
    const termKeys = DOCS_TESTS_TABS.map(section => `testsPage.sections.${section.id}.terms`)
    const buildPageGlossary = () => buildDocsGlossary(readAvailableDocsTermGroups(i18n, termKeys, translationNamespace))
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.DocsTestsPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <Text type='h2'>{t('testsPage.title')}</Text>
                <Text className={cls.subtitle}>{t('testsPage.subtitle')}</Text>
            </header>

            <div className={cls.sectionsGrid}>
                {sections.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {section.label}
                        </Text>

                        <LocalizedContentBoundary name={`DocsTests:${section.id}:paragraphs`}>
                            {() => {
                                const paragraphs = readDocsStringList(
                                    i18n,
                                    `testsPage.sections.${section.id}.paragraphs`,
                                    translationNamespace
                                )
                                const glossary = buildPageGlossary()

                                return (
                                    <div className={cls.copyBlock}>
                                        {paragraphs.map((paragraph, paragraphIndex) => (
                                            <Text
                                                key={`${section.id}-paragraph-${paragraphIndex}`}
                                                className={cls.sectionText}>
                                                {renderDocsRichText(paragraph, { glossary })}
                                            </Text>
                                        ))}
                                    </div>
                                )
                            }}
                        </LocalizedContentBoundary>

                        <div className={cls.calloutGrid}>
                            <article className={cls.callout}>
                                <Text type='h4' className={cls.calloutTitle}>
                                    {t('labels.why')}
                                </Text>
                                <LocalizedContentBoundary name={`DocsTests:${section.id}:why`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderDocsRichText(t(`testsPage.sections.${section.id}.why`), {
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
                                <LocalizedContentBoundary name={`DocsTests:${section.id}:example`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderDocsRichText(t(`testsPage.sections.${section.id}.example`), {
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
