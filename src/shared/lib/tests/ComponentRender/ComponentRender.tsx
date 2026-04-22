import { MemoryRouter } from 'react-router-dom'
import { ReactNode, useState } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { StateSchema, StoreProvider } from '@/app/providers/StoreProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'

export interface ComponentRenderPropsOptions {
    children?: ReactNode
    route?: string
    initialState?: DeepPartial<StateSchema>
}

const AllProviders: React.FC<ComponentRenderPropsOptions> = ({ children, route = '/', initialState }) => {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        refetchOnWindowFocus: false
                    }
                }
            })
    )

    return (
        <StoreProvider initialState={initialState}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <MemoryRouter initialEntries={[route]}>
                        <I18nextProvider i18n={i18nForTests}>{children}</I18nextProvider>
                    </MemoryRouter>
                </ThemeProvider>
            </QueryClientProvider>
        </StoreProvider>
    )
}

const customRender = (ui: ReactNode, options?: Omit<RenderOptions, 'wrapper'> & ComponentRenderPropsOptions) => {
    const { route, initialState, ...renderOptions } = options ?? {}

    return render(
        <AllProviders route={route} initialState={initialState}>
            {ui}
        </AllProviders>,
        renderOptions
    )
}

export * from '@testing-library/react'
export { customRender as render }
