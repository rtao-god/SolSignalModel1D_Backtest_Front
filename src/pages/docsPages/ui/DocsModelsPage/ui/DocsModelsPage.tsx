import { useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { DOCS_MODELS_TABS } from '@/shared/utils/docsTabs'
import { ViewModeToggle, type ViewMode } from '@/shared/ui/ViewModeToggle/ui/ViewModeToggle'
import cls from './DocsModelsPage.module.scss'
import type { DocsModelsPageProps } from './types'

/*
	DocsModelsPage — описание моделей и пайплайна.

	Зачем:
		- Даёт структуру документации по моделям.
		- Позволяет переключать бизнес/технический режим описаний.

	Контракты:
		- DOCS_MODELS_TABS содержит стабильные id/anchor для секций.
*/

// Пропсы страницы описания моделей.
export default function DocsModelsPage({ className }: DocsModelsPageProps) {
    const [mode, setMode] = useState<ViewMode>('business')

    const sections = useMemo(() => DOCS_MODELS_TABS, [])

    const BUSINESS_TEXT: Record<string, string> = {
        'models-overview':
            'Модель — это несколько слоёв, которые последовательно уточняют прогноз. Сначала дневная модель даёт базовый класс (рост/боковик/падение), затем микро‑модель уточняет направление внутри боковика, а SL‑модель оценивает риск попадания в стоп‑лосс и может «ужесточить» решение.',
        'models-daily':
            'Дневная модель — главный источник сигнала. Она даёт три класса (UP/FLAT/DOWN) и их вероятности на горизонте 24 часа. Эти вероятности затем используются как базовый слой для всех дальнейших решений.',
        'models-micro':
            'Микро‑модель включается только когда дневная модель видит боковик. Её задача — уточнить направление внутри бокового режима, чтобы не терять возможности на небольших движениях.',
        'models-sl':
            'SL‑модель оценивает риск «плохого дня» (высокий шанс стоп‑лосса). Если риск высокий, она снижает уверенность в направлении и может перевести день в режим осторожной торговли.',
        'models-pipeline':
            'Пайплайн отвечает за сбор данных, фильтрацию пропусков и единый «срез» времени (as‑of). Это нужно, чтобы прогноз был честным и воспроизводимым.'
    }

    const TECH_TEXT: Record<string, string> = {
        'models-overview':
            'Все слои работают на одном наборе дневных записей и используют строгие правила времени (as‑of / cutoff). Метки и оценки строятся в path‑based логике, чтобы избежать утечек по будущей цене.',
        'models-daily':
            'Дневная модель — 3‑классовая классификация (Down/Flat/Up) с выходом Prob3. Она формирует базовые вероятности P_day, которые затем прокидываются в агрегацию.',
        'models-micro':
            'Микро‑модель активируется только при классе FLAT дневной модели. Она выдаёт микро‑направление (micro‑up/micro‑down), формируя слой Day+Micro.',
        'models-sl':
            'SL‑модель выдаёт вероятность SL‑события и бинарное решение high‑risk. В агрегации она формирует слой Total (Day+Micro+SL), снижая рискованные направления.',
        'models-pipeline':
            'Пайплайн фиксирует границы Train/OOS/Recent, формирует as‑of срезы и исключает невалидные дни. Это обеспечивает честную оценку метрик.'
    }

    return (
        <div className={classNames(cls.DocsModelsPage, {}, [className ?? ''])}>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>Модели и пайплайн</Text>
                    <Text className={cls.subtitle}>
                        Подробное описание слоёв модели, их роли и технических ограничений. Переключайте режим, чтобы
                        видеть бизнес‑или технический взгляд.
                    </Text>
                </div>

                <ViewModeToggle mode={mode} onChange={setMode} className={cls.modeToggle} />
            </header>

            <div className={cls.sectionsGrid}>
                {sections.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {section.label}
                        </Text>

                        <Text className={cls.sectionText}>
                            {mode === 'business' ?
                                BUSINESS_TEXT[section.id] ?? 'Описание раздела.'
                            :   TECH_TEXT[section.id] ?? 'Техническое описание раздела.'}
                        </Text>
                    </section>
                ))}
            </div>
        </div>
    )
}
