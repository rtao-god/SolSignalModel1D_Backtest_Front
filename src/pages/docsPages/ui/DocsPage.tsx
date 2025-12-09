import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import cls from './DocsPage.module.scss'

interface DocsPageProps {
    className?: string
}

export default function DocsPage({ className }: DocsPageProps) {
    return (
        <div className={classNames(cls.DocsModelsPage, {}, [className ?? ''])}>
            <Text>DocsPage</Text>
        </div>
    )
}
