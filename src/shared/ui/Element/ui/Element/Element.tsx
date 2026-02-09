import classNames from '@/shared/lib/helpers/classNames'
import cls from './Element.module.scss'
import ElementProps from './types'

export default function Element({ type = 'div', className, children, ...rest }: ElementProps) {
    const Tag = type

    return (
        <Tag
            {...rest}
            className={classNames(cls.Element, {}, [className ?? ''])}>
            {children}
        </Tag>
    )
}

