import classNames from '@/shared/lib/helpers/classNames'
import cls from './LangSwitcher.module.scss'
import { useTranslation } from 'react-i18next'
import { Btn } from '@/shared/ui'

interface LangSwitcherProps {
    className?: string
}

export default function LangSwitcher({ className }: LangSwitcherProps) {
    // Берём только i18n, t здесь не нужен
    const { i18n } = useTranslation('LangSwitcher')

    // Вычисляем, на какой язык переключаться
    // Зачем: логика переключения в одном месте, чтобы можно было легко расширить (например, добавить 'ka')
    const nextLang = i18n.language.startsWith('ru') ? 'en' : 'ru'

    // Асинхронный переключатель языка
    // Зачем: i18next.changeLanguage возвращает промис, можно потом добавить обработку ошибок/лоадер
    const toggle = async () => {
        await i18n.changeLanguage(nextLang)
    }

    // Текущий язык в виде RU / EN (на случай ru-RU, en-US и т.п. берём первые 2 буквы)
    const currentLang = i18n.language.slice(0, 2).toUpperCase()

    return (
        <Btn
            className={classNames(cls.Lang_switcher, {}, [className ?? ''])}
            // ВАЖНО: передаём сам колбэк, а не () => toggle
            onClick={toggle}
            // Можно сразу подумать про a11y
            aria-label={`Switch language to ${nextLang.toUpperCase()}`}
            title={`Switch language to ${nextLang.toUpperCase()}`}>
            {/* Показываем текущий и целевой язык: RU / EN */}
            {currentLang} / {nextLang.toUpperCase()}
        </Btn>
    )
}

