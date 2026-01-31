import classNames from '@/shared/lib/helpers/classNames'
import cls from './TextInput.module.scss'
import TextInputProps from './types'
import { Input } from '@/shared/ui/Input'

export default function TextInput({ name, placeholder, className }: TextInputProps) {
    return <Input className={classNames(cls.Text_input, {}, [className ?? ''])} name={name} id={name} placeholder={placeholder} />
}

