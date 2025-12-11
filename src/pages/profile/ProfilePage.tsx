import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import MasterProfilePage from './masterProfilePage/MasterProfilePage';
import ClientProfilePage from './clientProfilePage/ClientProfilePage';
import styles from './ProfilePage.module.scss';

function ProfilePage() {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState<'client' | 'master'>('master');
    const [isLoading, setIsLoading] = useState(true);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                // Здесь должна быть логика определения роли пользователя
                // Например, если у пользователя есть определенные поля или роли
                const role = userData.roles?.includes('ROLE_MASTER') ? 'master' : 'client';
                setUserRole(role);
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className={styles.profileSet}>Определение типа профиля...</div>;
    }

    return userRole === 'master' ? <MasterProfilePage /> : <ClientProfilePage />;
}

export default ProfilePage;