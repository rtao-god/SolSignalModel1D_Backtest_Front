import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import DatePicker from './DatePicker'

/*
	Интеграционные тесты фиксируют главный пользовательский контракт:
	picker не теряет контекст месяца при повторном открытии и корректно очищает перевёрнутую границу диапазона.
*/

describe('DatePicker', () => {
    test('keeps a valid end date, clears an invalid one and reopens on the same month', () => {
        const { container } = render(<DatePicker />, {
            initialState: {
                date: {
                    departureDate: '2024-11-10',
                    arrivalDate: '2024-11-20'
                }
            }
        })

        fireEvent.click(screen.getByRole('button', { name: 'Select start date' }))

        let monthSections = container.querySelectorAll('section[aria-label]')
        expect(monthSections[0]).toHaveAttribute('aria-label', 'November 2024')

        fireEvent.click(screen.getByRole('button', { name: '2024-11-12' }))

        expect(screen.getByRole('button', { name: 'Select start date' })).toHaveTextContent('2024-11-12')
        expect(screen.getByRole('button', { name: 'Select end date' })).toHaveTextContent('2024-11-20')
        expect(screen.queryByRole('button', { name: 'Clear selected date range' })).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Select start date' }))

        monthSections = container.querySelectorAll('section[aria-label]')
        // Повторное открытие должно вернуть пользователя в тот же календарный контекст, где он продолжает править диапазон.
        expect(monthSections[0]).toHaveAttribute('aria-label', 'November 2024')

        fireEvent.click(screen.getByRole('button', { name: '2024-11-25' }))

        expect(screen.getByRole('button', { name: 'Select start date' })).toHaveTextContent('2024-11-25')
        expect(screen.getByRole('button', { name: 'Select end date' })).toHaveTextContent('Date to')

        monthSections = container.querySelectorAll('section[aria-label]')
        // После очистки перевёрнутой границы календарь остаётся в том же месяце, чтобы второй клик не требовал новой навигации.
        expect(monthSections[0]).toHaveAttribute('aria-label', 'November 2024')

        fireEvent.click(screen.getByRole('button', { name: '2024-11-28' }))

        expect(screen.getByRole('button', { name: 'Select end date' })).toHaveTextContent('2024-11-28')
        expect(screen.queryByRole('button', { name: 'Clear selected date range' })).not.toBeInTheDocument()
    })

    test('clears the start date when a new end date is chosen before it', () => {
        render(<DatePicker />, {
            initialState: {
                date: {
                    departureDate: '2024-11-20',
                    arrivalDate: '2024-11-25'
                }
            }
        })

        fireEvent.click(screen.getByRole('button', { name: 'Select end date' }))
        fireEvent.click(screen.getByRole('button', { name: '2024-11-12' }))

        expect(screen.getByRole('button', { name: 'Select start date' })).toHaveTextContent('Date from')
        expect(screen.getByRole('button', { name: 'Select end date' })).toHaveTextContent('2024-11-12')
        expect(screen.getByRole('button', { name: 'Clear selected date range' })).toBeInTheDocument()
    })
})
