import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import Text from './Text'

describe('Text', () => {
    test('uses body-md as default variant for paragraph text', () => {
        render(<Text>Owner typography</Text>)

        expect(screen.getByText('Owner typography')).toHaveAttribute('data-variant', 'body-md')
    })

    test('maps heading tags to semantic variants when variant is not passed', () => {
        render(<Text type='h3'>Section title</Text>)

        const heading = screen.getByRole('heading', { level: 3, name: 'Section title' })
        expect(heading).toHaveAttribute('data-variant', 'section-title')
    })

    test('uses explicit variant instead of tag-derived fallback', () => {
        render(
            <Text type='h2' variant='body-sm'>
                Compact heading
            </Text>
        )

        const heading = screen.getByRole('heading', { level: 2, name: 'Compact heading' })
        expect(heading).toHaveAttribute('data-variant', 'body-sm')
    })
})
