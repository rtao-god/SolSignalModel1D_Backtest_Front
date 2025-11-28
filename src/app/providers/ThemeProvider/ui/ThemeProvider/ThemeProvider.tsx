import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ThemeContext, Theme, LOCAL_STORAGE_THEME_KEY } from '../../lib/ThemeContext'

interface ThemeProviderProps {
    children: ReactNode
}

// Явная функция для определения начальной темы
const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') {
        return Theme.DARK
    }

    const stored = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) as Theme | null
    if (stored === Theme.LIGHT || stored === Theme.DARK) {
        return stored
    }

    return Theme.DARK // дефолт = тёмная тема
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(getInitialTheme)

    // Сохраняем выбор темы
    useEffect(() => {
        if (typeof window === 'undefined') return
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme)
    }, [theme])

    // Навешиваем класс темы на body, чтобы скроллбар и т.п. работали от body.dark_theme
    useEffect(() => {
        if (typeof document === 'undefined') return

        const body = document.body
        body.classList.remove(Theme.LIGHT, Theme.DARK)
        body.classList.add(theme)
    }, [theme])

    const value = useMemo(
        () => ({
            theme,
            setTheme
        }),
        [theme]
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
