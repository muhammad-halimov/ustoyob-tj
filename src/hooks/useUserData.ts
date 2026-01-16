import { useState, useCallback } from 'react';
import { makeApiRequest, getCurrentUserId } from '../utils/apiHelper';
import { getAvatarUrl } from '../utils/imageHelper';

export const useUserData = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUser = useCallback(async (userId: number) => {
        setIsLoading(true);
        setError(null);

        try {
            const userData = await makeApiRequest(`/api/users/${userId}`, {
                requiresAuth: false
            });

            // Проверка роли, если доступен токен
            // (можно вынести в отдельную функцию если нужно)

            return userData;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchUserWithAvatar = useCallback(
        async (userId: number, userType: 'master' | 'client') => {
            const userData = await fetchUser(userId);
            if (!userData) return null;

            const avatarUrl = await getAvatarUrl(userData, userType);
            return { ...userData, avatarUrl };
        },
        [fetchUser]
    );

    return {
        isLoading,
        error,
        fetchUser,
        fetchUserWithAvatar,
        getCurrentUserId
    };
};