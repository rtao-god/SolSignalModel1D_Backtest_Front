import { useState } from 'react'
import { Btn } from '@/shared/ui/Btn'
import { Text } from '@/shared/ui/Text'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import cls from './ErrorPlayground.module.scss'

export default function ErrorPlayground() {
    const [showPageError, setShowPageError] = useState(false)

    return (
        <div className={cls.ErrorPlayground}>

            <section className={cls.block}>
                <Text type='h3' className={cls.blockTitle}>
                    PageError (страничная ошибка)
                </Text>

                {!showPageError && (
                    <>
                        <Text className={cls.blockText}>
                            Это нормальный контент. Нажми кнопку ниже, чтобы увидеть PageError.
                        </Text>
                        <Btn onClick={() => setShowPageError(true)}>Показать PageError</Btn>
                    </>
                )}

                {showPageError && (
                    <PageError
                        title='Тестовая ошибка загрузки отчёта'
                        message='Это искусственная ошибка, сгенерированная для проверки стилей и кнопки Повторить.'
                        error={{ code: 500, message: 'Internal test error: something went wrong' }}
                        onRetry={() => setShowPageError(false)}
                    />
                )}
            </section>


            <section className={cls.block}>
                <Text type='h3' className={cls.blockTitle}>
                    ErrorBlock (карточка секции / более тяжёлая ошибка)
                </Text>

                <Text className={cls.blockText}>
                    Здесь ErrorBlock используется напрямую, как в SectionErrorBoundary. Можно сравнить визуально с
                    PageError.
                </Text>

                <ErrorBlock
                    code='CLIENT'
                    title='Тестовая ошибка секции'
                    description='Этот блок показывает, как выглядит ErrorBlock при падении конкретной секции или виджета.'
                    details='Тестовые детали: условный stack trace / сырой текст ошибки.'
                    onRetry={() => {
                        // eslint-disable-next-line no-console
                        console.log('[ErrorPlayground] Retry clicked')
                    }}
                    compact={false}
                />
            </section>
        </div>
    )
}

