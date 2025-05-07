export default interface RegistrationSchema {
    identifier: string
    birthday: string
    password: string
    confirmPassword: string
    isChecked: boolean
    error: string
    isAuthenticated
}
