import { ReactNode } from 'react'
import { Theme } from '@/app/providers/ThemeProvider/lib/ThemeContext'

export default interface ThemeProviderProps {
    children: ReactNode
    initialTheme?: Theme
}
