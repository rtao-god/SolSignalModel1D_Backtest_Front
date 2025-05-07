import classNames from '@/shared/lib/helpers/classNames'
import cls from './LangSwitcher.module.scss'
import { useTranslation } from 'react-i18next'
import { Btn } from '@/shared/ui'

interface LangSwitcherProps {
    className?: string
}

export default function LangSwitcher({ className }: LangSwitcherProps) {
    const { t, i18n } = useTranslation('LangSwitcher')

    const toggle = async () => {
        await i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru')
    }

    return (
        <Btn className={classNames(cls.Lang_switcher, {}, [className ?? ''])} onClick={() => toggle}>
            {t('Translate')}
        </Btn>
    )
}
