import { useTranslation } from 'react-i18next'
import Layout from '../Layout/Layout'
import DatePicker from '@/features/datePicker/ui/DatePicker/DatePicker'

interface AboutPageProps {
    className?: string
}

export default function About({ className }: AboutProps) {
    const { t } = useTranslation('about')

    return (
        <Layout>
            <DatePicker />
        </Layout>
    )
}
