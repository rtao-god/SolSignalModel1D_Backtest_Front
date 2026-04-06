import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import PageDataState from '@/shared/ui/errors/PageDataState/ui/PageDataState'

describe('PageDataState', () => {
    test('keeps route shell visible when page data failed before content was built', () => {
        render(
            <PageDataState
                shell={<header><h1>Route shell</h1></header>}
                isError
                error={new Error('Page report failed')}
                hasData
                title='Page error'>
                <div>Loaded page content</div>
            </PageDataState>
        )

        expect(screen.getByText('Route shell')).toBeVisible()
        expect(screen.getByText('Page error')).toBeVisible()
        expect(screen.getByText(/Page report failed/)).toBeVisible()
        expect(screen.getByText('Loaded page content')).toBeVisible()
    })
})
