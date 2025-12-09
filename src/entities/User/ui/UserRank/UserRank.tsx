import { Text } from '@/shared/ui'
import UserRankProps from './types'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './UserRank.module.scss'

export default function UserRank({ className, rank, position, fz = '14px' }: UserRankProps) {
    return (
        <div className={classNames(cls.User_rank, {}, [className ?? ''])}>
            <Text fz={fz} color='#B1B2B4' position={position}>
                rank: {rank}
            </Text>
        </div>
    )
}
