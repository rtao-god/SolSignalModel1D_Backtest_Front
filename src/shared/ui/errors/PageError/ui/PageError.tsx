import type { ReactNode } from 'react'
import cls from './PageError.module.scss'
import { Btn } from '@/shared/ui/Btn'
import { Text } from '@/shared/ui/Text'

interface PageErrorProps {
    title: string
    message?: string
    error?: unknown
    onRetry?: () => void
    actionsSlot?: ReactNode
}

function formatError(error: unknown): string {
    if (!error) return ''

    if (typeof error === 'string') {
        return error
    }

    if (error instanceof Error) {
        return error.message
    }

    try {
        return JSON.stringify(error, null, 2)
    } catch {
        return String(error)
    }
}

export default function PageError({ title, message, error, onRetry, actionsSlot }: PageErrorProps) {
    const details = error ? formatError(error) : null

    return (
        <div className={cls.PageError}>
            <Text type='h2' className={cls.title}>
                {title}
            </Text>

            {message && <Text className={cls.message}>{message}</Text>}

            {details && <pre className={cls.details}>{details}</pre>}

            <div className={cls.actions}>
                {onRetry && (
                    <Btn className={cls.retryButton} onClick={onRetry}>
                        Повторить запрос
                    </Btn>
                )}

                {actionsSlot}
            </div>
        </div>
    )
}

