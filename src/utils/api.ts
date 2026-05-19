import { getAuthToken } from './auth';
import type { User } from '../entities';
import type { HydraResponse } from '../entities';
import { API_BASE_URL } from './config';

export interface UserWithRole {
    user: User | null;
    role: 'master' | 'client' | null;
}

type ApiResponseData = User | User[] | HydraResponse<User>;

export const fetchUserById = async (userId: number): Promise<User | null> => {
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
            const userData: User = await response.json();
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

const findUserInList = async (userId: number, headers: HeadersInit): Promise<User | null> => {
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

                    const user = usersArray.find((u: User) => u.id === userId);
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

const extractUsersArray = (data: ApiResponseData): User[] => {
    if (Array.isArray(data)) {
        return data as User[];
    }

    if (data && typeof data === 'object') {
        if ('hydra:member' in data && Array.isArray((data as HydraResponse<User>)['hydra:member'])) {
            return (data as HydraResponse<User>)['hydra:member'];
        }

        if ('id' in data) {
            return [data as User];
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

export const getUserFullName = (user: User): string => {
    const name = user.name || '';
    const surname = user.surname || '';
    const fullName = `${surname} ${name}`.trim();
    return fullName || user.email || 'Пользователь';
};

export const isUserApproved = (user: User): boolean => {
    return user.approved === true;
};

export const isUserActive = (user: User): boolean => {
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