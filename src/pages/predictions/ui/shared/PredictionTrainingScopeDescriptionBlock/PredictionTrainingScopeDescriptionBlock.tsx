import { ReportTableTermsBlock } from '@/shared/ui'
import {
    buildPredictionTrainingScopeDescriptionCollapseStorageKey,
    type PredictionTrainingScopeDescriptionVariant
} from './PredictionTrainingScopeDescriptionBlock.model'

interface PredictionTrainingScopeDescriptionBlockProps {
    variant: PredictionTrainingScopeDescriptionVariant
    description: string
    className?: string
}

const TRAINING_SCOPE_BLOCK_HEADING = 'Что такое режимы и зачем они нужны'
const TRAINING_SCOPE_BLOCK_SUBTITLE =
    'Блок собирает точное описание режимов, диапазонов дат и правил обучения для этой страницы.'

function ensureNonEmptyDescription(description: string): string {
    const normalized = description.trim()
    if (normalized.length === 0) {
        throw new Error('[prediction-training-scope-block] description is empty.')
    }

    return normalized
}

function stripLeadingHeading(description: string): string {
    const normalized = ensureNonEmptyDescription(description)
    const prefix = `${TRAINING_SCOPE_BLOCK_HEADING}\n\n`

    return normalized.startsWith(prefix) ? normalized.slice(prefix.length).trim() : normalized
}

function resolveTrainingScopeBlockTitle(variant: PredictionTrainingScopeDescriptionVariant): string {
    return variant === 'history' ? 'Режимы истории прогнозов' : 'Режимы текущего прогноза'
}

// Страница и tooltip должны читать один и тот же owner-текст про training scope,
// иначе даты, split-правило и смысл режимов начинают расходиться по двум версиям.
export function PredictionTrainingScopeDescriptionBlock({
    variant,
    description,
    className
}: PredictionTrainingScopeDescriptionBlockProps) {
    return (
        <ReportTableTermsBlock
            className={className}
            title={resolveTrainingScopeBlockTitle(variant)}
            subtitle={TRAINING_SCOPE_BLOCK_SUBTITLE}
            enhanceDomainTerms
            collapseStorageKey={buildPredictionTrainingScopeDescriptionCollapseStorageKey(variant)}
            terms={[
                {
                    key: `prediction-training-scope-${variant}`,
                    title: TRAINING_SCOPE_BLOCK_HEADING,
                    description: stripLeadingHeading(description)
                }
            ]}
        />
    )
}
