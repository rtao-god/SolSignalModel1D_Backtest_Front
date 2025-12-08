import classNames from '@/shared/lib/helpers/classNames'
import cls from './Element.module.scss'
import type ElementProps from './types'

export default function Element({ type = 'div', className, children, ...rest }: ElementProps) {
    // type управляет HTML-тегом
    const Tag = type

    return (
        <Tag
            className={classNames(cls.Element, {}, [className ?? ''])}
            // Прокидываем все остальные HTML-пропсы:
            // style, onClick, onMouseEnter, aria-*, data-*, id и т.д.
            {...rest}>
            {children}
        </Tag>
    )
}
