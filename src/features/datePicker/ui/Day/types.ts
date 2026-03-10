export default interface DayProps {
    date: Date | null
    className?: string
    isDisabled: boolean
    isToday: boolean
    isStandaloneSelection: boolean
    isSingleSelected: boolean
    isRangeStart: boolean
    isRangeEnd: boolean
    isInRange: boolean
    isRangeMonthStart: boolean
    isRangeMonthEnd: boolean
    showLeftBridge: boolean
    showRightBridge: boolean
    onSelectDate: (date: Date) => void
}
