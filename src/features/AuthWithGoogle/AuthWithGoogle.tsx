import { Google } from '@/shared/assets/icons/AuthWith'
import { AuthWith } from '@/shared/ui'
import { useTranslation } from 'react-i18next'

export default function AuthWithGoogle() {
    const { t } = useTranslation('auth')

    return <AuthWith img={<Google />} text={t('login.googleButton')} />
}
