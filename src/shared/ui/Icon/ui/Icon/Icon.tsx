import classNames from '@/shared/lib/helpers/classNames'
import cls from './Icon.module.scss'
import { ComponentType, SVGProps, useEffect, useState } from 'react'
import IconProps from './types'
import { logError } from '@/shared/lib/logging/logError'

const ICON_MODULES = import.meta.glob<{ default: ComponentType<SVGProps<SVGSVGElement>> }>(
    '../../../../assets/icons/*.svg'
)

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
                // Иконки грузятся из каноничного build-time реестра,
                // чтобы production build не зависел от динамического alias import.
                const iconModuleLoader = ICON_MODULES[`../../../../assets/icons/${name}.svg`]
                if (!iconModuleLoader) {
                    throw new Error(`Icon "${name}" is not registered in ICON_MODULES.`)
                }

                const { default: ImportedIcon } = await iconModuleLoader()
                setSvgIcon(() => ImportedIcon)
            } catch (error) {
                logError(new Error(`Icon "${name}" could not be loaded.`), undefined, {
                    source: 'icon-loader',
                    domain: 'asset_contract',
                    severity: 'warning',
                    extra: { name }
                })
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
