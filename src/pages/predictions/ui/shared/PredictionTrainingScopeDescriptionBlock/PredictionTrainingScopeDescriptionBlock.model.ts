type PredictionTrainingScopeDescriptionVariant = 'history' | 'live'

export type { PredictionTrainingScopeDescriptionVariant }

export function buildPredictionTrainingScopeDescriptionCollapseStorageKey(
    variant: PredictionTrainingScopeDescriptionVariant
): string {
    return `report-terms-block:collapsed:prediction-training-scope:${variant}`
}
