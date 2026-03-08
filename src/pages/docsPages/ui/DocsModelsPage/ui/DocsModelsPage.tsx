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
import cls from './DocsModelsPage.module.scss'
import type { DocsModelsPageProps } from './types'
export default function DocsModelsPage({ className }: DocsModelsPageProps) {
    const { t } = useTranslation(['docs', 'common'])
    const [mode, setMode] = useState<BusinessTechnicalViewControlValue>('business')

    const sections = useMemo(() => DOCS_MODELS_TABS, [])
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

    const resolveSectionText = (sectionId: string): string => {
        const fallbackKey = mode === 'business' ? 'modelsPage.fallback.business' : 'modelsPage.fallback.tech'
        return t(`modelsPage.sections.${sectionId}.${mode}`, { defaultValue: t(fallbackKey) })
    }

    return (
        <div className={classNames(cls.DocsModelsPage, {}, [className ?? ''])}>
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
                            {t(`modelsPage.labels.${section.id}`, { defaultValue: section.label })}
                        </Text>

                        <Text className={cls.sectionText}>{resolveSectionText(section.id)}</Text>
                    </section>
                ))}
            </div>
        </div>
    )
}
