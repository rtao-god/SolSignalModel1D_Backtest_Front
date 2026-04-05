import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { PageLocalIssuesProvider } from './PageLocalIssuesProvider'

function BrokenSection() {
    throw new Error('section exploded')
}

describe('PageLocalIssuesProvider', () => {
    test('shows section boundary error at the top of the page', async () => {
        render(
            <PageLocalIssuesProvider scopeKey='/page-local-issues-test'>
                <SectionErrorBoundary name='BrokenSection'>
                    <BrokenSection />
                </SectionErrorBoundary>
            </PageLocalIssuesProvider>
        )

        expect(await screen.findByText('На странице есть локальные ошибки')).toBeInTheDocument()
        expect(await screen.findByText('Ошибка блока: BrokenSection')).toBeInTheDocument()
        expect(await screen.findByText(text => text.includes('section exploded'))).toBeInTheDocument()
        expect(screen.queryByText('Один из блоков приложения сломался')).not.toBeInTheDocument()
        expect(screen.queryByText('Section render error')).not.toBeInTheDocument()
        expect(screen.queryByText('Страница, статика и API продолжают работать. Ошибки затронули только отдельные блоки.')).not.toBeInTheDocument()
    })
})
