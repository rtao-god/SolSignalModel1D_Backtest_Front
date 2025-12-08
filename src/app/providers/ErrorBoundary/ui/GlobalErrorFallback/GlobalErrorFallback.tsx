import { useMemo } from 'react'
import type { ErrorBoundaryFallbackProps } from '../../ErrorBoundary'
import cls from './GlobalErrorFallback.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'

interface GlobalErrorFallbackProps extends ErrorBoundaryFallbackProps {
    className?: string
}

/**
 * Full-screen fallback для критических ошибок приложения.
 * Используется глобальным ErrorBoundary вокруг всего <App />.
 */
export default function GlobalErrorFallback({ error, resetErrorBoundary, className }: GlobalErrorFallbackProps) {
    // Стабильный ID ошибки на время жизни fallback-компонента
    const errorId = useMemo(() => {
        const base = Date.now().toString(36)
        const random = Math.floor(Math.random() * 1e6).toString(36)
        return `${base}-${random}`
    }, [])

    // В dev можно показывать больше технических деталей
    const isDev = process.env.NODE_ENV === 'development'

    const handleReloadClick = () => {
        // Жёсткое восстановление — полная перезагрузка приложения
        window.location.reload()
    }

    const handleRetryClick = () => {
        // Мягкий вариант — сбросить ErrorBoundary и попробовать перерендериться без reload
        resetErrorBoundary()
    }

    const handleReportClick = () => {
        // Здесь можно:
        // - открыть модалку с формой;
        // - отправить событие в аналитику;
        // - или открыть mailto на адрес поддержки.
        //
        // Пока оставляется мягкая заглушка, чтобы не привязывать проект к конкретному решению.
        // eslint-disable-next-line no-console
        console.info('[ErrorReport]', { errorId, message: error?.message })
    }

    return (
        <div className={classNames(cls.GlobalErrorFallback, {}, [className ?? ''])}>
            <div className={cls.card}>
                <div className={cls.header}>
                    <span className={cls.pill}>Критическая ошибка</span>
                    <Text type='h1' className={cls.title}>
                        Что-то пошло не так
                    </Text>
                    <Text className={cls.subtitle}>
                        Приложение столкнулось с ошибкой, которую не удалось автоматически обработать. Можно попробовать
                        восстановить работу без перезагрузки или обновить страницу целиком.
                    </Text>
                </div>

                <div className={cls.meta}>
                    <div className={cls.metaRow}>
                        <span className={cls.metaLabel}>Идентификатор ошибки</span>
                        <span className={cls.metaValue}>{errorId}</span>
                    </div>

                    {error?.message && (
                        <div className={cls.metaRow}>
                            <span className={cls.metaLabel}>Описание</span>
                            <span className={cls.metaValue}>{error.message}</span>
                        </div>
                    )}
                </div>

                {isDev && error?.stack && (
                    <details className={cls.devDetails} open>
                        <summary className={cls.devSummary}>Технические детали (только для dev)</summary>
                        <pre className={cls.devStack}>{error.stack}</pre>
                    </details>
                )}

                <div className={cls.actions}>
                    <Btn className={cls.primary} onClick={handleRetryClick}>
                        Попробовать ещё раз
                    </Btn>

                    <Btn className={cls.secondary} onClick={handleReloadClick}>
                        Обновить страницу
                    </Btn>

                    <Btn className={cls.ghost} onClick={handleReportClick}>
                        Сообщить об ошибке
                    </Btn>
                </div>
            </div>
        </div>
    )
}
