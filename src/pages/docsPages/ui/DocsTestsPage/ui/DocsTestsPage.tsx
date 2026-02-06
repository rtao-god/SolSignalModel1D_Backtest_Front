import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { DOCS_TESTS_TABS } from '@/shared/utils/docsTabs'
import cls from './DocsTestsPage.module.scss'
import type { DocsTestsPageProps } from './types'

/*
	DocsTestsPage — описание тестов и self-check'ов.

	Зачем:
		- Объясняет назначение тестов и проверок пайплайна.
		- Дает якоря для навигации по разделам тестов.

	Контракты:
		- DOCS_TESTS_TABS содержит стабильные id/anchor для секций.
*/

export default function DocsTestsPage({ className }: DocsTestsPageProps) {
    const SECTION_TEXT: Record<string, string> = {
        'tests-overview':
            'Общий обзор критичных проверок пайплайна. Если эти тесты не проходят, модель не должна выходить в боевой расчёт.',
        'tests-sanity':
            'Sanity‑checks проверяют инварианты данных и отчётов: непрерывность рядов, корректность диапазонов, отсутствие NaN/Infinity в вероятностях.',
        'tests-leakage':
            'Leakage‑тесты ищут утечки будущей информации в фичах и метках. Это ключевая защита от «рисования» хорошей статистики.',
        'tests-perf':
            'Перфоманс‑проверки следят за временем расчёта и объёмом памяти, чтобы пайплайн стабильно работал на полном горизонте.'
    }

    return (
        <div className={classNames(cls.DocsTestsPage, {}, [className ?? ''])}>
            <header className={cls.headerRow}>
                <Text type='h2'>Тесты и self-check&apos;и</Text>
                <Text className={cls.subtitle}>
                    Раздел о том, какие проверки защищают модель от утечек данных, некорректных метрик и деградации
                    пайплайна. Ниже — краткие пояснения по каждому блоку тестов.
                </Text>
            </header>

            <div className={cls.sectionsGrid}>
                {DOCS_TESTS_TABS.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {section.label}
                        </Text>
                        <Text className={cls.sectionText}>
                            {SECTION_TEXT[section.id] ?? 'Описание раздела.'}
                        </Text>
                    </section>
                ))}
            </div>
        </div>
    )
}
