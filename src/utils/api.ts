import { getAuthToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Интерфейсы для типизации
export interface ApiUser {
    id: number;
    email: string;
    name: string;
    surname: string;
    roles: string[];
    approved?: boolean;
    active?: boolean;
    image?: string;
    occupation?: Array<{
        id: number;
        title: string;
        [key: string]: unknown;
    }>;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface HydraResponse<T> {
    'hydra:member': T[];
    'hydra:totalItems': number;
    'hydra:view'?: {
        'hydra:first': string;
        'hydra:last': string;
        'hydra:next'?: string;
        'hydra:previous'?: string;
    };
    [key: string]: unknown;
}

export interface UserWithRole {
    user: ApiUser | null;
    role: 'master' | 'client' | null;
}

type ApiResponseData = ApiUser | ApiUser[] | HydraResponse<ApiUser>;

export const fetchUserById = async (userId: number): Promise<ApiUser | null> => {
    try {
        const token = getAuthToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        console.log(`Fetching user by ID: ${userId}`);

        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            method: 'GET',
            headers
        });

        if (response.ok) {
            const userData: ApiUser = await response.json();
            console.log(`User ${userId} found:`, userData);
            return userData;
        }

        console.log(`User ${userId} not found directly, trying filtered search...`);
        return await findUserInList(userId, headers);
    } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        return null;
    }
};

const findUserInList = async (userId: number, headers: HeadersInit): Promise<ApiUser | null> => {
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
                    const data: ApiResponseData = await response.json();
                    const usersArray = extractUsersArray(data);

                    const user = usersArray.find((u: ApiUser) => u.id === userId);
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

const extractUsersArray = (data: ApiResponseData): ApiUser[] => {
    if (Array.isArray(data)) {
        return data as ApiUser[];
    }

    if (data && typeof data === 'object') {
        // Если это Hydra-ответ
        if ('hydra:member' in data && Array.isArray((data as HydraResponse<ApiUser>)['hydra:member'])) {
            return (data as HydraResponse<ApiUser>)['hydra:member'];
        }

        // Если это один объект пользователя
        if ('id' in data && typeof (data as ApiUser).id === 'number') {
            return [data as ApiUser];
        }
    }

    return [];
};

export const fetchUserWithRole = async (userId: number): Promise<UserWithRole> => {
    const user = await fetchUserById(userId);

    if (!user) {
        return { user: null, role: null };
    }

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

export const getUserFullName = (user: ApiUser): string => {
    const name = user.name || '';
    const surname = user.surname || '';
    const fullName = `${name} ${surname}`.trim();
    return fullName || user.email || 'Пользователь';
};

export const isUserApproved = (user: ApiUser): boolean => {
    return user.approved === true;
};

export const isUserActive = (user: ApiUser): boolean => {
    return user.active !== false; // Считаем активным, если явно не указано false
};

export const getUserRoleFromRoles = (roles: string[]): 'master' | 'client' | null => {
    if (roles.includes('ROLE_MASTER')) {
        return 'master';
    } else if (roles.includes('ROLE_CLIENT')) {
        return 'client';
    }
    return null;
};