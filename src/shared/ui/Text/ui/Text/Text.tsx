import type { CSSProperties } from 'react'
import TextProps from './types'
import cls from './Text.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { Element } from '@/shared/ui' // или прямой импорт, если нет barrel-а: import Element from '@/shared/ui/Element'

export default function Text({
    type = 'p',
    children,
    position = 'start',
    fz,
    color,
    fw,
    style,
    className = '',
    ...rest // сюда попадают id, aria-*, data-*, onClick и т.д.
}: TextProps) {
    // Берём исходные стили, если были
    const mergedStyle: CSSProperties = { ...(style ?? {}) }

    // Дальше аккуратно добавляем шорткаты.
    // Используем any только внутри реализации, не ломая публичный контракт.
    if (position) {
        ;(mergedStyle as any).textAlign = position
    }

    if (fz !== undefined) {
        ;(mergedStyle as any).fontSize = fz
    }

    if (color) {
        ;(mergedStyle as any).color = color
    }

    if (fw !== undefined) {
        ;(mergedStyle as any).fontWeight = fw
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
