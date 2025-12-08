import { useTheme } from '@/shared/lib/hooks/useTheme'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Btn.module.scss'
import { BtnColorScheme, BtnProps } from './types'
import { Theme } from '@/app/providers/ThemeProvider/lib/ThemeContext'

export default function Btn({
    children,
    variant = 'primary',
    size = 'md',
    colorScheme,
    className,
    dataTestid,
    ...rest
}: BtnProps) {
    const { theme } = useTheme()

    // Цветовая схема по умолчанию зависит от темы, но может быть явно переопределена.
    const resolvedColorScheme: BtnColorScheme = colorScheme ?? (theme === Theme.DARK ? 'green' : 'blue')

    return (
        <Btn
            {...rest}
            className={classNames(cls.Btn, {}, [className ?? ''])}
            data-variant={variant}
            data-size={size}
            data-color-scheme={resolvedColorScheme}
            data-testid={dataTestid}>
            {children}
        </Btn>
    )
}
