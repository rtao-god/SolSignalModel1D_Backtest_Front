import axios from 'axios'

export const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Access-Control-Allow-Origin': import.meta.env.VITE_API_BASE_URL,
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS'
    }
})
