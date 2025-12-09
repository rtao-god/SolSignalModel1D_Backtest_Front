import classNames from '@/shared/lib/helpers/classNames'
import { Loader, Text } from '@/shared/ui'
import cls from './PageLoader.module.scss'
import PageLoaderProps from './types'

/**
 * Крупный лоадер для страниц:
 * - центрирует спиннер;
 * - показывает заголовок "Загружаю ...";
 * - используется как fallback в Suspense на уровне маршрута.
 */
export default function PageLoader({ className, title, subtitle }: PageLoaderProps) {
    return (
        <div className={classNames(cls.PageLoader, {}, [className ?? ''])}>
            <div className={cls.inner}>
                <Loader />
                {title && (
                    <Text type='h2' className={cls.title}>
                        {title}
                    </Text>
                )}
                {subtitle && <Text className={cls.subtitle}>{subtitle}</Text>}
            </div>
        </div>
    )
}
