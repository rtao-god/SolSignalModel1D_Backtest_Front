import AuthWithProps from './types'
import { Text, Row, BlueBox } from '@/shared/ui'

export default function AuthWith({ img, text }: AuthWithProps) {
    return (
        <BlueBox
            style={{
                padding: 16,
                borderColor: '#D6E7FF',
                display: 'flex',
                justifyContent: 'center'
            }}>
            <Row gap={10}>
                {img}
                <Text>{text}</Text>
            </Row>
        </BlueBox>
    )
}

