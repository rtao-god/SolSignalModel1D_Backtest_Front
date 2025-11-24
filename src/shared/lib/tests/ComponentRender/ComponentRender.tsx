import { MemoryRouter } from 'react-router-dom'
import { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { StateSchema, StoreProvider } from '@/app/providers/StoreProvider'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'

export interface ComponentRenderPropsOptions {
    children?: ReactNode
    route?: string
    initialState?: DeepPartial<StateSchema>
}

const AllProviders: React.FC<ComponentRenderPropsOptions> = ({ children, route = '/', initialState }) => {
    return (
        <StoreProvider initialState={initialState}>
            <MemoryRouter initialEntries={[route]}>
                <I18nextProvider i18n={i18nForTests}>{children}</I18nextProvider>
            </MemoryRouter>
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
