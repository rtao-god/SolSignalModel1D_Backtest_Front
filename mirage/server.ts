import { User } from '@/entities/User'
import { createServer, Model } from 'miragejs'

interface UserProfile {
    name: string
}

interface Post {
    id: string
    title: string
    counter: string
}

interface Comment {
    id: string
    body: string
    postId: string
}

export function makeServer({ environment = 'development' } = {}) {
    const server = createServer({
        environment,

        models: {
            post: Model.extend<Partial<Post>>({}),
            comment: Model.extend<Partial<Comment>>({}),
            user: Model.extend<Partial<User>>({}),
            currentUser: Model,
            profile: Model.extend<Partial<UserProfile>>({})
        },

        seeds(server: any) {
            server.create('user', { id: '1', identifier: 'admin@gmail.com', password: '1111' })
            server.create('user', { id: '2', identifier: 'admin2@gmail.com', password: '2222' })
            server.create('user', { id: '3', identifier: 'admin3@gmail.com', password: '3333' })

            server.create('comment', { id: '1', body: 'some comment', postId: '1' })
            server.create('post', { id: 1, title: 'Post 1', counter: 0 })
            server.create('post', { id: 2, title: 'Post 2', counter: 0 })
            server.create('post', { id: 3, title: 'Post 3', counter: 0 })
            server.create('post', { id: 4, title: 'Post 4', counter: 0 })
            server.create('post', { id: 5, title: 'Post 5', counter: 0 })
            server.create('post', { id: 6, title: 'Post 6', counter: 0 })
            server.create('post', { id: 7, title: 'Post 7', counter: 0 })
            server.create('post', { id: 8, title: 'Post 8', counter: 0 })
            server.create('post', { id: 9, title: 'Post 9', counter: 0 })
            server.create('post', { id: 10, title: 'Post 10', counter: 0 })
        },

        routes() {
            this.namespace = 'api'

            this.get('/posts', schema => {
                return schema.all('post').models
            })

            this.patch('/posts/:id', (schema, request) => {
                const id = request.params.id
                const attrs = JSON.parse(request.requestBody)
                const post = schema.posts.find(id)

                if (post) {
                    post.update({ counter: attrs.counter })
                    return post
                } else {
                    return new Response(404, {}, { error: 'Post not found' })
                }
            })

            this.post('/register', (schema, request) => {
                const attrs = JSON.parse(request.requestBody)

                // Проверяем, существует ли уже пользователь с таким же identifier
                const existingUser = schema.users.findBy({ identifier: attrs.identifier })
                if (existingUser) {
                    return new Response(400, {}, { error: 'User with this identifier already exists' })
                }

                const newUser = schema.users.create({
                    identifier: attrs.identifier,
                    password: attrs.password,
                    id: String(Math.random())
                })

                return {
                    id: newUser.id,
                    identifier: newUser.identifier
                }
            })

            this.get('/comments', schema => {
                return schema.all('comment')
            })

            this.get('/profile', schema => {
                return schema.all('profile')
            })

            this.post('/login', (schema, request) => {
                const attrs = JSON.parse(request.requestBody)
                const user = schema.users.findBy({
                    identifier: attrs.identifier,
                    password: attrs.password
                })

                if (user) {
                    // Сохраняем пользователя в currentUser для имитации сессии
                    schema.db.currentUsers.remove() // Очистка предыдущего пользователя
                    schema.db.currentUsers.insert(user.attrs) // Сохранение текущего пользователя
                    return { id: user.id, identifier: user.identifier }
                } else {
                    return new Response(401, {}, { error: 'Invalid identifier or password' })
                }
            })

            this.get('/currentUser', schema => {
                // Возвращаем текущего пользователя, если он сохранен
                const currentUser = schema.db.currentUsers[0]
                if (currentUser) {
                    return currentUser
                } else {
                    return new Response(401, {}, { error: 'User not authenticated' })
                }
            })

            this.post('/logout', schema => {
                // Удаляем текущего пользователя
                schema.db.currentUsers.remove()
                return new Response(200, {}, { message: 'Logged out successfully' })
            })

            this.get('/users/:id', (schema, request) => {
                const id = request.params.id
                const user = schema.users.find(id)

                if (user) {
                    return user.attrs
                } else {
                    return new Response(404, {}, { error: 'User not found' })
                }
            })

            this.get('/users', schema => {
                return schema.all('user')
            })

            this.post('/users/', (schema, request) => {
                const attrs = JSON.parse(request.requestBody)
                console.log('Received in POST /users/:', attrs)
                return schema.users.create(attrs)
            })

            this.passthrough('https://ipinfo.io/**')
        }
    })

    return server
}
