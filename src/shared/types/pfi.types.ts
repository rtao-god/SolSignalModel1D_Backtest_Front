export type PfiReportKindDto = 'pfi_per_model' | 'pfi_sl_model'
export type PfiFeatureDetailReportKindDto = 'pfi_per_model_feature_detail'
export type PfiReportFamilyKeyDto = 'daily_model' | 'sl_model'
export type PfiScoreScopeKeyDto = 'train_oof' | 'oos' | 'train' | 'full_history'
export type PfiFeatureHistoryRangeKeyDto = 'all' | '180' | '730'
export type PfiFeatureDetailScoreScopeKeyDto = PfiScoreScopeKeyDto

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

/**
 * Published PFI detail-отчёт по одной фиче.
 * Читается фронтом как готовый read-only артефакт.
 */
export interface PfiFeatureDetailReportDto {
    /** Уникальный идентификатор отчёта внутри storage-kind. */
    id: string
    /** Published kind detail-отчёта. */
    kind: PfiFeatureDetailReportKindDto
    /** Каноничное имя фичи. */
    featureName: string
    /** Каноничный ключ family: daily_model. */
    familyKey: PfiReportFamilyKeyDto
    /** Ключ схемы признаков (или объединённый список через '/'). */
    featureSchemaKey: string
    /** UTC-время генерации отчёта в ISO-формате. */
    generatedAtUtc: string
    /** Train-boundary исходного прогона в ISO day-key UTC. */
    trainUntilExitDayKeyUtc?: string
    /** Каноничный ключ выбранного смыслового источника. */
    scoreScopeKey: PfiFeatureDetailScoreScopeKeyDto
    /** Доступные source-кнопки без дополнительного запроса. */
    availableScoreScopeKeys: PfiFeatureDetailScoreScopeKeyDto[]
    /** Доступные range-кнопки без дополнительного запроса. */
    availableHistoryRangeKeys: PfiFeatureHistoryRangeKeyDto[]
    /** Каноничный ключ опубликованного диапазона истории. */
    historyRangeKey: PfiFeatureHistoryRangeKeyDto
    /** Блоки описания фичи. */
    descriptionBlocks: PfiFeatureDetailBlockDto[]
    /** Таблица метрик по секциям моделей. */
    sectionStatsTable?: PfiFeatureDetailTableDto
    /** Таблица сравнения с соседними фичами. */
    peerFeaturesTable?: PfiFeatureDetailTableDto
    /** Таблица качества прогноза по секциям моделей. */
    modelQualityTable?: PfiFeatureDetailTableDto
    /** Таблица локального вклада выбранной фичи по секциям моделей. */
    contributionStatsTable?: PfiFeatureDetailTableDto
    /** Таблица buckets по значениям выбранной фичи. */
    valueBucketsTable?: PfiFeatureDetailTableDto
    /** Профиль связи значения фичи с дальнейшим исходом дня. */
    valueOutcomeProfile?: PfiFeatureValueOutcomeProfileDto
    /** Готовые исторические графики по фиче. */
    historyCharts: PfiFeatureHistoryChartDto[]
    /** Сводка покрытия истории. */
    historyCoverage?: PfiFeatureHistoryCoverageDto
}

export interface PfiFeatureValueOutcomeProfileDto {
    /** Заголовок блока. */
    title: string
    /** Короткое описание того, как читать профиль. */
    description: string
    /** Заголовок шкалы значений по оси X. */
    scaleTitle: string
    /** Единица шкалы значений. */
    scaleUnit: string
    /** Число знаков после запятой для значений шкалы X. */
    valueDecimals: number
    /** Шаг между соседними точками профиля. */
    gridStep: number
    /** Общее число дней внутри выбранного среза. */
    observationCount: number
    /** Начало покрытия истории для профиля. */
    coverageStartDayKeyUtc?: string
    /** Конец покрытия истории для профиля. */
    coverageEndDayKeyUtc?: string
    /** Точки профиля в порядке возрастания значений. */
    points: PfiFeatureValueOutcomePointDto[]
}

export interface PfiFeatureValueOutcomePointDto {
    /** Значение фичи в человекочитаемой шкале. */
    value: number
    /** Число реальных дней около этого значения. */
    supportCount: number
    /** Вероятность дня роста. */
    upProbability?: number
    /** Вероятность дня без выраженного движения. */
    flatProbability?: number
    /** Вероятность дня падения. */
    downProbability?: number
    /** Перевес роста над падением. */
    longShortEdge?: number
}

