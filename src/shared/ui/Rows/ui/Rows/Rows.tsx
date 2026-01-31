import cls from './Rows.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import RowsProps from './types'

export default function Rows({ children, rows, gap, className, style }: RowsProps) {
    return (
        <div
            className={classNames(cls.Rows, {}, [className ?? ''])}
            style={{ gap, gridTemplateRows: rows.join(' '), ...style }}>
            {children}
        </div>
    )
}

