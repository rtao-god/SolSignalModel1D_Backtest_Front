import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { renderTermTooltipRichText } from './renderTermTooltipRichText'

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
})
