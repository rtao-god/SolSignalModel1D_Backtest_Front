import { createContext } from 'react'

export enum Theme {
    DARK = 'dark_theme',
    LIGHT = 'light_theme'
}

interface ThemeContextType {
    theme?: Theme
    setTheme?: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextType>({})
export const LOCAL_STORAGE_THEME_KEY = 'theme'
