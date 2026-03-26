import type { CSSProperties } from 'react'
import TextProps from './types'
import cls from './Text.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { Element } from '@/shared/ui/Element'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'

function containsExplicitTermMarkup(text: string): boolean {
    return /\[\[[a-z0-9_-]+\|[^\]]+\]\]/i.test(text)
}

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

    // Text — основной owner для строкового UI-текста.
    // Если в переводе уже лежит explicit tooltip markup, его нужно раскрывать здесь,
    // а не требовать от каждой страницы вручную вызывать rich-text renderer.
    const resolvedChildren =
        typeof children === 'string' && containsExplicitTermMarkup(children) ?
            renderTermTooltipRichText(children)
        :   children

    return (
        <Element
            type={type}
            className={classNames(cls.Text, {}, [className || '', cls[type]])}
            style={mergedStyle}
            {...rest}>
            {resolvedChildren}
        </Element>
    )
}
