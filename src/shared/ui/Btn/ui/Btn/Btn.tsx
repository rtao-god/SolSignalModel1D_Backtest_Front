import { useTheme } from '@/shared/lib/hooks/useTheme'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Btn.module.scss'
import { BtnProps } from './types'
import { Theme } from '@/app/providers/ThemeProvider/lib/ThemeContext'

export default function Btn({
    children,
    color,
    width,
    height,
    br,
    padding,
    border,
    fz,
    minW,
    className,
    size = 'medium',
    dataTestid,
    ...rest
}: BtnProps) {
    const { theme } = useTheme()
    const themeColor = theme === Theme.DARK ? 'green' : 'blue'

    return (
        <button
            {...rest}
            className={classNames(
                cls.Btn,
                {
                    [cls[themeColor]]: true,
                    [cls[size]]: true
                },
                [className ?? '']
            )}
            style={{
                fontSize: fz,
                width,
                height,
                borderRadius: br,
                padding,
                minWidth: minW,
                color,
                border
            }}
            data-testid={dataTestid}>
            {children}
        </button>
    )
}
