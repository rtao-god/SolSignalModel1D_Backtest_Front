import cls from './Main.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import Layout from '../Layout/Layout'
import MainProps from './types'
import { PostsList } from '@/widgets/components'

export default function Main({ className }: MainProps) {
    return (
        <Layout>
            <PostsList />
        </Layout>
    )
}
