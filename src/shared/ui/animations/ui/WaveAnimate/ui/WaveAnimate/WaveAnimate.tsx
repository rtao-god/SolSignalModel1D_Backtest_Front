import classNames from '@/shared/lib/helpers/classNames'
import WaveAnimateProps from './types'
import cls from './WaveAnimate.module.scss'

export default function WaveAnimate({ className }: WaveAnimateProps) {
    return (
        <div className={classNames(cls.Wave_animate, {}, [className ?? ''])}>
            <div className={cls.waves}>
                <div className={cls.wave_container}>
                    <div className={`${cls.wave_layer} ${cls.bg_top}`}>
                        <div className={cls.wave_top}></div>
                    </div>

                    <div className={`${cls.wave_layer} ${cls.bg_middle}`}>
                        <div className={cls.wave_middle}></div>
                    </div>

                    <div className={`${cls.wave_layer} ${cls.bg_bottom}`}>
                        <div className={cls.wave_bottom}></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

