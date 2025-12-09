import { Btn } from '@/shared/ui'
import { Component, ErrorInfo, ReactNode } from 'react'

export interface ErrorBoundaryFallbackProps {
    // Последняя пойманная ошибка (может быть null, если по какой-то причине ошибки нет)
    error: Error | null
    // Функция, которая сбрасывает ErrorBoundary и даёт поддереву шанс перерендериться
    resetErrorBoundary: () => void
}

interface ErrorBoundaryProps {
    children: ReactNode
    // Готовый React-узел как fallback
    fallback?: ReactNode
    // Функция-рендер, которая получает ошибку и reset и рисует кастомный UI
    fallbackRender?: (props: ErrorBoundaryFallbackProps) => ReactNode
    // Коллбек для логирования/репортинга ошибки
    onError?: (error: Error, errorInfo: ErrorInfo) => void
    // Коллбек при явном/автоматическом сбросе ошибки
    onReset?: () => void
    // Ключи, при изменении которых boundary автоматически сбросится
    resetKeys?: unknown[]
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

/**
 * Переиспользуемый ErrorBoundary:
 * - умеет логировать через onError;
 * - умеет сбрасываться по resetKeys;
 * - поддерживает как готовый fallback, так и fallbackRender.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
        error: null
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // Реагируем на ошибку обновлением state, чтобы в render перейти в режим fallback-UI
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Сам ErrorBoundary ничего не знает о конкретной системе логирования,
        // просто отдаёт ошибку наружу через onError.
        this.props.onError?.(error, errorInfo)
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        const { resetKeys } = this.props

        // Если нет ошибки или нет resetKeys — ничего автоматически не делаем
        if (!this.state.hasError || !resetKeys) {
            return
        }

        const prevResetKeys = prevProps.resetKeys

        // Если раньше resetKeys не было — достаточно сброситься один раз
        if (!prevResetKeys || prevResetKeys.length !== resetKeys.length) {
            this.reset()
            this.props.onReset?.()
            return
        }

        // Простое сравнение массивов по Object.is
        const changed = resetKeys.some((key, index) => !Object.is(key, prevResetKeys[index]))

        if (changed) {
            this.reset()
            this.props.onReset?.()
        }
    }

    // Публичный метод сброса, полезно пробрасывать через ref при необходимости
    reset = () => {
        // Возвращаем boundary в нормальное состояние, поддерево попытается отрендериться заново
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (!this.state.hasError) {
            // В штатном режиме просто рендерим детей
            return this.props.children
        }

        const { fallback, fallbackRender } = this.props

        const fallbackProps: ErrorBoundaryFallbackProps = {
            error: this.state.error,
            resetErrorBoundary: this.reset
        }

        // Приоритет — у функции-рендера (максимальная гибкость)
        if (fallbackRender) {
            return fallbackRender(fallbackProps)
        }

        // Если задан готовый fallback-узел — используем его
        if (fallback) {
            return fallback
        }

        // Базовый минимальный fallback на случай, если ничего не передали
        return (
            <div style={{ padding: 16 }}>
                <h2>Что-то пошло не так.</h2>
                {this.state.error && <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>}
                <Btn onClick={this.reset}>Попробовать ещё раз</Btn>
            </div>
        )
    }
}
