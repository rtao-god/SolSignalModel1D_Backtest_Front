import { useContext } from 'react'
import { LOCAL_STORAGE_THEME_KEY, Theme, ThemeContext } from '@/app/providers/ThemeProvider/lib/ThemeContext'

interface UseThemeResult {
    theme: Theme
    toggleTheme: () => void
}

export const useTheme = (): UseThemeResult => {
    const ctx = useContext(ThemeContext)

    if (!ctx || !ctx.theme || !ctx.setTheme) {
        console.warn('useTheme используется вне ThemeProvider, возвращаю fallback Theme.DARK')
        return {
            theme: Theme.DARK,
            toggleTheme: () => {}
        }
    }

    const { theme, setTheme } = ctx

    const toggleTheme = () => {
        const newTheme = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT
        setTheme(newTheme)
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, newTheme)
    }

    return {
        theme,
        toggleTheme
    }
}

