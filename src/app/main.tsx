import ReactDOM from 'react-dom/client'
import { StrictMode } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { ThemeProvider } from './providers/ThemeProvider'
import { StoreProvider } from './providers/StoreProvider'
import './styles/_include.scss'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GlobalErrorFallback from './providers/ErrorBoundary/ui/GlobalErrorFallback/GlobalErrorFallback'
import { logError } from '@/shared/lib/logging/logError'
import { setupGlobalErrorHandlers } from '@/shared/lib/logging/setupGlobalErrorHandlers'
import { ErrorBoundary } from './providers/ErrorBoundary/ErrorBoundary'
import App from './App'
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false
        }
    }
})
setupGlobalErrorHandlers()

function AppWithGlobalErrorBoundary() {
    const location = useLocation()

    return (
        <ErrorBoundary
            resetKeys={[location.pathname]}
            onError={(error, errorInfo) =>
                logError(error, errorInfo, {
                    source: 'global-error-boundary',
                    path: location.pathname
                })
            }
            fallbackRender={props => <GlobalErrorFallback {...props} />}>
            <App />
        </ErrorBoundary>
    )
}

const RootApp = () => (
    <StoreProvider>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <ThemeProvider>
                    <AppWithGlobalErrorBoundary />
                </ThemeProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </StoreProvider>
)

const rootElement = document.getElementById('root')

if (!rootElement) {
    console.error('Root element with id="root" not found in DOM')
} else {
    const root = ReactDOM.createRoot(rootElement)

    root.render(
        <StrictMode>
            <RootApp />
        </StrictMode>
    )
}
