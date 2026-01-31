import WhiteContentBlockProps from './types'
import cls from './WhiteContentBlock.module.scss'
import classNames from '@/shared/lib/helpers/classNames'

export default function WhiteContentBlock({ children, style, className }: WhiteContentBlockProps) {
    return (
        <div className={classNames(cls.White_content_block, {}, [className ?? ''])} style={style}>
            {children}
        </div>
    )
}

