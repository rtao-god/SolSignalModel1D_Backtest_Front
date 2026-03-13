import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { renderTermTooltipRichText } from './renderTermTooltipRichText'
import cls from './renderTermTooltipRichText.module.scss'

describe('renderTermTooltipRichText', () => {
    test('preserves spaces around explicit tooltip terms', () => {
        render(
            <div data-testid='rich-text'>
                {renderTermTooltipRichText(
                    'Количество сделок, где реально применился [[dynamic-tp-sl|DYNAMIC risk]]-оверлей.\n\nВ этом режиме движок масштабирует уровни [[tp-sl|stop-loss]] и [[tp-sl|take-profit]], а также [[cap-fraction|долю капитала на сделку]] по уверенности модели.'
                )}
            </div>
        )

        expect(screen.getByTestId('rich-text')).toHaveTextContent(
            'Количество сделок, где реально применился DYNAMIC risk-оверлей.'
        )
        expect(screen.getByTestId('rich-text')).toHaveTextContent(
            'В этом режиме движок масштабирует уровни stop-loss и take-profit, а также долю капитала на сделку по уверенности модели.'
        )
    })

    test('preserves spaces around autolinked terms', () => {
        render(
            <div data-testid='autolink-text'>
                {renderTermTooltipRichText(
                    'Обычно таких сделок меньше общего числа: без подтверждения по confidence-bucket день не попадает в dynamic-срез.'
                )}
            </div>
        )

        expect(screen.getByTestId('autolink-text')).toHaveTextContent(
            'Обычно таких сделок меньше общего числа: без подтверждения по confidence-bucket день не попадает в dynamic-срез.'
        )
    })

    test('keeps visible separators in dense explicit-term chains', () => {
        render(
            <div data-testid='policy-chain'>
                {renderTermTooltipRichText(
                    'Смысл сравнения появляется в числах: [[total-pnl|TotalPnl%]], [[drawdown|MaxDD%]], [[liquidation|HadLiq]], [[account-ruin|AccRuin]], [[recovered|Recovered]], [[recov-days|RecovDays]] и [[req-gain|ReqGain%]].'
                )}
            </div>
        )

        const container = screen.getByTestId('policy-chain')
        expect(container).toHaveTextContent(
            'Смысл сравнения появляется в числах: TotalPnl%, MaxDD%, HadLiq, AccRuin, Recovered, RecovDays и ReqGain%.'
        )
        expect(container.textContent).not.toContain('\u00A0')
    })

    test('renders explicit round-trip term with tooltip trigger', () => {
        render(
            <div data-testid='round-trip-text'>
                {renderTermTooltipRichText(
                    'Комиссии биржи: учитываются ([[round-trip|round-trip]], комиссия на вход и на выход).'
                )}
            </div>
        )

        expect(screen.getByTestId('round-trip-text')).toHaveTextContent(
            'Комиссии биржи: учитываются (round-trip, комиссия на вход и на выход).'
        )
        expect(screen.getByRole('button', { name: 'Что такое round-trip?' })).toBeInTheDocument()
    })

    test('renders exchange cost terms through shared tooltip owners', () => {
        render(
            <div data-testid='exchange-costs-text'>
                {renderTermTooltipRichText(
                    '[[exchange-fees|Комиссии биржи]]: учитываются ([[round-trip|round-trip]], [[entry-fee|комиссия на вход]] и [[exit-fee|комиссия на выход]]). [[slippage|Проскальзывание]] / [[price-impact|price impact]]: не учитывается.'
                )}
            </div>
        )

        expect(screen.getByTestId('exchange-costs-text')).toHaveTextContent(
            'Комиссии биржи: учитываются (round-trip, комиссия на вход и комиссия на выход). Проскальзывание / price impact: не учитывается.'
        )
        expect(screen.getByRole('button', { name: 'Что такое Комиссии биржи?' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Что такое комиссия на вход?' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Что такое комиссия на выход?' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Что такое price impact?' })).toBeInTheDocument()
    })

    test('renders explicit factor term with tooltip trigger', () => {
        render(
            <div data-testid='factor-text'>
                {renderTermTooltipRichText(
                    'Значение — текущее состояние [[factor|фактора]] в момент построения прогноза.'
                )}
            </div>
        )

        expect(screen.getByTestId('factor-text')).toHaveTextContent(
            'Значение — текущее состояние фактора в момент построения прогноза.'
        )
        expect(screen.getByRole('button', { name: 'Что такое фактора?' })).toBeInTheDocument()
    })

    test('preserves trailing space when plain text chunk is followed by tooltip term chunk', () => {
        render(
            <div data-testid='chunked-title' style={{ display: 'inline-flex' }}>
                {renderTermTooltipRichText('Сводка ')}
                {renderTermTooltipRichText('бэктеста')}
            </div>
        )

        const container = screen.getByTestId('chunked-title')
        expect(container).toHaveTextContent('Сводка бэктеста')
        expect(container.firstElementChild).toHaveClass(cls.textSegment)
        expect(container.firstElementChild?.textContent).toBe('Сводка ')
    })

    test('keeps visible separator between text and tooltip term inside inline-flex container', () => {
        render(
            <div data-testid='inline-flex-title' style={{ display: 'inline-flex' }}>
                {renderTermTooltipRichText('Сводка бэктеста')}
            </div>
        )

        const container = screen.getByTestId('inline-flex-title')
        expect(container).toHaveTextContent('Сводка бэктеста')
        expect(container.firstElementChild).toHaveClass(cls.textSegment)
        expect(container.firstElementChild?.textContent).toBe('Сводка ')
    })

    test('does not turn tooltip boundaries into non-breaking chains', () => {
        render(
            <div data-testid='wrapable-rich-text'>
                {renderTermTooltipRichText(
                    'Историческая симуляция с доходностью, [[drawdown|просадкой]], [[liquidation|ликвидациями]] и [[recovery|скоростью восстановления после провалов]].'
                )}
            </div>
        )

        const container = screen.getByTestId('wrapable-rich-text')
        expect(container).toHaveTextContent(
            'Историческая симуляция с доходностью, просадкой, ликвидациями и скоростью восстановления после провалов.'
        )
        expect(container.textContent).not.toContain('\u00A0')
    })

    test('strips explicit term markup in plain-text fallback when rich-text rendering fails', () => {
        render(
            <div data-testid='fallback-rich-text'>
                {renderTermTooltipRichText(
                    'Итог строится из [[current-prediction-daily-layer|Daily]] и [[landing-micro-model|Micro]].',
                    {
                        resolveExplicitTermLink: () => {
                            throw new Error('Forced fallback path')
                        }
                    }
                )}
            </div>
        )

        const container = screen.getByTestId('fallback-rich-text')
        expect(container).toHaveTextContent('Итог строится из Daily и Micro.')
        expect(container.textContent).not.toContain('[[')
        expect(container.textContent).not.toContain(']]')
    })

    test('renders nested tooltip terms inside function-based tooltip descriptions', () => {
        render(
            <div data-testid='nested-function-description'>
                {renderTermTooltipRichText('[[current-prediction-model-stack|Модели текущего прогноза]]')}
            </div>
        )

        fireEvent.click(screen.getByRole('button', { name: 'Что такое Модели текущего прогноза?' }))

        expect(screen.getByRole('button', { name: 'Что такое Daily?' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Что такое Micro?' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Что такое (factor|фактор)\?/ })).toBeInTheDocument()
    })

    test('renders American session term as nested tooltip owner', () => {
        render(
            <div data-testid='nyse-session-text'>
                {renderTermTooltipRichText(
                    'Торговый день считается по [[landing-nyse-session|американской сессии]] этого же дня.'
                )}
            </div>
        )

        expect(screen.getByTestId('nyse-session-text')).toHaveTextContent(
            'Торговый день считается по американской сессии этого же дня.'
        )
        expect(screen.getByRole('button', { name: 'Что такое американской сессии?' })).toBeInTheDocument()
    })
})
