import ImageWithSvgProps from './types'

export default function ImageWithSvg({ svg, width, height, style, onClick, className }: ImageWithSvgProps) {
    return (
        <div style={{ ...style, minWidth: width, height }} onClick={onClick} className={className}>
            {svg}
        </div>
    )
}

