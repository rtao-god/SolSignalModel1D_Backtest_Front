import cls from './Loader.module.scss'
import classNames from '@/shared/lib/helpers/classNames'

interface LoaderProps {
    className?: string
}

export default function Loader({ className }: LoaderProps) {
    return (
        <div className={classNames(cls.Loader, {}, [className ?? ''])}>
            <div className={cls.loading}>
                <div className={cls.loop_wrapper}>
                    <div className={cls.loop_first}>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>

                    <div className={cls.loop_second}>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

