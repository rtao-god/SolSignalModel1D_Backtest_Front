import cls from './Input.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { InputProps } from './types'

export default function Input({
    type = 'text',
    width = '100%',
    borderColor,
    bt,
    br,
    bb,
    bl,
    btr,
    bbr,
    btl,
    bbl,
    bgcolor,
    height,
    borderRadius,
    padding,
    className = '',
    border,
    error = '',
    ...rest
}: InputProps) {
    // Внешний className приходит из page/shared CSS Modules и не может резолвиться через локальный cls этого файла.
    // Здесь нужен прямой passthrough, иначе страница теряет возможность доопределить цветовую схему native input.
    const inputClassName = classNames(cls.Input, {
        [cls.error_border]: error
    }, [className])

    return (
        <input
            {...rest}
            className={inputClassName}
            type={type}
            style={{
                width,
                borderRadius: borderRadius ?? `${btr ?? ''} ${bbr ?? ''} ${bbl ?? ''} ${btl ?? ''}`,
                height,
                borderColor,
                borderTop: bt,
                borderRight: br,
                borderBottom: bb,
                borderLeft: bl,
                backgroundColor: bgcolor,
                padding,
                border
            }}
        />
    )
}
