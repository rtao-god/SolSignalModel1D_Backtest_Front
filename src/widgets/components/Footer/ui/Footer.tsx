import classNames from '@/shared/lib/helpers/classNames'
import cls from './Footer.module.scss'
import { Text } from '@/shared/ui'

interface FooterProps {
    className?: string
}

export default function Footer({ className }: FooterProps) {
    const year = new Date().getFullYear()

    return (
        <footer className={classNames(cls.Footer, {}, [className ?? ''])}>
            <div className={cls.inner}>

                <div className={cls.logoBlock}>

                    <div className={cls.logoPlaceholder} aria-hidden='true' />
                    <span className={cls.brandName}>Project Name</span>
                </div>


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
