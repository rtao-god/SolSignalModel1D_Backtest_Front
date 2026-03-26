import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { renderTermTooltipTitle } from './renderTermTooltipTitle'

describe('renderTermTooltipTitle', () => {
    test('keeps nested tooltip terms interactive inside function-based descriptions', () => {
        render(
            <div data-testid='term-tooltip-title'>
                {renderTermTooltipTitle(
                    'Stack',
                    () => 'Итог строится из [[current-prediction-daily-layer|Daily]] и [[landing-micro-model|Micro]].',
                    {
                        selfAliases: ['Stack']
                    }
                )}
            </div>
        )

        fireEvent.click(screen.getByRole('button', { name: 'Что такое Stack?' }))

        expect(screen.getByRole('button', { name: 'Что такое Daily?' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Что такое Micro?' })).toBeInTheDocument()
    })
})
