import classNames from '@/shared/lib/helpers/classNames'
import { Loader, Text } from '@/shared/ui'
import cls from './PageLoader.module.scss'
import PageLoaderProps from './types'

export default function PageLoader({ className, title, subtitle }: PageLoaderProps) {
    return (
        <div className={classNames(cls.PageLoader, {}, [className ?? ''])}>
            <div className={cls.inner}>
                <div className={cls.row}>
                    <Loader />

                    <div className={cls.textBlock}>
                        {title && (
                            <Text type='h2' className={cls.title}>
                                {title}
                            </Text>
                        )}

                        <span className={cls.dots}>
                            <span className={`${cls.dot} ${cls.dot1}`} />
                            <span className={`${cls.dot} ${cls.dot2}`} />
                            <span className={`${cls.dot} ${cls.dot3}`} />
                        </span>
                    </div>
                </div>

                {subtitle && <Text className={cls.subtitle}>{subtitle}</Text>}
            </div>
        </div>
    )
}

