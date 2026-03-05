import { ReactNode, SyntheticEvent } from 'react'
import TermTooltip from './TermTooltip'
import { enrichTermTooltipDescription } from '../lib/enrichTermTooltipDescription'

const stopTooltipPropagation = (event: SyntheticEvent) => {
    event.stopPropagation()
}

export function renderTermTooltipTitle(term: string, description?: ReactNode): ReactNode {
    if (!description) {
        return term
    }

    const resolvedDescription = enrichTermTooltipDescription(description, {
        term
    })

    return (
        <span onClick={stopTooltipPropagation} onMouseDown={stopTooltipPropagation}>
            <TermTooltip term={term} description={resolvedDescription} type='span' />
        </span>
    )
}
