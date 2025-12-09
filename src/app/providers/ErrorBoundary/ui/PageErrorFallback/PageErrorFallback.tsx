import { Btn, Text } from '@/shared/ui'
import { ErrorBoundaryFallbackProps } from '../../ErrorBoundary'
import cls from './PageErrorFallback.module.scss'
import classNames from '@/shared/lib/helpers/classNames'

/**
 * Компактный fallback для ошибок на уровне страницы/виджета.
 * Предполагается, что shell (Navbar/Sidebar/Footer) остаётся доступным.
 */
export default function PageErrorFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
    return (
        <div className={classNames(cls.PageErrorFallback, {}, [])}>
            <div className={cls.card}>
                <div className={cls.header}>
                    <span className={cls.pill}>Ошибка секции</span>
                    <h2 className={cls.title}>Эта часть страницы не загрузилась</h2>
                    <Text className={cls.subtitle}>
                        Можно попробовать перерисовать блок. Если ошибка повторяется, стоит проверить настройки или
                        открыть другой раздел — остальное приложение продолжает работать.
                    </Text>
                </div>

                {error?.message && (
                    <div className={cls.message}>
                        <span className={cls.messageLabel}>Описание</span>
                        <span className={cls.messageText}>{error.message}</span>
                    </div>
                )}

                <div className={cls.actions}>
                    <Btn className={cls.primary} onClick={resetErrorBoundary}>
                        Попробовать ещё раз
                    </Btn>
                </div>
            </div>
        </div>
    )
}
