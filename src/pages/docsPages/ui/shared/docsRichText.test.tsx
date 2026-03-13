import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { buildDocsGlossary, renderDocsRichText } from './docsRichText'

const GLOSSARY = buildDocsGlossary([
    [
        {
            id: 'truth-overview-causal',
            term: 'Causal snapshot',
            description: 'Снимок данных на момент решения.'
        },
        {
            id: 'truth-overview-trace',
            term: 'Traceability',
            description: 'Связь между источником и отчётом.'
        },
        {
            id: 'branches-base',
            term: 'BASE',
            description: 'Базовый режим исполнения.'
        },
        {
            id: 'shared-policy',
            term: 'Policy',
            sharedTermId: 'policy'
        }
    ]
])

describe('renderDocsRichText', () => {
    test('keeps tooltip for explicit term at the start of a regular sentence', () => {
        render(
            <div>
                {renderDocsRichText('[[truth-overview-causal|Causal snapshot]] отрезает будущие поля.', {
                    glossary: GLOSSARY
                })}
            </div>
        )

        expect(screen.getByRole('button', { name: 'Что такое Causal snapshot?' })).toBeInTheDocument()
    })

    test('suppresses tooltip for explicit self-definition lead', () => {
        render(
            <div data-testid='definition'>
                {renderDocsRichText('[[branches-base|BASE]] — базовый режим исполнения.', { glossary: GLOSSARY })}
            </div>
        )

        expect(screen.queryByRole('button', { name: 'Что такое BASE?' })).not.toBeInTheDocument()
        expect(screen.getByTestId('definition')).toHaveTextContent('BASE — базовый режим исполнения.')
    })

    test('autolinks plain glossary terms inside page text', () => {
        render(<div>{renderDocsRichText('Traceability фиксирует источник отчёта.', { glossary: GLOSSARY })}</div>)

        expect(screen.getByRole('button', { name: 'Что такое Traceability?' })).toBeInTheDocument()
    })

    test('does not autolink the current term inside its own description', () => {
        render(
            <div>
                {renderDocsRichText('Causal snapshot фиксирует момент доступности данных.', {
                    glossary: GLOSSARY,
                    visitedTermIds: ['truth-overview-causal']
                })}
            </div>
        )

        expect(screen.queryByRole('button', { name: 'Что такое Causal snapshot?' })).not.toBeInTheDocument()
    })

    test('renders shared glossary term through canonical tooltip registry', () => {
        render(
            <div>
                {renderDocsRichText('[[shared-policy|Policy]] задаёт логику входа.', {
                    glossary: GLOSSARY
                })}
            </div>
        )

        expect(screen.getByRole('button', { name: 'Что такое Policy?' })).toBeInTheDocument()
    })
})
