import { CSSProperties, ImgHTMLAttributes, MouseEventHandler, ReactNode } from 'react'
export default interface ImageWithSvgProps extends ImgHTMLAttributes<HTMLImageElement> {
    svg: ReactNode
    width?: string | number
    height?: string | number
    style?: CSSProperties
    onClick?: MouseEventHandler<HTMLDivElement>
    className?: string
}


