import cls from './Row.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import RowProps from './types'

export default function Row({ children, style, gap, className, onClick }: RowProps) {
    return (
        <div
            className={classNames(cls.Row, {}, [className ?? ''])}
            style={{ ...style, gap }}
            onClick={onClick}>
            {children}
        </div>
    )
}
