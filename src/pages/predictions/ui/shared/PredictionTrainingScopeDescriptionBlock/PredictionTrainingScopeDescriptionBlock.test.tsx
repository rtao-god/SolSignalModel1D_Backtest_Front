import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import { PredictionTrainingScopeDescriptionBlock } from './PredictionTrainingScopeDescriptionBlock'
import { buildPredictionTrainingScopeDescriptionCollapseStorageKey } from './PredictionTrainingScopeDescriptionBlock.model'

describe('PredictionTrainingScopeDescriptionBlock', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        window.localStorage.clear()
    })

    test('renders one shared heading without duplicating the first description paragraph', () => {
        render(
            <PredictionTrainingScopeDescriptionBlock
                variant='history'
                description={'Что такое режимы и зачем они нужны\n\nПолная история показывает весь доступный диапазон.'}
            />
        )

        expect(screen.getAllByText('Что такое режимы и зачем они нужны')).toHaveLength(1)
        expect(screen.getByRole('button', { name: 'Что такое Полная история?' })).toBeInTheDocument()
        expect(screen.getByText('показывает весь доступный диапазон.', { exact: false })).toBeInTheDocument()
    })

    test('restores collapsed state from localStorage with a stable key per page variant', () => {
        const storageKey = buildPredictionTrainingScopeDescriptionCollapseStorageKey('live')
        window.localStorage.setItem(storageKey, '1')

        render(
            <PredictionTrainingScopeDescriptionBlock
                variant='live'
                description={'Что такое режимы и зачем они нужны\n\nOOS evaluation показывает только новые дни.'}
            />
        )

        expect(screen.queryByText('OOS evaluation показывает только новые дни.')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Показать блок' })).toBeInTheDocument()
    })
})
