import classNames from '@/shared/lib/helpers/classNames'
import cls from './Icon.module.scss'
import { ComponentType, SVGProps, useEffect, useState } from 'react'
import IconProps from './types'

export default function Icon({
    name,
    width = '24px',
    height = '24px',
    color = 'grey',
    className,
    onClick,
    flipped = false
}: IconProps) {
    const [SvgIcon, setSvgIcon] = useState<ComponentType<SVGProps<SVGSVGElement>> | null>(null)

    useEffect(() => {
        const loadIcon = async () => {
            try {
                const { default: ImportedIcon } = await import(`@/shared/assets/icons/${name}.svg`)
                setSvgIcon(() => ImportedIcon)
            } catch (error) {
                console.error(`Icon ${name} not found`)
            }
        }
        loadIcon()
    }, [name])

    if (!SvgIcon) return null

    return (
        <div>
            <SvgIcon
                className={classNames(cls.Icon, { [cls.flipped]: flipped }, [className ?? ''])}
                width={width}
                height={height}
                fill={color}
                onClick={onClick}
            />
        </div>
    )
}

