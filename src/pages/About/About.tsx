import { useTranslation } from 'react-i18next'
import DatePicker from '@/features/datePicker/ui/DatePicker/DatePicker'

interface AboutPageProps {
    className?: string
}

export default function About({ className }: AboutPageProps) {
    const { t } = useTranslation('about')

    return <DatePicker />
}
