import axios from 'axios'
import { API_BASE_URL } from '../config'

export const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Access-Control-Allow-Origin': API_BASE_URL,
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS'
    }
})

