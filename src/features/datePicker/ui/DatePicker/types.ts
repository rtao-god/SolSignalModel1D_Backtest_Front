/**
 * Публичный контракт корневого date picker.
 */
export default interface DatePickerProps {
    /** Внешний CSS-класс контейнера инпутов и popup. */
    className?: string
    /** Нижняя граница выбора; если не задана, feature использует собственный дефолт. */
    minSelectableDate?: Date
}
