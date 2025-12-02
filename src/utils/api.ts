import { getAuthToken } from './auth';

const API_BASE_URL = 'https://admin.ustoyob.tj';

// Универсальная функция для получения пользователя по ID
export const fetchUserById = async (userId: number): Promise<any | null> => {
    try {
        const token = getAuthToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        console.log(`Fetching user by ID: ${userId}`);

        // Пробуем прямой endpoint
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            method: 'GET',
            headers
        });

        if (response.ok) {
            const userData = await response.json();
            console.log(`User ${userId} found:`, userData);
            return userData;
        }

        // Если не найден, пробуем через список
        console.log(`User ${userId} not found directly, trying filtered search...`);
        return await findUserInList(userId, headers);
    } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        return null;
    }
};

// Поиск пользователя в списке
const findUserInList = async (userId: number, headers: HeadersInit): Promise<any | null> => {
    try {
        // Пробуем разные варианты фильтрации
        const urls = [
            `${API_BASE_URL}/api/users?roles[]=ROLE_MASTER`,
            `${API_BASE_URL}/api/users?roles[]=ROLE_CLIENT`,
            `${API_BASE_URL}/api/users`
        ];

        for (const url of urls) {
            try {
                console.log(`Trying URL: ${url}`);
                const response = await fetch(url, { headers });

                if (response.ok) {
                    const data = await response.json();
                    const usersArray = extractUsersArray(data);

                    const user = usersArray.find((u: any) => u.id === userId);
                    if (user) {
                        console.log(`Found user ${userId} in list`);
                        return user;
                    }
                }
            } catch (e) {
                console.warn(`Failed with URL ${url}:`, e);
            }
        }

        console.log(`User ${userId} not found in any list`);
        return null;
    } catch (error) {
        console.error('Error finding user in list:', error);
        return null;
    }
};

// Извлечение массива пользователей из разных форматов ответа
const extractUsersArray = (data: any): any[] => {
    if (Array.isArray(data)) {
        return data;
    }

    if (data && typeof data === 'object') {
        if (data['hydra:member'] && Array.isArray(data['hydra:member'])) {
            return data['hydra:member'];
        }

        if (data.id) {
            return [data];
        }
    }

    return [];
};

// Получение пользователя с определением его роли
export const fetchUserWithRole = async (userId: number): Promise<{ user: any | null, role: 'master' | 'client' | null }> => {
    const user = await fetchUserById(userId);

    if (!user) {
        return { user: null, role: null };
    }

    // Определяем роль пользователя
    let role: 'master' | 'client' | null = null;
    if (user.roles && Array.isArray(user.roles)) {
        if (user.roles.includes('ROLE_MASTER')) {
            role = 'master';
        } else if (user.roles.includes('ROLE_CLIENT')) {
            role = 'client';
        }
    }

    return { user, role };
};