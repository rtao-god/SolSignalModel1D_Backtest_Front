import '@testing-library/jest-dom'
import { describe, expect, test } from 'vitest'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import RouteShellFallback from './RouteShellFallback'

describe('RouteShellFallback', () => {
    test('keeps route shell visible while route module is loading', () => {
        render(
            <RouteShellFallback
                title='Real forecast journal'
                subtitle='Page meaning stays visible before the lazy route module finishes loading.'
                bullets={[
                    { key: 'bullet-1', content: 'Morning forecast stays immutable after capture.' },
                    { key: 'bullet-2', content: 'Realized outcome appears only after the day closes.' }
                ]}
                state='loading'
                loadingTitle='Loading journal route'
            />
        )

        expect(screen.getByText('Real forecast journal')).toBeInTheDocument()
        expect(screen.getByText('Page meaning stays visible before the lazy route module finishes loading.'))
            .toBeInTheDocument()
        expect(screen.getByText('Morning forecast stays immutable after capture.')).toBeInTheDocument()
        expect(screen.getByText('Loading journal route')).toBeInTheDocument()
    })

    test('keeps route shell visible when route-level render fails', () => {
        render(
            <RouteShellFallback
                title='Policy setup history'
                subtitle='Route shell remains on screen even when route content crashes.'
                state='error'
                error={new Error('Chunk failed to execute.')}
            />
        )

        expect(screen.getByText('Policy setup history')).toBeInTheDocument()
        expect(screen.getByText('Route shell remains on screen even when route content crashes.')).toBeInTheDocument()
        expect(screen.getByText('Не удалось открыть раздел')).toBeInTheDocument()
        expect(screen.getByText('Содержимое раздела не загрузилось.')).toBeInTheDocument()
        expect(screen.getByText('Chunk failed to execute.')).toBeInTheDocument()
    })

    test('uses concise default user-facing texts for loading state', () => {
        render(<RouteShellFallback title='Diagnostics report' state='loading' />)

        expect(screen.getByText('Diagnostics report')).toBeInTheDocument()
        expect(screen.getByText('Раздел загружается')).toBeInTheDocument()
        expect(screen.getByText('Загружается содержимое раздела.')).toBeInTheDocument()
    })
})
