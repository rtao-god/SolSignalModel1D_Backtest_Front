import cls from './BlueBox.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import BlueBoxProps from './types'

export default function BlueBox({ children, style, className }: BlueBoxProps) {
    return (
        <div className={classNames(cls.Blue_box, {}, [className ?? ''])} style={style}>
            {children}
        </div>
    )
}

