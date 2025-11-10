import styles from './AdBtn.module.scss';
import { getAuthToken } from "../../../../utils/auth";

interface AdBtnProps {
    text?: string;
}

export const AdBtn = ({ text = "Разместить объявление" }: AdBtnProps) => {
    const isAuthenticated = !!getAuthToken();

    // Получаем роль пользователя из localStorage
    const getUserRole = (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('userRole');
    };

    const userRole = getUserRole();

    if (isAuthenticated && userRole === 'ROLE_MASTER') {
        return null;
    }

    return (
        <button className={styles.btn}>
            {text}
        </button>
    );
}