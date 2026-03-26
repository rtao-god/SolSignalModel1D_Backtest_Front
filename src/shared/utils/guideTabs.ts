import { DOCS_TESTS_TABS, DOCS_TRUTHFULNESS_TABS, type DocsTabConfig } from './docsTabs'
import {
    EXPLAIN_BRANCHES_TABS,
    EXPLAIN_FEATURES_TABS,
    EXPLAIN_SPLITS_TABS,
    EXPLAIN_TIME_TABS,
    type ExplainTabConfig
} from './explainTabs'

export interface GuideTabConfig {
    id: string
    label: string
    anchor: string
}

export const GUIDE_MODELS_TABS: GuideTabConfig[] = [
    {
        id: 'guide-models-meaning',
        label: 'Что это означает',
        anchor: 'guide-models-meaning'
    },
    {
        id: 'guide-models-reading',
        label: 'Как это читать',
        anchor: 'guide-models-reading'
    },
    {
        id: 'guide-models-logic',
        label: 'Как это работает',
        anchor: 'guide-models-logic'
    },
    {
        id: 'guide-models-contract',
        label: 'Контракт и ограничения',
        anchor: 'guide-models-contract'
    },
    {
        id: 'guide-models-checks',
        label: 'Проверки и сигналы',
        anchor: 'guide-models-checks'
    },
    {
        id: 'guide-models-related',
        label: 'Связанные темы',
        anchor: 'guide-models-related'
    }
]

export const GUIDE_BRANCHES_TABS: ExplainTabConfig[] = EXPLAIN_BRANCHES_TABS

export const GUIDE_SPLITS_TABS: ExplainTabConfig[] = EXPLAIN_SPLITS_TABS

export const GUIDE_TIME_TABS: ExplainTabConfig[] = EXPLAIN_TIME_TABS

export const GUIDE_FEATURES_TABS: ExplainTabConfig[] = EXPLAIN_FEATURES_TABS

export const GUIDE_TRUTHFULNESS_TABS: DocsTabConfig[] = DOCS_TRUTHFULNESS_TABS

export const GUIDE_TESTS_TABS: DocsTabConfig[] = DOCS_TESTS_TABS
