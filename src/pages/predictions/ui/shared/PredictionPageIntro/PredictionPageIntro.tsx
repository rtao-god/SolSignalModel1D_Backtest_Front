import type { ReactNode } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { BulletList } from '@/shared/ui/BulletList'
import cls from './PredictionPageIntro.module.scss'

interface PredictionPageIntroProps {
    title: string
    lead: string
    bullets: readonly string[]
    renderText: (text: string) => ReactNode
    className?: string
}

// Общий entry-layer для страниц прогноза и истории нужен до фильтров и тяжёлых отчётов:
// пользователь сначала получает смысл экрана, а уже потом читает метрики, таблицы и режимы.
export function PredictionPageIntro({ title, lead, bullets, renderText, className }: PredictionPageIntroProps) {
    return (
        <section className={classNames(cls.PredictionPageIntro, {}, [className ?? ''])}>
            <Text type='h2' className={cls.title}>
                {renderText(title)}
            </Text>
            <Text className={cls.lead}>{renderText(lead)}</Text>
            <BulletList
                className={cls.bulletList}
                itemClassName={cls.bulletItem}
                contentClassName={cls.bulletText}
                items={bullets.map((bullet, index) => ({
                    key: `prediction-page-intro-${index}`,
                    content: renderText(bullet)
                }))}
            />
        </section>
    )
}
