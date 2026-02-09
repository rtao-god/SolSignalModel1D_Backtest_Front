import type { SegmentKey } from './modelStatsTypes'

export const SEGMENT_PREFIX: Record<SegmentKey, string> = {
    FULL: '[FULL] ',
    TRAIN: '[TRAIN] ',
    OOS: '[OOS] ',
    RECENT: '[RECENT] '
}

export const SEGMENT_INIT_ORDER: SegmentKey[] = ['OOS', 'RECENT', 'TRAIN', 'FULL']
