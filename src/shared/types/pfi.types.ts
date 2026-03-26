export type PfiReportKindDto = 'pfi_per_model' | 'pfi_sl_model'
export type PfiReportFamilyKeyDto = 'daily_model' | 'sl_model'
export type PfiScoreScopeKeyDto = 'train_oof' | 'oos' | 'train' | 'full_history'

/**
 * Published PFI-документ для одного семейства моделей.
 * Читается фронтом как готовый read-only артефакт без дополнительного разбора report sections.
 */
export interface PfiReportDocumentDto {
    /** Уникальный идентификатор опубликованного документа внутри report kind. */
    id: string
    /** Published kind: daily PFI или SL PFI. */
    kind: PfiReportKindDto
    /** Заголовок документа для карточки страницы и export. */
    title: string
    /** Локализуемый ключ заголовка, если он задан на backend. */
    titleKey?: string
    /** UTC-время генерации latest published документа в ISO-формате. */
    generatedAtUtc: string
    /** Каноничный ключ семейства: daily_model или sl_model. */
    familyKey: PfiReportFamilyKeyDto
    /** Train-boundary исходного прогона в ISO day-key UTC. */
    trainUntilExitDayKeyUtc?: string
    /** Typed PFI-секции документа. */
    sections: PfiReportSectionDto[]
}

/**
 * Typed PFI-секция для одной модели и одного score scope.
 * Навигация и рендеринг строятся по metadata, а не по display title.
 */
export interface PfiReportSectionDto {
    /** Стабильный ключ секции внутри family-документа. */
    sectionKey: string
    /** Заголовок карточки и export-файла. */
    title: string
    /** Ключ семейства, которому принадлежит секция. */
    familyKey: PfiReportFamilyKeyDto
    /** Каноничный ключ модели. */
    modelKey: string
    /** Человекочитаемое имя модели для табов и карточек. */
    modelDisplayName: string
    /** Ключ eval scope: train_oof, oos, train или full_history. */
    scoreScopeKey: PfiScoreScopeKeyDto
    /** Ключ схемы признаков: daily, micro или sl. */
    featureSchemaKey: string
    /** Обозначение threshold или fit-режима, если оно есть у секции. */
    thresholdLabel?: string
    /** Базовый ROC-AUC до permutation. */
    baselineAuc: number
    /** Display-заголовки колонок таблицы. */
    columns: string[]
    /** Machine-readable ключи колонок. */
    columnKeys: string[]
    /** Materialized строки таблицы в display-порядке. */
    rows: string[][]
}
