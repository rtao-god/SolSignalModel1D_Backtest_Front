import type { CSSProperties } from 'react'
import TextProps, { TextTag, TextVariant } from './types'
import cls from './Text.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { Element } from '@/shared/ui/Element'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'

function containsExplicitTermMarkup(text: string): boolean {
    return /\[\[[a-z0-9_-]+\|[^\]]+\]\]/i.test(text)
}

function resolveTextVariant(type: TextTag, variant?: TextVariant): TextVariant {
    if (variant) {
        return variant
    }

    if (type === 'h1' || type === 'h2') {
        return 'page-title'
    }

    if (type === 'h3') {
        return 'section-title'
    }

    if (type === 'h4') {
        return 'card-title'
    }

    if (type === 'h5' || type === 'h6') {
        return 'label'
    }

    return 'body-md'
}

export default function Text({
    type = 'p',
    children,
    variant,
    position = 'start',
    color,
    fw,
    style,
    className = '',
    ...rest
}: TextProps) {
    const resolvedVariant = resolveTextVariant(type, variant)
    const mergedStyle: CSSProperties = {
        ...(style ?? {}),
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
            data-variant={resolvedVariant}
            style={mergedStyle}
            {...rest}>
            {resolvedChildren}
        </Element>
    )
}
