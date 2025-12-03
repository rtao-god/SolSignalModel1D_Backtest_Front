import { useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { Btn } from '@/shared/ui/Btn'
import { DOCS_MODELS_TABS } from '@/shared/utils/docsTabs'
import cls from './DocsModelsPage.module.scss'

type ViewMode = 'business' | 'technical'

interface DocsModeToggleProps {
    mode: ViewMode
    onChange: (mode: ViewMode) => void
}

/**
 * Переключатель режима описания (бизнес / технарь).
 * Логика близка к PfiPage, но без экспорта.
 */
function DocsModeToggle({ mode, onChange }: DocsModeToggleProps) {
    const handleBusinessClick = () => {
        if (mode !== 'business') {
            onChange('business')
        }
    }

    const handleTechnicalClick = () => {
        if (mode !== 'technical') {
            onChange('technical')
        }
    }

    return (
        <div className={cls.modeToggle}>
            <Btn
                size='small'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'business' }, [])}
                onClick={handleBusinessClick}>
                Бизнес
            </Btn>
            <Btn
                size='small'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'technical' }, [])}
                onClick={handleTechnicalClick}>
                Технарь
            </Btn>
        </div>
    )
}

interface DocsModelsPageProps {
    className?: string
}

/**
 * Страница описания моделей и пайплайна:
 * - маршрут /docs/models;
 * - подвкладки управляются DOCS_MODELS_TABS (+ сайдбар);
 * - сверху глобальный переключатель бизнес/тех режима.
 */
export default function DocsModelsPage({ className }: DocsModelsPageProps) {
    const [mode, setMode] = useState<ViewMode>('business')

    const sections = useMemo(() => DOCS_MODELS_TABS, [])

    return (
        <div className={classNames(cls.DocsModelsPage, {}, [className ?? ''])}>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>Модели и пайплайн</Text>
                    <Text type='p' className={cls.subtitle}>
                        Здесь позже будет детальное текстовое описание дневной модели (move/dir), микро-слоя, SL-модели
                        и пайплайна данных. Сейчас текст заглушечный, фокус на структуре и якорях.
                    </Text>
                </div>

                <DocsModeToggle mode={mode} onChange={setMode} />
            </header>

            <div className={cls.sectionsGrid}>
                {sections.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {section.label}
                        </Text>

                        {mode === 'business' ?
                            <Text type='p' className={cls.sectionText}>
                                Здесь будет бизнес-описание блока «{section.label}»: какую задачу решает, какие риски
                                закрывает, как влияет на устойчивость профиля и какие ключевые метрики стоит показывать
                                пользователю.
                            </Text>
                        :   <Text type='p' className={cls.sectionText}>
                                Здесь будет техническое описание блока «{section.label}»: используемые фичи, схема
                                лейблинга (в том числе path-based), ограничения по данным, типы моделей и способы
                                контроля утечек данных.
                            </Text>
                        }
                    </section>
                ))}
            </div>
        </div>
    )
}
