import styles from './AdBtn.module.scss';
import { getAuthToken } from "../../../../utils/auth";

interface AdBtnProps {
    text?: string;
    alwaysVisible?: boolean;
}

export const AdBtn = ({ text = "Разместить объявление" , alwaysVisible = false}: AdBtnProps) => {
    const isAuthenticated = !!getAuthToken();

    // Получаем роль пользователя из localStorage
    const getUserRole = (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('userRole');
    };

    const userRole = getUserRole();

    if (!alwaysVisible && isAuthenticated && userRole === 'ROLE_MASTER') {
        return null;
    }

    return (
        <button className={styles.btn}>
            {text}
        </button>
    );
}