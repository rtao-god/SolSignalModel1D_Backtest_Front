import { useTranslation } from 'react-i18next'
import DatePicker from '@/features/datePicker/ui/DatePicker/DatePicker'
import type { AboutPageProps } from './types'

/*
	About — временный контейнер раздела справочной информации, который пока использует DatePicker как демонстрационный контент.

	Зачем:
		- Держит маршрут About активным и пригодным для дальнейшего наполнения без поломки навигации.
		- Даёт точку расширения для будущих информационных блоков раздела.
*/
export default function About({ className }: AboutPageProps) {
    const { t } = useTranslation('about')
    // Временный контент страницы, пока раздел About не заполнен целевыми блоками.
    return <DatePicker />
}
