import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import Input from './Input'

describe('Input', () => {
    test('passes external className to the native input element', () => {
        render(<Input className='policyMegaInput' defaultValue='search' />)

        expect(screen.getByRole('textbox')).toHaveClass('policyMegaInput')
    })
})
