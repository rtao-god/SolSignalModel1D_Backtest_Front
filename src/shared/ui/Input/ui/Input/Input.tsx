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
    fz,
    border,
    error = '',
    ...rest
}: InputProps) {
    const inputClassName = classNames(cls.Input, {
        [cls.error_border]: error,
        [cls[className]]: className
    })

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
                fontSize: fz,
                border
            }}
        />
    )
}

