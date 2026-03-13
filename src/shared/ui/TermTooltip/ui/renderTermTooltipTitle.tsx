import { ReactNode, SyntheticEvent } from 'react'
import TermTooltip from './TermTooltip'
import { enrichTermTooltipDescription } from '../lib/enrichTermTooltipDescription'

const stopTooltipPropagation = (event: SyntheticEvent) => {
    event.stopPropagation()
}

interface RenderTermTooltipTitleOptions {
    selfAliases?: string[]
}

export function renderTermTooltipTitle(
    term: string,
    description?: ReactNode | (() => ReactNode),
    options?: RenderTermTooltipTitleOptions
): ReactNode {
    if (!description) {
        return term
    }

    return (
        <span onClick={stopTooltipPropagation} onMouseDown={stopTooltipPropagation}>
            <TermTooltip
                term={term}
                description={() =>
                    enrichTermTooltipDescription(description, {
                        term,
                        selfAliases: options?.selfAliases
                    })
                }
                type='span'
            />
        </span>
    )
}