export interface PfiFeatureHistoryCoverageDto {
    /** Сколько окон builder попытался посчитать. */
    requestedWindowCount: number
    /** Сколько окон реально опубликовано. */
    successfulWindowCount: number
    /** Сколько окон было пропущено. */
    skippedWindowCount: number
    /** Начало фактического покрытия истории. */
    coverageStartDayKeyUtc?: string
    /** Конец фактического покрытия истории. */
    coverageEndDayKeyUtc?: string
}

export interface PfiFeatureHistoryChartDto {
    /** Machine-readable ключ графика. */
    chartKey: string
    /** Заголовок графика. */
    title: string
    /** Короткое описание того, как читать график. */
    description: string
    /** Вариант метрики, который нужно открыть по умолчанию. */
    defaultVariantKey: string
    /** Ключ модели, для которой собрана история. */
    modelKey: string
    /** Человекочитаемое имя модели. */
    modelDisplayName: string
    /** Ключ score scope. */
    scoreScopeKey: string
    /** Размер rolling-окна в днях. */
    windowDays: number
    /** Шаг между окнами в днях. */
    stepDays: number
    /** Границы rolling-окон. */
    windows: PfiFeatureHistoryWindowDto[]
    /** Варианты метрик для локального переключения без новых запросов. */
    variants: PfiFeatureHistoryVariantDto[]
}

export interface PfiFeatureHistoryWindowDto {
    /** Начало окна в ISO day-key UTC. */
    startDayKeyUtc: string
    /** Конец окна в ISO day-key UTC. */
    endDayKeyUtc: string
}

export interface PfiFeatureHistoryVariantDto {
    /** Machine-readable ключ варианта. */
    variantKey: string
    /** Короткий заголовок варианта. */
    title: string
    /** Подпись метрики на оси Y. */
    metricTitle: string
    /** Единица измерения метрики. */
    metricUnit: string
    /** Признак того, что меньшие значения нужно читать как лучший результат. */
    lowerValuesAreBetter: boolean
    /** Рекомендуемое число знаков после запятой. */
    valueDecimals: number
    /** Серии по всем признакам. */
    series: PfiFeatureHistorySeriesDto[]
}

export interface PfiFeatureHistorySeriesDto {
    /** Каноничное имя фичи. */
    featureName: string
    /** Признак выбранной фичи. */
    isPrimary: boolean
    /** Порядок близости к выбранной фиче по основному графику полезности. */
    comparisonRank?: number
    /** Значения серии в порядке окон. */
    values: number[]
}

export interface PfiFeatureDetailBlockDto {
    /** Заголовок смыслового блока. */
    title: string
    /** Текст блока в rich-text формате. */
    body: string
}

export interface PfiFeatureDetailTableDto {
    /** Заголовок таблицы. */
    title: string
    /** Display-заголовки колонок. */
    columns: string[]
    /** Machine-readable ключи колонок. */
    columnKeys: string[]
    /** Materialized строки таблицы. */
    rows: string[][]
}

export interface PfiFeatureRollingChartDto {
    /** Заголовок графика. */
    title: string
    /** Название метрики по оси Y. */
    metricTitle: string
    /** Единицы метрики (например, п.п.). */
    metricUnit: string
    /** Ключ модели, по которой построена серия. */
    modelKey: string
    /** Человекочитаемое имя модели. */
    modelDisplayName: string
    /** Ключ скоупа расчёта. */
    scoreScopeKey: string
    /** Размер rolling-окна в днях. */
    windowDays: number
    /** Шаг между окнами в днях. */
    stepDays: number
    /** Серии графика (основная фича и конкуренты). */
    series: PfiFeatureRollingSeriesDto[]
}

export interface PfiFeatureRollingSeriesDto {
    /** Каноничное имя фичи. */
    featureName: string
    /** Признак основной (выбранной) фичи. */
    isPrimary: boolean
    /** Точки серии по rolling-окнам. */
    points: PfiFeatureRollingPointDto[]
}

export interface PfiFeatureRollingPointDto {
    /** Начало rolling-окна в ISO day-key UTC. */
    windowStartDayKeyUtc: string
    /** Конец rolling-окна в ISO day-key UTC. */
    windowEndDayKeyUtc: string
    /** Важность признака в процентных пунктах. */
    value: number
}
