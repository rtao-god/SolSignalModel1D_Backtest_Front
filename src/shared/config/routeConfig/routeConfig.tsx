import { lazy } from 'react'
import { RouteProps } from 'react-router'

const Main = lazy(() => import('@/pages/Main/Main'))
const Registration = lazy(() => import('@/pages/Registration/Registration'))
const Login = lazy(() => import('@/pages/Login/Login'))
const About = lazy(() => import('@/pages/About/About'))
const NotFound = lazy(() => import('@/pages/404/NotFound'))
const Profile = lazy(() => import('@/pages/profile/Profile/ui/Profile'))

export const routeConfig: RouteProps[] = [
    {
        path: '/',
        element: <Main />
    },
    {
        path: '/about',
        element: <About />
    },
    {
        path: '/registration',
        element: <Registration />
    },
    {
        path: '/login',
        element: <Login />
    },
    { path: '*', element: <NotFound /> },
    {
        path: '/profile',
        element: <Profile />
    }
]
