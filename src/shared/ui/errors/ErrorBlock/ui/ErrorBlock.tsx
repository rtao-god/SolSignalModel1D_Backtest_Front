import type { ReactNode } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'
import cls from './ErrorBlock.module.scss'
import { useTranslation } from 'react-i18next'

interface ErrorBlockProps {
    className?: string
    code?: string | number
    title?: string
    description?: string
    details?: ReactNode
    onRetry?: () => void
    compact?: boolean
    actions?: ReactNode
}

export function ErrorBlock({ className, code, title, description, details, onRetry, compact, actions }: ErrorBlockProps) {
    const { t } = useTranslation('errors')
    const rootClasses = classNames(
        cls.ErrorBlock,
        {
            [cls.compact]: Boolean(compact)
        },
        [className ?? '']
    )

    return (
        <div className={rootClasses}>
            <div className={cls.inner}>
                <div className={cls.iconColumn}>
                    <div className={cls.iconGlow}>
                        <span className={cls.icon}>!</span>
                    </div>
                </div>

                <div className={cls.content}>
                    <div className={cls.headerRow}>
                        {title && (
                            <Text type='h3' className={cls.title}>
                                {title}
                            </Text>
                        )}

                        {code !== undefined && code !== null && <span className={cls.codeBadge}>{code}</span>}
                    </div>

                    {description && <Text className={cls.description}>{description}</Text>}

                    {details && <div className={cls.details}>{details}</div>}

                    {(onRetry || actions) && (
                        <div className={cls.actions}>
                            {onRetry && (
                                <Btn className={cls.retryButton} onClick={onRetry}>
                                    {t('ui.errorBlock.retry', { defaultValue: 'Try again' })}
                                </Btn>
                            )}
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
