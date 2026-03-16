import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import ReportTableTermsBlock, {
    buildReportTableTermsCollapseStorageKey
} from './ReportTableTermsBlock'

describe('ReportTableTermsBlock', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        window.localStorage.clear()
    })

    test('opens term descriptions by default', () => {
        render(
            <ReportTableTermsBlock
                terms={[
                    {
                        key: 'Policy',
                        title: 'Policy',
                        description: 'Описание policy.',
                        tooltip: 'Описание policy.'
                    }
                ]}
                title='Термины секции'
                subtitle='Подсказки для блока.'
            />
        )

        expect(screen.getByText('Описание policy.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Скрыть блок' })).toBeInTheDocument()
    })

    test('collapses only the term grid and keeps the header visible', () => {
        render(
            <ReportTableTermsBlock
                terms={[
                    {
                        key: 'Policy',
                        title: 'Policy',
                        description: 'Описание policy.',
                        tooltip: 'Описание policy.'
                    }
                ]}
                title='Термины секции'
                subtitle='Подсказки для блока.'
            />
        )

        fireEvent.click(screen.getByRole('button', { name: 'Скрыть блок' }))

        expect(screen.queryByText('Описание policy.')).not.toBeInTheDocument()
        expect(screen.getByText('Термины секции')).toBeInTheDocument()
        expect(screen.getByText('Подсказки для блока.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Показать блок' })).toBeInTheDocument()
    })

    test('restores collapsed state from localStorage', () => {
        const storageKey = buildReportTableTermsCollapseStorageKey({
            reportKind: 'backtest_execution_pipeline',
            sectionTitle: 'Model Level',
            title: 'Термины секции',
            termKeys: ['Policy']
        })
        if (!storageKey) {
            throw new Error('[report-table-terms-block-test] storage key must be resolved.')
        }

        window.localStorage.setItem(storageKey, '1')

        render(
            <ReportTableTermsBlock
                reportKind='backtest_execution_pipeline'
                sectionTitle='Model Level'
                title='Термины секции'
                subtitle='Подсказки для блока.'
                terms={[
                    {
                        key: 'Policy',
                        title: 'Policy',
                        description: 'Описание policy.',
                        tooltip: 'Описание policy.'
                    }
                ]}
            />
        )

        expect(screen.queryByText('Описание policy.')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Показать блок' })).toBeInTheDocument()
    })

    test('keeps inline term title as plain text without tooltip trigger', () => {
        render(
            <ReportTableTermsBlock
                terms={[
                    {
                        key: 'Policy',
                        title: 'Policy',
                        description: 'Описание без вложенных терминов.',
                        tooltip: 'Описание без вложенных терминов.'
                    }
                ]}
            />
        )

        expect(screen.getByText('Policy')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Что такое Policy?' })).not.toBeInTheDocument()
    })

    test('uses selfAliases to suppress self-reference while keeping other tooltip terms active', () => {
        render(
            <ReportTableTermsBlock
                terms={[
                    {
                        key: 'Policy',
                        title: 'Policy',
                        description: 'Policy сравнивается с Branch и не должен ссылаться сам на себя.',
                        tooltip: 'Policy сравнивается с Branch и не должен ссылаться сам на себя.',
                        selfAliases: ['Policy']
                    }
                ]}
                enhanceDomainTerms
            />
        )

        expect(screen.queryByRole('button', { name: 'Что такое Policy?' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Что такое Branch?' })).toBeInTheDocument()
    })
})
