import { useEffect, useState } from 'react'
import { Btn } from '@/shared/ui'
import styles from './BugBtn.module.scss'

export default function BugBtn() {
    const [shouldThrow, setShouldThrow] = useState(false)

    const handleClick = () => {
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
