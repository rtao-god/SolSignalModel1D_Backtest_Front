import { ReactNode, SyntheticEvent } from 'react'
import TermTooltip from './TermTooltip'

const stopTooltipPropagation = (event: SyntheticEvent) => {
    event.stopPropagation()
}

export function renderTermTooltipTitle(term: string, description?: ReactNode): ReactNode {
    if (!description) {
        return term
    }

    return (
        <span onClick={stopTooltipPropagation} onMouseDown={stopTooltipPropagation}>
            <TermTooltip term={term} description={description} type='span' />
        </span>
    )
}
