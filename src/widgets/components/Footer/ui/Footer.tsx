import classNames from '@/shared/lib/helpers/classNames'
import cls from './Footer.module.scss'
import { Text } from '@/shared/ui'

interface FooterProps {
    className?: string
}

export default function Footer({ className }: FooterProps) {
    const year = new Date().getFullYear()

    return (
        // Используется семантический <footer>, но по стилям это тот же блок, что и раньше
        <footer className={classNames(cls.Footer, {}, [className ?? ''])}>
            <div className={cls.inner}>
                {/* Блок под логотип/иконку. Сейчас — только placeholder */}
                <div className={cls.logoBlock}>
                    {/* Круглый placeholder под иконку/логотип */}
                    <div className={cls.logoPlaceholder} aria-hidden='true' />
                    <span className={cls.brandName}>Project Name</span>
                </div>

                {/* Текстовый блок с моковыми текстами */}
                <div className={cls.textBlock}>
                    <Text className={cls.textPrimary}>
                        Все результаты бэктестов носят ознакомительный характер и не являются инвестиционной
                        рекомендацией.
                    </Text>
                    <Text className={cls.textSecondary}>
                        © {year} Project Name. Внутренний интерфейс для экспериментов и анализа.
                    </Text>
                </div>
            </div>
        </footer>
    )
}
