import { ReactNode, SyntheticEvent } from 'react'
import TermTooltip from './TermTooltip'
import { enrichTermTooltipDescription } from '../lib/enrichTermTooltipDescription'

const stopTooltipPropagation = (event: SyntheticEvent) => {
    event.stopPropagation()
}

export function renderTermTooltipTitle(term: string, description?: ReactNode | (() => ReactNode)): ReactNode {
    if (!description) {
        return term
    }

    return (
        <span onClick={stopTooltipPropagation} onMouseDown={stopTooltipPropagation}>
            <TermTooltip
                term={term}
                description={() =>
                    enrichTermTooltipDescription(
                        typeof description === 'function' ? description() : description,
                        {
                            term
                        }
                    )
                }
                type='span'
            />
        </span>
    )
}
