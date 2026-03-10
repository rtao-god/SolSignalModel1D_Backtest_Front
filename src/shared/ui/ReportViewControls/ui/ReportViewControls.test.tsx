import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import ReportViewControls from './ReportViewControls'

describe('ReportViewControls', () => {
    test('keeps the group tooltip and does not render tooltip triggers inside buttons', () => {
        const { container } = render(
            <ReportViewControls
                groups={[
                    {
                        key: 'training-scope',
                        label: 'Training scope',
                        infoTooltip: 'Group-level tooltip',
                        value: 'full',
                        options: [
                            {
                                value: 'full',
                                label: 'Full',
                                tooltip: 'Option-level tooltip'
                            },
                            {
                                value: 'oos',
                                label: 'OOS',
                                tooltip: 'Option-level tooltip'
                            }
                        ],
                        onChange: () => undefined
                    }
                ]}
            />
        )

        const fullButton = screen.getByText('Full').closest('button')

        expect(fullButton).not.toBeNull()
        if (!fullButton) {
            throw new Error('Expected Full option button to be rendered.')
        }

        expect(fullButton.querySelector('[data-term-tooltip-instance-id]')).toBeNull()
        expect(container.querySelectorAll('[data-term-tooltip-instance-id]')).toHaveLength(1)
    })
})
