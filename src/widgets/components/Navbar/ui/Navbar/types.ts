export default interface NavbarProps {
    className?: string

    /**
     * Показывать ли кнопку-открывалку сайдбара (модалка).
     * На десктопе — false, на мобилке/планшете — true.
     */
    showSidebarToggle?: boolean

    /**
     * Обработчик клика по кнопке сайдбара в навбаре.
     */
    onSidebarToggleClick?: () => void
}
