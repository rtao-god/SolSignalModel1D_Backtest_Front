import type { ReactNode } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './BulletList.module.scss'

interface BulletListItem {
    key?: string
    content: ReactNode
}

interface BulletListProps {
    items: readonly BulletListItem[]
    className?: string
    itemClassName?: string
    markerClassName?: string
    contentClassName?: string
}

export default function BulletList({
    items,
    className,
    itemClassName,
    markerClassName,
    contentClassName
}: BulletListProps) {
    return (
        <span className={classNames(cls.list, {}, [className ?? ''])}>
            {items.map((item, index) => (
                <span
                    key={item.key ?? `bullet-list-item-${index}`}
                    className={classNames(cls.item, {}, [itemClassName ?? ''])}>
                    <span
                        aria-hidden='true'
                        className={classNames(cls.marker, {}, [markerClassName ?? ''])}
                    />
                    <span className={classNames(cls.content, {}, [contentClassName ?? ''])}>
                        {item.content}
                    </span>
                </span>
            ))}
        </span>
    )
}
