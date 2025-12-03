import classNames from '@/shared/lib/helpers/classNames'
import cls from './LangSwitcher.module.scss'
import { useTranslation } from 'react-i18next'
import { Btn } from '@/shared/ui'

interface LangSwitcherProps {
    className?: string
}

export default function LangSwitcher({ className }: LangSwitcherProps) {
    const { i18n } = useTranslation('LangSwitcher')

    // Оставляем логику "двух языков" в одном месте.
    // При появлении третьего (например, 'ka') будет одна точка расширения.
    const isRu = i18n.language.startsWith('ru')
    const currentLang = (isRu ? 'ru' : 'en') as 'ru' | 'en'
    const nextLang = isRu ? 'en' : 'ru'

    const currentLabel = currentLang.toUpperCase()
    const nextLabel = nextLang.toUpperCase()

    // Делаем переключатель async, чтобы при необходимости можно было
    // навесить обработку ошибок/лоадер/метрику вокруг одной точки входа.
    const toggle = async () => {
        await i18n.changeLanguage(nextLang)
    }

    return (
        <Btn
            className={classNames(cls.Lang_switcher, {}, [className ?? ''])}
            onClick={toggle}
            data-lang={currentLang}
            aria-label={`Switch language to ${nextLabel}`}
            title={`Switch language to ${nextLabel}`}>
            {/* Визуально показываем только текущий язык, а состояние переключения
                — через цвет/акцент и подсказку (title/aria). */}
            <span className={cls.Lang_switcherInner}>
                <span className={cls.Lang_switcherDot} />
                <span className={cls.Lang_switcherCode}>{currentLabel}</span>
            </span>
        </Btn>
    )
}
