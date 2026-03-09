import type { ReactNode } from 'react'
import type { TermTooltipContextRule } from '@/shared/ui/TermTooltip/lib/termTooltipMatcher'

/**
 * Общий контракт термина для rich-text tooltip-реестра.
 * Один term id описывает один доменный смысл во всём проекте.
 */
export interface SharedTermTooltipRuleDraft {
    id: string
    title?: string
    description: ReactNode | (() => ReactNode)
    aliases?: string[]
    autolink?: boolean
    priority?: number
    contexts?: TermTooltipContextRule
    excludeSelf?: boolean
    pattern?: RegExp
    scope?: 'common' | 'local'
}
