import LineProps from './types'
import cls from './Line.module.scss'
import classNames from '@/shared/lib/helpers/classNames'

export default function Line({ className, color, height, width, style }: LineProps) {
    return (
        <div
            className={classNames(cls.Line, {}, [className ?? ''])}
            style={{ ...style, backgroundColor: color, width, height }}></div>
    )
}

