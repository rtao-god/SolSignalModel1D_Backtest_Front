import type { ReactNode } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Loader, Text } from '@/shared/ui'
import { BulletList } from '@/shared/ui/BulletList'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import cls from './RouteShellFallback.module.scss'

interface RouteShellFallbackItem {
    key: string
    content: ReactNode
}

interface RouteShellFallbackProps {
    title: ReactNode
    subtitle?: ReactNode
    bullets?: readonly RouteShellFallbackItem[]
    state: 'loading' | 'error'
    loadingTitle?: string
    loadingHint?: string
    error?: Error | null
    onRetry?: () => void
    className?: string
}

const DEFAULT_LOADING_TITLE = 'Раздел загружается'
const DEFAULT_LOADING_HINT = 'Загружается содержимое раздела.'
const DEFAULT_ERROR_TITLE = 'Не удалось открыть раздел'
const DEFAULT_ERROR_DESCRIPTION = 'Содержимое раздела не загрузилось.'

function formatErrorDetails(error: Error | null | undefined): string | undefined {
    if (!error) {
        return undefined
    }

    return error.message || error.name
}

// RouteShellFallback сохраняет заголовок и вводный контекст раздела,
// пока lazy-модуль маршрута загружается или падает при открытии.
export default function RouteShellFallback({
    title,
    subtitle,
    bullets,
    state,
    loadingTitle,
    loadingHint,
    error,
    onRetry,
    className
}: RouteShellFallbackProps) {
    return (
        <div className={classNames(cls.root, {}, [className ?? ''])}>
            <section className={cls.hero}>
                <Text type='h1' className={cls.title}>
                    {title}
                </Text>
                {subtitle && <Text className={cls.subtitle}>{subtitle}</Text>}
                {bullets && bullets.length > 0 && (
                    <BulletList className={cls.bulletList} contentClassName={cls.bulletText} items={bullets} />
                )}
            </section>

            <section className={cls.stateBlock}>
                {state === 'error' ?
                    <ErrorBlock
                        code='ROUTE'
                        title={DEFAULT_ERROR_TITLE}
                        description={DEFAULT_ERROR_DESCRIPTION}
                        details={formatErrorDetails(error)}
                        onRetry={onRetry}
                    />
                :   <div className={cls.loadingBox}>
                        <Loader />
                        <div>
                            <Text className={cls.loadingTitle}>{loadingTitle ?? DEFAULT_LOADING_TITLE}</Text>
                            <Text className={cls.loadingHint}>{loadingHint ?? DEFAULT_LOADING_HINT}</Text>
                        </div>
                    </div>
                }
            </section>
        </div>
    )
}
