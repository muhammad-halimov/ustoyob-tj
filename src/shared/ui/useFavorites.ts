import { useState, useCallback } from 'react';
import { getAuthToken } from '../../utils/auth';
import { getStorageJSON, setStorageJSON } from '../../utils/storageHelper';

interface Favorite {
    id: number;
    tickets?: { id: number }[];
    masters?: { id: number }[];
    clients?: { id: number }[];
}

interface LocalStorageFavorites {
    masters: number[];
    tickets: number[];
}

interface UseFavoritesProps {
    itemId: number;
    itemType: 'ticket' | 'master';
    onSuccess?: () => void;
    onError?: (message: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useFavorites = ({ itemId, itemType, onSuccess, onError }: UseFavoritesProps) => {
    const [isLiked, setIsLiked] = useState(false);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [favoriteId, setFavoriteId] = useState<number | null>(null);

    const loadLocalStorageFavorites = (): LocalStorageFavorites => {
        try {
            const stored = getStorageJSON<LocalStorageFavorites>('favorites');
            if (stored) {
                return stored;
            }
        } catch (error) {
            console.error('Error loading favorites from localStorage:', error);
        }
        return { masters: [], tickets: [] };
    };

    const saveLocalStorageFavorites = (favorites: LocalStorageFavorites) => {
        try {
            setStorageJSON('favorites', favorites);
        } catch (error) {
            console.error('Error saving favorites to localStorage:', error);
        }
    };

    // Функция для получения текущих избранных через API
    const getCurrentFavorites = useCallback(async (token: string) => {
        const response = await fetch(`${API_BASE_URL}/api/favorites/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch favorites: ${response.status}`);
        }

        const currentFavorite: Favorite = await response.json();
        console.log('🔍 Raw data from API:', currentFavorite);
        
        const result = {
            favoriteId: currentFavorite.id,
            masters: currentFavorite.masters?.map((m: { id: number }) => `/api/users/${m.id}`) || [],
            clients: currentFavorite.clients?.map((c: { id: number }) => `/api/users/${c.id}`) || [],
            tickets: currentFavorite.tickets?.map((t: { id: number }) => `/api/tickets/${t.id}`) || []
        };

        console.log('🔍 Processed favorites:', result);
        return result;
    }, []);

    const checkFavoriteStatus = useCallback(async () => {
        const token = getAuthToken();
        if (!token) {
            // Проверяем localStorage для неавторизованных
            const localFavorites = loadLocalStorageFavorites();
            const items = itemType === 'ticket' ? localFavorites.tickets : localFavorites.masters;
            setIsLiked(items.includes(itemId));
            return;
        }

        try {
            const currentFavorites = await getCurrentFavorites(token);
            const items = itemType === 'ticket' ? currentFavorites.tickets : currentFavorites.masters;
            const itemIri = itemType === 'ticket' ? `/api/tickets/${itemId}` : `/api/users/${itemId}`;
            const isItemInFavorites = items.includes(itemIri);
            
            setIsLiked(isItemInFavorites);
            setFavoriteId(currentFavorites.favoriteId);
        } catch (error) {
            // Если у пользователя нет записи favorites (404), это нормально
            setIsLiked(false);
            setFavoriteId(null);
        }
    }, [itemId, itemType, getCurrentFavorites]);

    const handleUnlike = async () => {
        if (!favoriteId) return;

        setIsLikeLoading(true);
        try {
            const token = getAuthToken();
            if (!token) return;

            const currentFavorites = await getCurrentFavorites(token);

            const removeIri = itemType === 'ticket' ? `/api/tickets/${itemId}` : `/api/users/${itemId}`;
            const updatedTickets = itemType === 'ticket' 
                ? currentFavorites.tickets.filter((ticketIri: string) => ticketIri !== removeIri)
                : currentFavorites.tickets;
            const updatedMasters = itemType === 'master'
                ? currentFavorites.masters.filter((masterIri: string) => masterIri !== removeIri)
                : currentFavorites.masters;

            const updateData = {
                masters: updatedMasters,
                clients: currentFavorites.clients,
                tickets: updatedTickets
            };

            const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${currentFavorites.favoriteId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/merge-patch+json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            if (patchResponse.ok) {
                setIsLiked(false);
                setFavoriteId(null);
                window.dispatchEvent(new Event('favoritesUpdated'));
                if (onSuccess) onSuccess();
            } else {
                if (onError) onError('Ошибка при удалении из избранного');
            }

        } catch (error) {
            console.error('Error removing from favorites:', error);
            if (onError) onError('Ошибка при удалении из избранного');
        } finally {
            setIsLikeLoading(false);
        }
    };

    const handleLikeClick = async () => {
        const token = getAuthToken();

        // Для неавторизованных пользователей работаем с localStorage
        if (!token) {
            const localFavorites = loadLocalStorageFavorites();
            const items = itemType === 'ticket' ? localFavorites.tickets : localFavorites.masters;
            const isCurrentlyLiked = items.includes(itemId);

            if (isCurrentlyLiked) {
                // Снимаем лайк
                const updatedItems = items.filter(id => id !== itemId);
                const updatedFavorites = {
                    ...localFavorites,
                    [itemType === 'ticket' ? 'tickets' : 'masters']: updatedItems
                };
                saveLocalStorageFavorites(updatedFavorites);
                setIsLiked(false);
            } else {
                // Ставим лайк
                const updatedItems = [...items, itemId];
                const updatedFavorites = {
                    ...localFavorites,
                    [itemType === 'ticket' ? 'tickets' : 'masters']: updatedItems
                };
                saveLocalStorageFavorites(updatedFavorites);
                setIsLiked(true);
            }
            window.dispatchEvent(new Event('favoritesUpdated'));
            return;
        }

        if (isLiked && favoriteId) {
            await handleUnlike();
            return;
        }

        setIsLikeLoading(true);
        try {
            let currentFavorites;
            
            try {
                currentFavorites = await getCurrentFavorites(token);
                console.log('🔍 Current favorites before adding:', currentFavorites);
            } catch (error) {
                console.log('🔍 No existing favorites found, creating new');
                // Если у пользователя нет записи favorites (404), создаем новую
                const createData = {
                    masters: itemType === 'master' ? [`/api/users/${itemId}`] : [],
                    clients: [],
                    tickets: itemType === 'ticket' ? [`/api/tickets/${itemId}`] : []
                };

                console.log('🔍 Creating new favorites:', createData);

                const createResponse = await fetch(`${API_BASE_URL}/api/favorites`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(createData)
                });

                if (createResponse.ok) {
                    const newFavorite = await createResponse.json();
                    console.log('🔍 Created new favorite:', newFavorite);
                    setIsLiked(true);
                    setFavoriteId(newFavorite.id);
                    window.dispatchEvent(new Event('favoritesUpdated'));
                    if (onSuccess) onSuccess();
                } else {
                    console.error('❌ Failed to create favorites:', createResponse.status);
                    if (onError) onError('Ошибка при создании избранного');
                }
                return;
            }
            
            const itemIri = itemType === 'ticket' ? `/api/tickets/${itemId}` : `/api/users/${itemId}`;
            const existingItems = itemType === 'ticket' ? currentFavorites.tickets : currentFavorites.masters;

            console.log('🔍 Item IRI to add:', itemIri);
            console.log('🔍 Existing items of this type:', existingItems);

            // Проверяем, что элемент еще не в избранном
            if (existingItems.includes(itemIri)) {
                console.log(`✅ ${itemType} already in favorites`);
                setIsLiked(true);
                setFavoriteId(currentFavorites.favoriteId);
                return;
            }

            // Добавляем новый элемент к существующим
            const updateData = {
                masters: itemType === 'master' ? [...currentFavorites.masters, itemIri] : currentFavorites.masters,
                clients: currentFavorites.clients, // Сохраняем существующих заказчиков без изменений
                tickets: itemType === 'ticket' ? [...currentFavorites.tickets, itemIri] : currentFavorites.tickets
            };

            console.log('🔍 Update data to send:', updateData);
            console.log('🔍 Favorites ID:', currentFavorites.favoriteId);

            const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${currentFavorites.favoriteId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/merge-patch+json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            console.log('🔍 PATCH response status:', patchResponse.status);

            if (patchResponse.ok) {
                const updatedFavorite = await patchResponse.json();
                console.log('🔍 Updated favorite from server:', updatedFavorite);
                setIsLiked(true);
                setFavoriteId(currentFavorites.favoriteId);
                window.dispatchEvent(new Event('favoritesUpdated'));
                if (onSuccess) onSuccess();
            } else {
                const errorText = await patchResponse.text();
                console.error('❌ PATCH failed:', patchResponse.status, errorText);
                if (onError) onError('Ошибка при добавлении в избранное');
            }

        } catch (error) {
            console.error('Error adding to favorites:', error);
            if (onError) onError('Ошибка при добавлении в избранное');
        } finally {
            setIsLikeLoading(false);
        }
    };

    return {
        isLiked,
        isLikeLoading,
        handleLikeClick,
        checkFavoriteStatus,
        setIsLiked
    };
};
