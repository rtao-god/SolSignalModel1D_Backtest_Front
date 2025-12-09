import { useEffect, useState } from 'react'
import { Btn } from '@/shared/ui'
import styles from './BugBtn.module.scss'

/**
 * Кнопка для проверки ErrorBoundary.
 * По клику инициирует контролируемую ошибку в жизненном цикле React.
 */
export default function BugBtn() {
    // Флаг, что пользователь запросил генерацию ошибки
    const [shouldThrow, setShouldThrow] = useState(false)

    const handleClick = () => {
        // Меняем состояние, а не кидаем ошибку прямо в обработчике.
        // Ошибка в эффектах корректно перехватывается ErrorBoundary.
        setShouldThrow(true)
    }

    useEffect(() => {
        if (!shouldThrow) return

        const error = new Error(
            'Демо-ошибка для проверки ErrorBoundary. ' +
                'Если виден человекочитаемый экран ошибки — обработчик работает корректно.'
        )
        error.name = 'ErrorBoundaryTestError'

        throw error
    }, [shouldThrow])

    return (
        <Btn onClick={handleClick} className={styles.button}>
            Сгенерировать ошибку
        </Btn>
    )
}
