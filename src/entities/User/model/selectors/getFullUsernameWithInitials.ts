export const getFullUsernameWithInitials = (surname: string, name: string, patronymic: string): string => {
    return `${surname.replace(surname[0], surname[0]?.toUpperCase())} ${name
        .slice(0, 1)
        .replace(name[0], name[0]?.toUpperCase())}. ${patronymic
        .slice(0, 1)
        .replace(patronymic[0], patronymic[0]?.toUpperCase())}.`
}
