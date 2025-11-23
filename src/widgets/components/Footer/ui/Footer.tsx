import classNames from '@/shared/lib/helpers/classNames'
import cls from './Footer.module.scss'
import { WaveAnimate } from '@/shared/ui'

interface FooterProps {
    className?: string
}
// TODO: Сделать нормальный footer. Сейчас проблема с z-index (слоями) и прочим. Анимацию можно выпилить. 
export default function Footer({ className }: FooterProps) {
    return (
        <div></div>
       /*  <div className={classNames(cls.Footer, {}, [className ?? ''])}>
            <WaveAnimate /> 
        </div> */
    )
}
