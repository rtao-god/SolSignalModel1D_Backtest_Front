import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import SectionDataState from './SectionDataState'
import { logError } from '@/shared/lib/logging/logError'

vi.mock('react-i18next', async importOriginal => {
    const actual = await importOriginal<typeof import('react-i18next')>()

    return {
        ...actual,
        useTranslation: () => ({
            t: (_key: string, options?: Record<string, unknown>) => options?.defaultValue ?? _key
        })
    }
})

vi.mock('@/shared/lib/logging/logError', () => ({
    logError: vi.fn()
}))

describe('SectionDataState', () => {
    function getSectionDataStateLogCount(): number {
        return vi.mocked(logError).mock.calls.filter(([, , context]) => context?.source === 'test-source').length
    }

    test('keeps surrounding shell while loading inline state is visible', () => {
        render(
            <div>
                <span>Shell title</span>
                <SectionDataState isLoading hasData={false} title='Section error' loadingText='Loading section data'>
                    <div>Loaded content</div>
                </SectionDataState>
            </div>
        )

        expect(screen.getByText('Shell title')).toBeTruthy()
        expect(screen.getByText('Loading section data')).toBeTruthy()
        expect(screen.queryByText('Loaded content')).toBeNull()
    })

    test('renders inline error and does not remove surrounding shell', () => {
        render(
            <div>
                <span>Shell title</span>
                <SectionDataState
                    isError
                    error={new Error('Section failed')}
                    hasData={false}
                    title='Section error'
                    description='This block failed to load.'>
                    <div>Loaded content</div>
                </SectionDataState>
            </div>
        )

        expect(screen.getByText('Shell title')).toBeTruthy()
        expect(screen.getByText('Section error')).toBeTruthy()
        expect(screen.getByText('This block failed to load.')).toBeTruthy()
        expect(screen.getByText('Section failed')).toBeVisible()
    })

    test('keeps loaded content visible when background request failed', () => {
        render(
            <div>
                <span>Shell title</span>
                <SectionDataState
                    error={new Error('API is offline')}
                    hasData
                    title='Section error'
                    description='This block failed to refresh.'>
                    <div>Loaded content</div>
                </SectionDataState>
            </div>
        )

        expect(screen.getByText('Shell title')).toBeVisible()
        expect(screen.getByText('Section error')).toBeVisible()
        expect(screen.getByText('This block failed to refresh.')).toBeVisible()
        expect(screen.getByText('API is offline')).toBeVisible()
        expect(screen.getByText('Loaded content')).toBeVisible()
    })

    test('shows error instead of loading when request already failed', () => {
        render(
            <SectionDataState
                isLoading
                error={new Error('Network failed')}
                hasData={false}
                title='Section error'
                loadingText='Loading section data'>
                <div>Loaded content</div>
            </SectionDataState>
        )

        expect(screen.queryByText('Loading section data')).toBeNull()
        expect(screen.getByText('Section error')).toBeVisible()
        expect(screen.getByText('Network failed')).toBeVisible()
    })

    test('logs the same error only once per identical context', () => {
        const firstError = new Error('Repeated failure')
        const { rerender } = render(
            <SectionDataState
                isError
                error={firstError}
                hasData={false}
                title='Section error'
                logContext={{ source: 'test-source', extra: { section: 'summary' } }}>
                <div>Loaded content</div>
            </SectionDataState>
        )

        expect(getSectionDataStateLogCount()).toBe(1)

        rerender(
            <SectionDataState
                isError
                error={firstError}
                hasData={false}
                title='Section error'
                logContext={{ source: 'test-source', extra: { section: 'summary' } }}>
                <div>Loaded content</div>
            </SectionDataState>
        )

        expect(getSectionDataStateLogCount()).toBe(1)

        rerender(
            <SectionDataState
                isError
                error={new Error('Repeated failure')}
                hasData={false}
                title='Section error'
                logContext={{ source: 'test-source', extra: { section: 'details' } }}>
                <div>Loaded content</div>
            </SectionDataState>
        )

        expect(getSectionDataStateLogCount()).toBe(2)
        expect(vi.mocked(logError).mock.calls[0]?.[2]?.severity).toBe('warning')
    })
})
