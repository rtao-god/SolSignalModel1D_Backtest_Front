export default interface CheckboxProps {
    className?: string
    label: string
    value?: boolean
    onChange?: (newValue: boolean) => void
}
