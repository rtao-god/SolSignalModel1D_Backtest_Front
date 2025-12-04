import classNames from '@/shared/lib/helpers/classNames'
import cls from './LangSwitcher.module.scss'
import { useTranslation } from 'react-i18next'
import { Btn } from '@/shared/ui'

interface LangSwitcherProps {
    className?: string
}

export default function LangSwitcher({ className }: LangSwitcherProps) {
    const { i18n } = useTranslation('LangSwitcher')

    const isRu = i18n.language.startsWith('ru')
    const currentLang = (isRu ? 'ru' : 'en') as 'ru' | 'en'
    const nextLang = isRu ? 'en' : 'ru'

    const currentLabel = currentLang.toUpperCase()
    const nextLabel = nextLang.toUpperCase()

    const toggle = async () => {
        await i18n.changeLanguage(nextLang)
    }

    return (
        <Btn
            variant='chip'
            colorScheme='accent'
            className={classNames(cls.Lang_switcher, {}, [className ?? ''])}
            onClick={toggle}
            data-lang={currentLang}
            aria-label={`Switch language to ${nextLabel}`}
            title={`Switch language to ${nextLabel}`}>
            <span className={cls.Lang_switcherInner}>
                <span className={cls.Lang_switcherDot} />
                <span className={cls.Lang_switcherCode}>{currentLabel}</span>
            </span>
        </Btn>
    )
}
