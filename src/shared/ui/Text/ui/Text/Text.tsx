import type { CSSProperties } from 'react'
import TextProps from './types'
import cls from './Text.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { Element } from '@/shared/ui'

export default function Text({
    type = 'p',
    children,
    position = 'start',
    fz,
    color,
    fw,
    style,
    className = '',
    ...rest
}: TextProps) {
    const mergedStyle: CSSProperties = {
        ...(style ?? {}),
        ...(fz !== undefined && { fontSize: fz }),
        ...(color && { color }),
        ...(fw !== undefined && { fontWeight: fw })
    }

    if (position) {
        ;(mergedStyle as any).textAlign = position
    }

    return (
        <Element
            type={type}
            className={classNames(cls.Text, {}, [className || '', cls[type]])}
            style={mergedStyle}
            {...rest}>
            {children}
        </Element>
    )
}
