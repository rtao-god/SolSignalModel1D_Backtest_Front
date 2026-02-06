import { useTranslation } from 'react-i18next'
import DatePicker from '@/features/datePicker/ui/DatePicker/DatePicker'
import type { AboutPageProps } from './types'

/*
	About — страница с базовой информацией о проекте.

	Зачем:
		- Даёт пользователю точку входа для справочного контента.
		- Подключает локальные UI-элементы, связанные с разделом About.
*/

export default function About({ className }: AboutPageProps) {
    const { t } = useTranslation('about')

    // Пока страница использует DatePicker как демонстрационный контент.
    return <DatePicker />
}
