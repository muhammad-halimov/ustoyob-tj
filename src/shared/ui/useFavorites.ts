import { useState, useCallback } from 'react';
import { getAuthToken } from '../../utils/auth';

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
            const stored = localStorage.getItem('favorites');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading favorites from localStorage:', error);
        }
        return { masters: [], tickets: [] };
    };

    const saveLocalStorageFavorites = (favorites: LocalStorageFavorites) => {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        } catch (error) {
            console.error('Error saving favorites to localStorage:', error);
        }
    };

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
            const response = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const favorite: Favorite = await response.json();
                const items = itemType === 'ticket' ? favorite.tickets : favorite.masters;
                const isItemInFavorites = items?.some((item: { id: number }) => item.id === itemId);
                setIsLiked(!!isItemInFavorites);

                if (isItemInFavorites) {
                    setFavoriteId(favorite.id);
                } else {
                    setFavoriteId(favorite.id);
                }
            } else if (response.status === 404) {
                setIsLiked(false);
                setFavoriteId(null);
            }
        } catch (error) {
            console.error('Error checking favorite status:', error);
        }
    }, [itemId, itemType]);

    const handleUnlike = async () => {
        if (!favoriteId) return;

        setIsLikeLoading(true);
        try {
            const token = getAuthToken();

            const currentFavoritesResponse = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!currentFavoritesResponse.ok) return;

            const currentFavorite: Favorite = await currentFavoritesResponse.json();

            const newMasters = currentFavorite.masters?.map((m: { id: number }) => `/api/users/${m.id}`) || [];
            const newClients = currentFavorite.clients?.map((c: { id: number }) => `/api/users/${c.id}`) || [];
            const newTickets = currentFavorite.tickets?.map((t: { id: number }) => `/api/tickets/${t.id}`) || [];

            const removeIri = itemType === 'ticket' ? `/api/tickets/${itemId}` : `/api/users/${itemId}`;
            const updatedTickets = itemType === 'ticket' 
                ? newTickets.filter((ticketIri: string) => ticketIri !== removeIri)
                : newTickets;
            const updatedMasters = itemType === 'master'
                ? newMasters.filter((masterIri: string) => masterIri !== removeIri)
                : newMasters;

            const updateData = {
                masters: updatedMasters,
                clients: newClients,
                tickets: updatedTickets
            };

            const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${currentFavorite.id}`, {
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
                saveLocalStorageFavorites({
                    ...localFavorites,
                    [itemType === 'ticket' ? 'tickets' : 'masters']: updatedItems
                });
                setIsLiked(false);
            } else {
                // Ставим лайк
                const updatedItems = [...items, itemId];
                saveLocalStorageFavorites({
                    ...localFavorites,
                    [itemType === 'ticket' ? 'tickets' : 'masters']: updatedItems
                });
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
            const currentFavoritesResponse = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            let existingFavoriteId: number | null = null;
            let existingMasters: string[] = [];
            let existingClients: string[] = [];
            let existingTickets: string[] = [];

            if (currentFavoritesResponse.ok) {
                const currentFavorite: Favorite = await currentFavoritesResponse.json();
                existingFavoriteId = currentFavorite.id;

                existingMasters = currentFavorite.masters?.map((master: { id: number }) => `/api/users/${master.id}`) || [];
                existingClients = currentFavorite.clients?.map((client: { id: number }) => `/api/users/${client.id}`) || [];
                existingTickets = currentFavorite.tickets?.map((ticket: { id: number }) => `/api/tickets/${ticket.id}`) || [];
            }

            const favoriteIdToUse = existingFavoriteId;
            const itemIri = itemType === 'ticket' ? `/api/tickets/${itemId}` : `/api/users/${itemId}`;
            const existingItems = itemType === 'ticket' ? existingTickets : existingMasters;

            if (existingItems.includes(itemIri)) {
                console.log(`${itemType} already in favorites`);
                setIsLiked(true);
                return;
            }

            if (favoriteIdToUse) {
                const updateData = {
                    masters: itemType === 'master' ? [...existingMasters, itemIri] : existingMasters,
                    clients: existingClients,
                    tickets: itemType === 'ticket' ? [...existingTickets, itemIri] : existingTickets
                };

                const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${favoriteIdToUse}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/merge-patch+json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });

                if (patchResponse.ok) {
                    setIsLiked(true);
                    setFavoriteId(favoriteIdToUse);
                    window.dispatchEvent(new Event('favoritesUpdated'));
                    if (onSuccess) onSuccess();
                } else {
                    if (onError) onError('Ошибка при добавлении в избранное');
                }
            } else {
                const createData = {
                    masters: itemType === 'master' ? [itemIri] : [],
                    clients: [],
                    tickets: itemType === 'ticket' ? [itemIri] : []
                };

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
                    setIsLiked(true);
                    setFavoriteId(newFavorite.id);
                    window.dispatchEvent(new Event('favoritesUpdated'));
                    if (onSuccess) onSuccess();
                } else {
                    if (onError) onError('Ошибка при создании избранного');
                }
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
