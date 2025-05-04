/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { useEffect, useState } from 'react'
import { animate, stagger } from 'framer-motion'

// import arrowDown from "/assets/arrow-down-gray.svg";
// import man from "/assets/man.jpg";
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Users.module.scss'
import Layout from '../Layout/Layout'
import { Text } from '@/shared/ui'
import UsersProps from './types'

export default function Users({ className }: UsersProps) {
    const [isFilter, setIsFilter] = useState<number>(1)

    useEffect(() => {
        void animate(
            'li',
            {
                opacity: [0, 1]
            },
            { delay: stagger(0.2) }
        )
    }, [])

    return (
        <Layout>
            <div className={classNames(cls.Users, {}, [className ?? ''])}>
                <div className={cls.search}>
                    <Text type='h2' fz='24px'>
                        Всего пользователей - 3135
                    </Text>
                </div>
                <div className={cls.filters}>
                    {[1, 2, 3].map(item => (
                        <div
                            key={item}
                            className={isFilter === item ? `${cls.filter} ${cls.active}` : cls.filter}
                            onClick={() => {
                                setIsFilter(item)
                            }}>
                            <Text type='h2' color='#B1B2B4' fz='19px'>
                                Москва 55
                            </Text>
                        </div>
                    ))}
                </div>
                <div className={cls.table}>
                    <div className={cls.tableFilters}>
                        <div className={cls.tableFilter} style={{ marginLeft: '36px' }}>
                            <Text type='p' fz='17px' color='#7D7F82'>
                                Имя Фамилия
                            </Text>
                            {/* <img src={arrowDown} alt="" /> */}
                        </div>
                        <div className={cls.tableFilter} style={{ justifyContent: 'center' }}>
                            <Text type='p' fz='17px' color='#7D7F82'>
                                Дата Рождения
                            </Text>
                            {/* <img src={arrowDown} alt="" /> */}
                        </div>
                        <div className={cls.tableFilter} style={{ justifyContent: 'center' }}>
                            <Text type='p' fz='17px' color='#7D7F82'>
                                Болезнь · Проблема · Недуг
                            </Text>
                            {/* <img src={arrowDown} alt="" /> */}
                        </div>
                        <div className={cls.tableFilter} style={{ justifyContent: 'flex-end' }}>
                            <Text type='p' fz='17px' color='#7D7F82'>
                                Дата Поступления
                            </Text>
                            {/* <img src={arrowDown} alt="" /> */}
                        </div>
                    </div>
                    <ul className={cls.box}>
                        {[1, 2, 3, 4, 5].map((_, i) => (
                            <li className={cls.cols} key={i}>
                                <div className={cls.col}>
                                    <div className={cls.data}>
                                        <Text color='#7D7F82' type='p' fz='17px'>
                                            {`${i + 1}.`}
                                        </Text>
                                        {/* <img src={man} alt="" /> */}
                                        <div className={cls.text}>
                                            <Text type='h2' fz='19px'>
                                                Яковенко А. С.
                                            </Text>
                                            <Text type='p' fz='17px' color='#B1B2B4'>
                                                Пользователь
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                                <div className={cls.col}>
                                    <Text type='p' fz='19px' position='center'>
                                        24 Фев, 1994
                                    </Text>
                                </div>
                                <div
                                    className={cls.col}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                    <div
                                        color={cls.disease}
                                        style={{
                                            backgroundColor: '#EBF3FF',
                                            padding: '12px 16px',
                                            borderRadius: 16
                                        }}>
                                        <Text type='h3' fz='19px' color='#0064FA'>
                                            Ковид
                                        </Text>
                                    </div>
                                </div>
                                <div className={cls.col}>
                                    <Text type='p' fz='19px' position='end'>
                                        24 Фев, 1994
                                    </Text>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Layout>
    )
}
