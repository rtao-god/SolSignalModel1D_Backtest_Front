import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { ErrorBoundary } from '@/app/providers/ErrorBoundary/ErrorBoundary'
import { lazyPage } from './lazyPage'

describe('lazyPage', () => {
    test('routes lazy import errors into the nearest error boundary', async () => {
        const BrokenPage = lazyPage(async () => {
            throw new Error('lazy page import failed')
        })

        render(
            <ErrorBoundary fallbackRender={({ error }) => <div>{error?.message}</div>}>
                <Suspense fallback={<div>loading</div>}>
                    <BrokenPage />
                </Suspense>
            </ErrorBoundary>
        )

        expect(await screen.findByText(/lazy page import failed/i)).toBeInTheDocument()
    })
})
