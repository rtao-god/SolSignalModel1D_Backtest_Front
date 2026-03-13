import { useContext } from 'react'
import { LOCAL_STORAGE_THEME_KEY, Theme, ThemeContext } from '@/app/providers/ThemeProvider/lib/ThemeContext'
import { logError } from '@/shared/lib/logging/logError'

interface UseThemeResult {
    theme: Theme
    toggleTheme: () => void
}

export const useTheme = (): UseThemeResult => {
    const ctx = useContext(ThemeContext)

    if (!ctx || !ctx.theme || !ctx.setTheme) {
        logError(new Error('ThemeContext is unavailable.'), undefined, {
            source: 'theme-context-fallback',
            domain: 'app_runtime',
            severity: 'warning'
        })
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
