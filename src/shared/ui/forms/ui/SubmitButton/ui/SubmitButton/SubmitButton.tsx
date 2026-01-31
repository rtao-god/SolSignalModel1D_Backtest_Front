import { Btn } from '@/shared/ui/Btn'
import cls from './SubmitButton.module.scss'
import SubmitButtonProps from './types'
import classNames from '@/shared/lib/helpers/classNames'

export default function SubmitButton({ label, className }: SubmitButtonProps) {
    return (
        <Btn className={classNames(cls.Submit_button, {}, [className ?? ''])} type='submit'>
            {label}
        </Btn>
    )
}

