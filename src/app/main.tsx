import ReactDOM from 'react-dom/client'
import { StrictMode } from 'react'
import {
    markApplicationBootstrapped,
    setupGlobalErrorHandlers,
    showFatalErrorOverlay
} from '@/shared/lib/logging/setupGlobalErrorHandlers'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { ThemeProvider } from './providers/ThemeProvider'
import { LocaleProvider } from './providers/LocaleProvider'
import { StoreProvider } from './providers/StoreProvider'
import '@/shared/configs/i18n/i18n'
import './styles/_include.scss'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GlobalErrorFallback from './providers/ErrorBoundary/ui/GlobalErrorFallback/GlobalErrorFallback'
import { logError } from '@/shared/lib/logging/logError'
import { ErrorBoundary } from './providers/ErrorBoundary/ErrorBoundary'
import App from './App'
import { restorePathFrom404 } from './lib/deepLinkFrom404'

declare global {
    interface Window {
        __SOLSIGNAL_PREBOOT_FATAL__?: {
            markBootCompleted?: () => void
        }
    }
}

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
                    path: location.pathname,
                    domain: 'app_runtime'
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
                    <LocaleProvider>
                        <AppWithGlobalErrorBoundary />
                    </LocaleProvider>
                </ThemeProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </StoreProvider>
)

const rootElement = document.getElementById('root')

if (!rootElement) {
    logError(new Error('Root element with id="root" not found in DOM.'), undefined, {
        source: 'root-element',
        domain: 'app_runtime'
    })
} else {
    const restoredPath = restorePathFrom404(window.location.search)
    if (restoredPath) {
        window.history.replaceState({}, '', restoredPath)
    }

    const root = ReactDOM.createRoot(rootElement)

    try {
        root.render(
            <StrictMode>
                <RootApp />
            </StrictMode>
        )
        markApplicationBootstrapped()
        window.__SOLSIGNAL_PREBOOT_FATAL__?.markBootCompleted?.()
    } catch (error) {
        const safeError = error instanceof Error ? error : new Error(String(error ?? 'Unknown bootstrap error.'))
        logError(safeError, undefined, {
            source: 'root.render',
            domain: 'app_runtime'
        })
        showFatalErrorOverlay(safeError, 'root.render')
    }
}
