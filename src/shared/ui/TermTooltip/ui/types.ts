import { ReactNode } from "react"
import { TextTag } from "../../Text/ui/Text/types"

export default interface TermTooltipProps {
    term: string
    description: ReactNode
    type?: TextTag
    className?: string
    align?: 'left' | 'right'
}