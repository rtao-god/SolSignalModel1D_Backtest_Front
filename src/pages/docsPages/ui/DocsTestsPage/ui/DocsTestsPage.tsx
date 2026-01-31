import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { DOCS_TESTS_TABS } from '@/shared/utils/docsTabs'
import cls from './DocsTestsPage.module.scss'

/*
	DocsTestsPage — описание тестов и self-check'ов.

	Зачем:
		- Объясняет назначение тестов и проверок пайплайна.
		- Дает якоря для навигации по разделам тестов.

	Контракты:
		- DOCS_TESTS_TABS содержит стабильные id/anchor для секций.
*/

// Пропсы страницы описания тестов.
interface DocsTestsPageProps {
    className?: string
}

export default function DocsTestsPage({ className }: DocsTestsPageProps) {
    return (
        <div className={classNames(cls.DocsTestsPage, {}, [className ?? ''])}>
            <header className={cls.headerRow}>
                <Text type='h2'>Тесты и self-check&apos;и</Text>
                <Text className={cls.subtitle}>
                    Здесь будет описание leakage-тестов, sanity-check&apos;ов, перфоманс-проверок и того, как результаты
                    тестов влияют на допуск модели до боевого запуска. Сейчас текст заглушечный.
                </Text>
            </header>

            <div className={cls.sectionsGrid}>
                {DOCS_TESTS_TABS.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {section.label}
                        </Text>
                        <Text className={cls.sectionText}>
                            Сюда позже можно вынести, какие части пайплайна покрываются этим набором тестов, какие
                            типичные баги они ловят (утечки, неконсистентные окна, сломанный baseline exit) и какие
                            инварианты считаются критичными.
                        </Text>
                    </section>
                ))}
            </div>
        </div>
    )
}
