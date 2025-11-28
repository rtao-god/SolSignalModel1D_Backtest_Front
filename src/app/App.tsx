import { AppRouter } from './providers/router'
import classNames from '@/shared/lib/helpers/classNames'
import { Suspense } from './providers'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import { AnimateComponent } from '@/shared/ui'

export default function App() {
    const { theme } = useTheme() // ожидаем 'light_theme' | 'dark_theme'

    return (
        <div className={classNames('app', { [theme]: true }, [])}>
            <Suspense>
                <AnimateComponent>
                    <AppRouter />
                </AnimateComponent>
            </Suspense>
        </div>
    )
}
