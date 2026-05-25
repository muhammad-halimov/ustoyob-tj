import type { User } from '../entities';
import type { HydraResponse } from '../entities';
import { universalApiRequest } from './apiHelper';

export interface UserWithRole {
    user: User | null;
    role: 'master' | 'client' | null;
}

type ApiResponseData = User | User[] | HydraResponse<User>;

const extractUsersArray = (data: ApiResponseData): User[] => {
    if (Array.isArray(data)) return data as User[];
    if (data && typeof data === 'object') {
        if ('hydra:member' in data && Array.isArray((data as HydraResponse<User>)['hydra:member']))
            return (data as HydraResponse<User>)['hydra:member'];
        if ('id' in data) return [data as User];
    }
    return [];
};

export const fetchUserById = async (userId: number): Promise<User | null> => {
    try {
        return await universalApiRequest(`/api/users/${userId}`, { locale: false }) as User;
    } catch {
        // Fallback: search in list
        for (const endpoint of ['/api/users?roles[]=ROLE_MASTER', '/api/users?roles[]=ROLE_CLIENT', '/api/users']) {
            try {
                const data: ApiResponseData = await universalApiRequest(endpoint, { locale: false });
                const user = extractUsersArray(data).find(u => u.id === userId);
                if (user) return user;
            } catch { /* try next */ }
        }
        return null;
    }
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