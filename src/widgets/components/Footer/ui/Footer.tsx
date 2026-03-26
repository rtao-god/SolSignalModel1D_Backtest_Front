import { memo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Footer.module.scss'
import { Text } from '@/shared/ui'
import { useTranslation } from 'react-i18next'

interface FooterProps {
    className?: string
}

function Footer({ className }: FooterProps) {
    const { t } = useTranslation('common')
    const year = new Date().getFullYear()

    return (
        <footer className={classNames(cls.Footer, {}, [className ?? ''])}>
            <div className={cls.inner}>
                <div className={cls.logoBlock}>
                    <div className={cls.logoPlaceholder} aria-hidden='true' />
                    <span className={cls.brandName}>Project Name</span>
                </div>

                <div className={cls.textBlock}>
                    <Text className={cls.textPrimary}>{t('footer.disclaimer')}</Text>
                    <Text className={cls.textSecondary}>{t('footer.copyright', { year })}</Text>
                </div>
            </div>
        </footer>
    )
}

export default memo(Footer)
