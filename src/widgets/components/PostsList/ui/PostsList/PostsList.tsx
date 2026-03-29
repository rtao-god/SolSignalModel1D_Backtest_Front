import classNames from '@/shared/lib/helpers/classNames'
import cls from './PostsList.module.scss'
import PostsListProps from './types'
import { useState, useEffect } from 'react'
import { Btn, Row, Text, Form, SubmitButton, TextInput, FormField } from '@/shared/ui'
import { logError } from '@/shared/lib/logging/logError'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'

export default function PostsList({ className }: PostsListProps) {
    const [posts, setPosts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [counters, setCounters] = useState<{ [key: number]: number }>({})
    const [formData, setFormData] = useState({})
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                setIsLoading(true)
            } catch (err) {
                const normalizedError = normalizeErrorLike(err, 'Posts list failed to initialize.', {
                    source: 'posts-list',
                    domain: 'ui_section',
                    owner: 'ui.posts-list',
                    expected: 'Posts list initializes loading state before data render starts.',
                    actual: 'Posts list threw while preparing its initial loading state.',
                    requiredAction: 'Inspect the posts-list initialization flow or remove the dead loading branch if the component stays static.'
                })

                logError(normalizedError, undefined, {
                    source: 'posts-list',
                    domain: 'ui_section',
                    severity: 'warning',
                    owner: 'ui.posts-list',
                    expected: 'Posts list initializes loading state before data render starts.',
                    actual: 'Posts list threw while preparing its initial loading state.',
                    requiredAction: 'Inspect the posts-list initialization flow or remove the dead loading branch if the component stays static.'
                })
                setError(normalizedError.message)
            } finally {
                setIsLoading(false)
            }
        }
        fetchPosts()
    }, [])

    const handleUpdateCounter = (id: number) => {
        const newCounter = (counters[id] || 0) + 1
        setCounters({ ...counters, [id]: newCounter })
    }

    const handleFormSubmit = (data: any) => {
        const newErrors = validateForm(data)
        if (Object.keys(newErrors).length === 0) {
            setFormData(data)
        } else {
            setErrors(newErrors)
        }
    }

    const validateForm = (data: any) => {
        const errors: any = {}
        if (!data.name) errors.name = 'Name is required'
        if (!data.email) errors.email = 'Email is required'
        return errors
    }

    if (isLoading) return <div>Loading...</div>
    if (error) return <div>Error: {error}</div>

    return (
        <div className={classNames(cls.Posts_list, {}, [className ?? ''])}>
            <Form onSubmit={handleFormSubmit}>
                <FormField label='Name' name='name' error={errors.name}>
                    <TextInput name='name' placeholder='Enter your name' />
                </FormField>
                <FormField label='Email' name='email' error={errors.email}>
                    <TextInput name='email' placeholder='Enter your email' />
                </FormField>
                <SubmitButton label='Submit' />
            </Form>
            {formData && (
                <div className='form-data'>
                    <Text type='h3'>Submitted Data:</Text>
                    <pre>{JSON.stringify(formData, null, 2)}</pre>
                </div>
            )}
            {posts.map((post: any) => (
                <div className={cls.post} key={post.id}>
                    <Text type='h3'>{post.title}</Text>
                    <Text>{post.body}</Text>
                    <Row gap={20}>
                        <Btn onClick={() => handleUpdateCounter(post.id)}>Increment</Btn>
                        <Text>Counter: {counters[post.id] || 0}</Text>
                    </Row>
                </div>
            ))}
        </div>
    )
}
