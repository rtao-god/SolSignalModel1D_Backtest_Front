import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './providers/ThemeProvider'
import { StoreProvider } from './providers/StoreProvider'
import { Theme } from './providers/ThemeProvider/lib/ThemeContext'
import { ErrorBoundary } from 'react-error-boundary'
import './styles/_include.scss'
import { ErrorBoundaryFallback } from '@/widgets/components'
import { makeServer } from '../../mirage/server'
import { QueryClient, QueryClientProvider } from 'react-query'

/* if (process.env.NODE_ENV === 'development') {
    makeServer()
} */ // Моковый сервер. Теперь он не нжуен. Переходим полностью на настоязий бэкенд 

const queryClient = new QueryClient()
const rootElement = document.getElementById('root')

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <StoreProvider>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <ThemeProvider initialTheme={Theme.DARK}>
                        <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
                            <App />
                        </ErrorBoundary>
                    </ThemeProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </StoreProvider>
    )
} else {
    console.error('Root element not found')
}
