import { useBackOnPrevPage } from '@/shared/lib/hooks/'
import cls from './NotFound.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { MOBILE } from '@/shared/utils'
import { Btn, Text } from '@/shared/ui'

interface NotFoundProps {
    className?: string
}

export default function NotFound({ className }: NotFoundProps) {
    const backOnPrevPage = useBackOnPrevPage

    return (
        <div className={classNames(cls.Not_found_page, {}, [className ?? ''])}>
            <div className={cls.container}>
                <Text type='h2' fz={MOBILE ? '17px' : '24px'} position='center'>
                    Страница не найдена
                </Text>
                <Text type='p' fz={MOBILE ? '14px' : '16px'} color='#B1B2B4' position='center'>
                    Неправильно набран адрес
                    <br /> или такой страницы не существует
                </Text>
            </div>
            <Btn color='#0064FA' onClick={backOnPrevPage}>
                Вернуться
            </Btn>
        </div>
    )
}
