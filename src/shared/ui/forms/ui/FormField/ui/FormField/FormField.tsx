import cls from './FormField.module.scss'
import FormFieldProps from './types'

export default function FormField({ label, name, error, children }: FormFieldProps) {
    return (
        <div className={cls.Form_field}>
            <label htmlFor={name} className={cls.label}>
                {label}
            </label>
            {children}
            {error && <span className={cls.error}>{error}</span>}
        </div>
    )
}

