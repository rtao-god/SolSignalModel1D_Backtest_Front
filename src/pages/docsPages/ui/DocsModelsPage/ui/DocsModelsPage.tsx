import { useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import {
    ReportViewControls,
    Text,
    buildBusinessTechnicalViewControlGroup,
    type BusinessTechnicalViewControlValue
} from '@/shared/ui'
import { DOCS_MODELS_TABS } from '@/shared/utils/docsTabs'
import { useTranslation } from 'react-i18next'
import { buildDocsGlossaryOrThrow, renderDocsRichText } from '@/pages/docsPages/ui/shared/docsRichText'
import { readAvailableDocsTermGroups, readDocsStringListOrThrow } from '@/pages/docsPages/ui/shared/docsI18n'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import cls from './DocsModelsPage.module.scss'
import type { DocsModelsPageProps } from './types'

const HIDDEN_EXAMPLE_SECTION_IDS = new Set(['models-overview'])

export default function DocsModelsPage({ className }: DocsModelsPageProps) {
    const { t, i18n } = useTranslation(['docs', 'common'])
    const [mode, setMode] = useState<BusinessTechnicalViewControlValue>('business')

    const sections = useMemo(
        () =>
            DOCS_MODELS_TABS.map(section => ({
                ...section,
                label: t(`modelsPage.labels.${section.id}`, { defaultValue: section.label })
            })),
        [t]
    )
    const termKeys = DOCS_MODELS_TABS.map(section => `modelsPage.sections.${section.id}.terms`)
    const buildPageGlossary = () => buildDocsGlossaryOrThrow(readAvailableDocsTermGroups(i18n, termKeys))
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    const viewControlGroups = useMemo(
        () => [
            buildBusinessTechnicalViewControlGroup({
                value: mode,
                onChange: setMode,
                label: t('modelsPage.controls.viewModeLabel', { ns: 'docs' }),
                ariaLabel: t('modelsPage.controls.viewModeAriaLabel', { ns: 'docs' }),
                labels: {
                    business: t('viewMode.business', { ns: 'common' }),
                    technical: t('viewMode.technical', { ns: 'common' })
                }
            })
        ],
        [mode, t]
    )

    return (
        <div className={classNames(cls.DocsModelsPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('modelsPage.title')}</Text>
                    <Text className={cls.subtitle}>{t('modelsPage.subtitle')}</Text>
                </div>

                <ReportViewControls groups={viewControlGroups} className={cls.modeControls} />
            </header>

            <div className={cls.sectionsGrid}>
                {sections.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {section.label}
                        </Text>

                        <LocalizedContentBoundary name={`DocsModels:${section.id}:paragraphs`}>
                            {() => {
                                const paragraphs = readDocsStringListOrThrow(i18n, `modelsPage.sections.${section.id}.${mode}`)
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

                        <div className={cls.calloutGrid}>
                            <article className={cls.callout}>
                                <Text type='h4' className={cls.calloutTitle}>
                                    {t('labels.why')}
                                </Text>
                                <LocalizedContentBoundary name={`DocsModels:${section.id}:why`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderDocsRichText(t(`modelsPage.sections.${section.id}.why`), { glossary })}
                                            </Text>
                                        )
                                    }}
                                </LocalizedContentBoundary>
                            </article>

                            {!HIDDEN_EXAMPLE_SECTION_IDS.has(section.id) && (
                                <article className={cls.callout}>
                                    <Text type='h4' className={cls.calloutTitle}>
                                        {t('labels.example')}
                                    </Text>
                                    <LocalizedContentBoundary name={`DocsModels:${section.id}:example`}>
                                        {() => {
                                            const glossary = buildPageGlossary()

                                            return (
                                                <Text className={cls.calloutText}>
                                                    {renderDocsRichText(t(`modelsPage.sections.${section.id}.example`), { glossary })}
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


