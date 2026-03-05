import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { DOCS_TESTS_TABS } from '@/shared/utils/docsTabs'
import { useTranslation } from 'react-i18next'
import cls from './DocsTestsPage.module.scss'
import type { DocsTestsPageProps } from './types'

export default function DocsTestsPage({ className }: DocsTestsPageProps) {
    const { t } = useTranslation('docs')

    return (
        <div className={classNames(cls.DocsTestsPage, {}, [className ?? ''])}>
            <header className={cls.headerRow}>
                <Text type='h2'>{t('testsPage.title')}</Text>
                <Text className={cls.subtitle}>{t('testsPage.subtitle')}</Text>
            </header>

            <div className={cls.sectionsGrid}>
                {DOCS_TESTS_TABS.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {t(`testsPage.labels.${section.id}`, { defaultValue: section.label })}
                        </Text>
                        <Text className={cls.sectionText}>
                            {t(`testsPage.sections.${section.id}`, { defaultValue: t('testsPage.fallback') })}
                        </Text>
                    </section>
                ))}
            </div>
        </div>
    )
}
