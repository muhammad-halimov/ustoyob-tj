import { useState, useEffect } from 'react';
import { getAuthToken, getUserRole } from '../../utils/auth';
import styles from './FavoritePage.module.scss';
import { useNavigate } from 'react-router-dom';
import {createChatWithAuthor} from "../../utils/chatUtils";

interface FavoriteTicket {
    id: number;
    title: string;
    price: number;
    unit: string;
    description: string;
    address: string;
    date: string;
    author: string;
    timeAgo: string;
    category: string;
    status: string;
    authorId: number;
    type: 'client' | 'master';
    authorImage?: string;
}

interface Master {
    id: number;
    email: string;
    bio: string;
    name: string;
    surname: string;
    image: string;
    categories: Array<{
        id: number;
        title: string;
    }>;
    districts: Array<{
        id: number;
        title: string;
        city: {
            id: number;
            title: string;
            province?: {
                id: number;
                title: string;
            };
        };
    }>;
    rating: number;
    reviewCount: number;
}

interface Favorite {
    id: number;
    user: { id: number };
    masters: Array<{
        id: number;
        name?: string;
        surname?: string;
        image?: string;
        categories?: Array<{ id: number; title: string }>;
        district?: { id: number; title: string; city: { title: string } };
        rating?: number;
        reviewCount?: number;
    }>;
    clients: Array<{
        id: number;
        name?: string;
        surname?: string;
        image?: string;
    }>;
    tickets: Array<{
        id: number;
        title: string;
        active: boolean;
        author: { id: number; name?: string; surname?: string; image?: string };
        master: { id: number; name?: string; surname?: string; image?: string };
        service: boolean;
    }>;
}

interface ApiTicket {
    id: number;
    title: string;
    description: string;
    budget: number;
    unit: { id: number; title: string };
    address: {
        title?: string;
        city?: { title?: string }
    } | null;
    district?: {
        title?: string;
        city?: { title?: string }
    } | null;
    createdAt: string;
    master: { id: number; name?: string; surname?: string; image?: string } | null;
    author: { id: number; name?: string; surname?: string; image?: string };
    category: { title: string };
    active: boolean;
    notice?: string;
    service: boolean;
    images?: { id: number; image: string }[];
}

const API_BASE_URL = 'https://admin.ustoyob.tj';

function FavoritesPage() {
    const [favoriteTickets, setFavoriteTickets] = useState<FavoriteTicket[]>([]);
    const [favoriteMasters, setFavoriteMasters] = useState<Master[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'masters'>('orders');
    const [likedMasters, setLikedMasters] = useState<number[]>([]);
    const [isLikeLoading, setIsLikeLoading] = useState<number | null>(null);
    const navigate = useNavigate();
    const userRole = getUserRole();

    // Состояния для модального окна отзыва
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);

    useEffect(() => {
        fetchFavorites();

        const handleFavoritesUpdate = () => {
            console.log('Favorites updated, refreshing...');
            fetchFavorites();
        };

        window.addEventListener('favoritesUpdated', handleFavoritesUpdate);

        return () => {
            window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
        };
    }, []);

    useEffect(() => {
        if (favoriteMasters.length > 0) {
            const masterIds = favoriteMasters.map(master => master.id);
            setLikedMasters(masterIds);
        }
    }, [favoriteMasters]);

    const formatProfileImageUrl = (imagePath: string): string => {
        if (!imagePath) return './profileTest.png';

        if (imagePath.startsWith('/images/profile_photos/')) {
            return `${API_BASE_URL}${imagePath}`;
        } else if (imagePath.startsWith('http')) {
            return imagePath;
        } else {
            return `${API_BASE_URL}/images/profile_photos/${imagePath}`;
        }
    };

    const fetchFavorites = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const favorite: Favorite = await response.json();
                console.log('Favorite data:', favorite);

                let tickets: FavoriteTicket[] = [];
                let masters: Master[] = [];

                // Обрабатываем ТОЛЬКО явно добавленные тикеты в избранное
                if (favorite.tickets && favorite.tickets.length > 0) {
                    console.log('Processing favorite tickets:', favorite.tickets);
                    for (const ticket of favorite.tickets) {
                        const ticketDetails = await fetchTicketDetails(ticket.id);
                        if (ticketDetails) {
                            tickets.push({
                                ...ticketDetails,
                                authorImage: ticket.author?.image ? formatProfileImageUrl(ticket.author.image) :
                                    ticket.master?.image ? formatProfileImageUrl(ticket.master.image) : undefined
                            });
                        }
                    }
                }

                // Обрабатываем избранных мастеров
                if (favorite.masters && favorite.masters.length > 0) {
                    console.log('Processing favorite masters:', favorite.masters);
                    for (const master of favorite.masters) {
                        const masterDetails = await fetchMasterDetails(master.id);
                        if (masterDetails) {
                            masters.push(masterDetails);
                        }
                    }
                }

                console.log('Final favorite tickets:', tickets);
                console.log('Final favorite masters:', masters);
                setFavoriteTickets(tickets);
                setFavoriteMasters(masters);
            } else if (response.status === 404) {
                console.log('No favorites found');
                setFavoriteTickets([]);
                setFavoriteMasters([]);
                setLikedMasters([]);
            } else {
                console.error('Error fetching favorites, status:', response.status);
                setFavoriteTickets([]);
                setFavoriteMasters([]);
                setLikedMasters([]);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
            setFavoriteTickets([]);
            setFavoriteMasters([]);
            setLikedMasters([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMasterDetails = async (masterId: number): Promise<Master | null> => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            const response = await fetch(`${API_BASE_URL}/api/users/masters/${masterId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const mastersData = await response.json();
                const master = Array.isArray(mastersData) ? mastersData[0] : mastersData;

                if (master) {
                    return {
                        id: master.id,
                        email: master.email || '',
                        name: master.name || '',
                        bio: master.bio || '',
                        surname: master.surname || '',
                        image: master.image || '',
                        categories: master.categories || [],
                        districts: master.districts || [],
                        rating: master.rating || 0,
                        reviewCount: master.reviewCount || 0
                    };
                }
            }
        } catch (error) {
            console.error(`Error fetching master details for ID ${masterId}:`, error);
        }
        return null;
    };

    const fetchTicketDetails = async (ticketId: number): Promise<FavoriteTicket | null> => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            const endpoints = [
                '/api/tickets/clients',
                '/api/tickets/masters'
            ];

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const ticketsData: ApiTicket[] = await response.json();
                        console.log(`Found ${ticketsData.length} tickets in ${endpoint}`);

                        // Ищем тикет по ID
                        const ticket = ticketsData.find(t => t.id === ticketId);

                        if (ticket) {
                            console.log(`Found ticket ${ticketId} in ${endpoint}:`, ticket);

                            const userType = endpoint.includes('masters') ? 'master' : 'client';
                            const authorId = userType === 'master'
                                ? ticket.master?.id || 0
                                : ticket.author?.id || 0;

                            return {
                                id: ticket.id,
                                title: ticket.title || 'Без названия',
                                price: ticket.budget || 0,
                                unit: ticket.unit?.title || 'tjs',
                                description: ticket.description || 'Описание отсутствует',
                                address: getFullAddress(ticket),
                                date: formatDate(ticket.createdAt),
                                author: userType === 'master'
                                    ? `${ticket.master?.name || ''} ${ticket.master?.surname || ''}`.trim() || 'Мастер'
                                    : `${ticket.author?.name || ''} ${ticket.author?.surname || ''}`.trim() || 'Клиент',
                                authorId: authorId,
                                timeAgo: getTimeAgo(ticket.createdAt),
                                category: ticket.category?.title || 'другое',
                                status: ticket.active ? 'В работе' : 'Завершен',
                                type: userType
                            };
                        }
                    } else {
                        console.log(`Error fetching from ${endpoint}, status:`, response.status);
                    }
                } catch (error) {
                    console.error(`Error fetching tickets from ${endpoint}:`, error);
                }
            }

            console.log(`Ticket with ID ${ticketId} not found in any endpoint`);
            return null;

        } catch (error) {
            console.error('Error fetching ticket details:', error);
            return null;
        }
    };

    const getFullAddress = (ticket: ApiTicket): string => {
        const districtCity = ticket.district?.city?.title || '';
        const addressTitle = ticket.address?.title || '';
        const addressCity = ticket.address?.city?.title || '';

        const city = districtCity || addressCity;

        if (city && addressTitle) {
            return `${city}, ${addressTitle}`;
        }
        if (city) {
            return city;
        }
        if (addressTitle) {
            return addressTitle;
        }
        return 'Адрес не указан';
    };

    const formatDate = (dateString: string) => {
        try {
            if (!dateString) return 'Дата не указана';
            return new Date(dateString).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return 'Дата не указана';
        }
    };

    const getTimeAgo = (dateString: string) => {
        try {
            if (!dateString) return 'недавно';
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (diffInSeconds < 60) return 'только что';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${getRussianWord(Math.floor(diffInSeconds / 60), ['минуту', 'минуты', 'минут'])} назад`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${getRussianWord(Math.floor(diffInSeconds / 3600), ['час', 'часа', 'часов'])} назад`;
            return `${Math.floor(diffInSeconds / 86400)} ${getRussianWord(Math.floor(diffInSeconds / 86400), ['день', 'дня', 'дней'])} назад`;
        } catch {
            return 'недавно';
        }
    };

    const getRussianWord = (number: number, words: [string, string, string]) => {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]];
    };

    const handleCardClick = (authorId?: number, ticketId?: number) => {
        if (!authorId || !ticketId) {
            console.log('No author ID or ticket ID available');
            return;
        }
        console.log('Navigating to ticket:', ticketId, 'of author:', authorId);
        navigate(`/order/${authorId}?ticket=${ticketId}`);
    };

    const handleLike = async (masterId: number) => {
        const token = getAuthToken();
        if (!token) {
            alert('Пожалуйста, войдите в систему чтобы добавить в избранное');
            return;
        }

        setIsLikeLoading(masterId);

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
                const currentFavorite = await currentFavoritesResponse.json();
                existingFavoriteId = currentFavorite.id;

                existingMasters = currentFavorite.masters?.map((master: any) => `/api/users/${master.id}`) || [];
                existingClients = currentFavorite.clients?.map((client: any) => `/api/users/${client.id}`) || [];
                existingTickets = currentFavorite.tickets?.map((ticket: any) => `/api/tickets/${ticket.id}`) || [];

                console.log('Existing favorites:', {
                    masters: existingMasters,
                    clients: existingClients,
                    tickets: existingTickets
                });
            }

            const favoriteIdToUse = existingFavoriteId;
            const masterIri = `/api/users/${masterId}`;

            // Проверяем, есть ли уже мастер в избранном
            const isCurrentlyLiked = existingMasters.includes(masterIri);

            if (isCurrentlyLiked) {
                // Удаляем мастера из избранного
                await handleUnlikeMaster(masterId, favoriteIdToUse, existingMasters, existingClients, existingTickets);
            } else {
                // Добавляем мастера в избранное
                await handleLikeMaster(masterId, favoriteIdToUse, existingMasters, existingClients, existingTickets);
            }

        } catch (error) {
            console.error('Error toggling master like:', error);
            alert('Ошибка при изменении избранного');
        } finally {
            setIsLikeLoading(null);
        }
    };

    const handleLikeMaster = async (masterId: number, favoriteId: number | null, existingMasters: string[], existingClients: string[], existingTickets: string[]) => {
        const token = getAuthToken();
        if (!token) return;

        const masterIri = `/api/users/${masterId}`;

        if (existingMasters.includes(masterIri)) {
            console.log('Master already in favorites');
            setLikedMasters(prev => [...prev, masterId]);
            return;
        }

        if (favoriteId) {
            const updateData: any = {
                masters: [...existingMasters, masterIri],
                clients: existingClients,
                tickets: existingTickets
            };

            console.log('Updating favorite with data:', updateData);

            const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${favoriteId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/merge-patch+json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            if (patchResponse.ok) {
                setLikedMasters(prev => [...prev, masterId]);
                console.log('Successfully added master to favorites');
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else {
                const errorText = await patchResponse.text();
                console.error('Failed to update favorite:', errorText);
                alert('Ошибка при добавлении в избранное');
            }
        } else {
            const createData: any = {
                masters: [masterIri],
                clients: [],
                tickets: []
            };

            console.log('Creating new favorite with data:', createData);

            const createResponse = await fetch(`${API_BASE_URL}/api/favorites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(createData)
            });

            if (createResponse.ok) {
                // Убрали неиспользуемую переменную newFavorite
                await createResponse.json(); // Просто читаем ответ, но не сохраняем в переменную
                setLikedMasters(prev => [...prev, masterId]);
                console.log('Successfully created favorite with master');
                window.dispatchEvent(new Event('favoritesUpdated'));
            } else {
                const errorText = await createResponse.text();
                console.error('Failed to create favorite:', errorText);
                alert('Ошибка при создании избранного');
            }
        }
    };

    const handleUnlikeMaster = async (masterId: number, favoriteId: number | null, existingMasters: string[], existingClients: string[], existingTickets: string[]) => {
        const token = getAuthToken();
        if (!favoriteId) return;

        const masterIri = `/api/users/${masterId}`;
        const updatedMasters = existingMasters.filter((master: string) => master !== masterIri);

        const updateData = {
            masters: updatedMasters,
            clients: existingClients,
            tickets: existingTickets
        };

        console.log("PATCH UNLIKE MASTER:", updateData);

        const patchResponse = await fetch(`${API_BASE_URL}/api/favorites/${favoriteId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/merge-patch+json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (patchResponse.ok) {
            setLikedMasters(prev => prev.filter(id => id !== masterId));
            console.log('Successfully removed master from favorites');
            window.dispatchEvent(new Event('favoritesUpdated'));

            // Обновляем список мастеров в избранном
            setFavoriteMasters(prev => prev.filter(master => master.id !== masterId));
        } else {
            console.error("PATCH error:", await patchResponse.text());
            alert('Ошибка при удалении из избранного');
        }
    };

    const getMasterAddress = (master: Master) => {
        const d = master.districts?.[0];
        if (!d) return 'Адрес не указан';

        const province = d.city?.province?.title || '';
        const city = d.city?.title || '';
        const district = d.title || '';

        return [province, city, district].filter(Boolean).join(', ');
    };


    const handleMasterChat = async (authorId: number) => {
        const chat = await createChatWithAuthor(authorId);
        if (chat) {
            navigate(`/chats?chatId=${chat.id}`);
        } else {
            alert('Не удалось создать чат');
        }
    };

    // Функции для модального окна отзыва
    const handleMasterReview = (masterId: number) => {
        setSelectedMasterId(masterId);
        setShowReviewModal(true);
    };

    const handleStarClick = (starCount: number) => {
        setSelectedStars(starCount);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setReviewPhotos(prev => [...prev, ...files]);
        }
    };

    const removePhoto = (index: number) => {
        setReviewPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleCloseModal = () => {
        setShowReviewModal(false);
        setReviewText('');
        setSelectedStars(0);
        setReviewPhotos([]);
        setSelectedMasterId(null);
    };

    const getCurrentUserId = async (): Promise<number | null> => {
        try {
            const token = getAuthToken();
            if (!token) return null;

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                return userData.id;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user ID:', error);
            return null;
        }
    };

    const uploadReviewPhotos = async (reviewId: number, photos: File[], token: string) => {
        try {
            console.log(`Uploading ${photos.length} photos for review ${reviewId}`);

            for (const photo of photos) {
                const formData = new FormData();
                formData.append('image', photo);

                console.log(`Uploading photo: ${photo.name}`);

                const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData
                });

                if (response.ok) {
                    const uploadResult = await response.json();
                    console.log('Photo uploaded successfully:', uploadResult);
                } else {
                    const errorText = await response.text();
                    console.error(`Error uploading photo for review ${reviewId}:`, errorText);
                }
            }

            console.log('All photos uploaded successfully');
        } catch (error) {
            console.error('Error uploading review photos:', error);
            throw error;
        }
    };

    const handleSubmitReview = async () => {
        if (!reviewText.trim()) {
            alert('Пожалуйста, напишите комментарий');
            return;
        }

        if (selectedStars === 0) {
            alert('Пожалуйста, поставьте оценку');
            return;
        }

        if (!selectedMasterId) {
            alert('Мастер не выбран');
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                alert('Необходима авторизация');
                return;
            }

            const currentUserId = await getCurrentUserId();

            if (!currentUserId) {
                alert('Не удалось определить пользователя');
                return;
            }

            // Для отзыва на мастера всегда используем тип client_to_master
            const reviewType = 'client_to_master';

            const reviewData = {
                type: reviewType,
                rating: selectedStars,
                description: reviewText,
                master: `/api/users/${selectedMasterId}`,
                client: `/api/users/${currentUserId}`
            };

            console.log('Sending review data:', reviewData);

            const response = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewData)
            });

            if (response.ok) {
                const reviewResponse = await response.json();
                console.log('Review created successfully:', reviewResponse);

                // Загружаем фото асинхронно
                if (reviewPhotos.length > 0) {
                    try {
                        await uploadReviewPhotos(reviewResponse.id, reviewPhotos, token);
                        console.log('All photos uploaded successfully');
                    } catch (uploadError) {
                        console.error('Error uploading photos, but review was created:', uploadError);
                        alert('Отзыв отправлен, но возникла ошибка при загрузке фото');
                    }
                }

                handleCloseModal();
                alert('Отзыв успешно отправлен!');

            } else {
                const errorText = await response.text();
                console.error('Error creating review. Status:', response.status, 'Response:', errorText);

                let errorMessage = 'Ошибка при отправке отзыва';
                if (response.status === 422) {
                    errorMessage = 'Ошибка валидации данных. Проверьте введенные данные.';
                } else if (response.status === 400) {
                    errorMessage = 'Неверные данные для отправки отзыва.';
                } else if (response.status === 404) {
                    errorMessage = 'Ресурс не найден. Возможно, мастер или пользователь не существуют.';
                }

                alert(errorMessage);
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Произошла непредвиденная ошибка при отправке отзыва');
        }
    };

    if (isLoading) {
        return <div className={styles.loading}>Загрузка избранного...</div>;
    }

    const showTabs = userRole === 'client';
    const hasOrders = favoriteTickets.length > 0;
    const hasMasters = favoriteMasters.length > 0;
    const hasNoFavorites = !hasOrders && !hasMasters;

    if (hasNoFavorites) {
        return (
            <div className={styles.recommendation}>
                <div className={styles.recommendation_wrap}>
                    <div className={styles.emptyState}>
                        <p>У вас пока нет избранных заказов</p>
                        <p>Добавляйте понравившиеся заказы в избранное, чтобы не потерять</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.recommendation}>
            {/* Переключатель только для клиентов */}
            {showTabs && (
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'orders' ? styles.active : ''}`}
                        onClick={() => setActiveTab('orders')}
                    >
                        Заказы
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'masters' ? styles.active : ''}`}
                        onClick={() => setActiveTab('masters')}
                    >
                        Мастера
                    </button>
                </div>
            )}

            <div className={styles.recommendation_wrap}>
                {/* Отображение заказов */}
                {(activeTab === 'orders' || !showTabs) && hasOrders && favoriteTickets.map((ticket, index) => (
                    <div
                        key={`${ticket.id}-${ticket.type}-${index}`}
                        className={styles.recommendation_item}
                        onClick={() => handleCardClick(ticket.authorId, ticket.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className={styles.recommendation_item_title}>
                            <h4>{ticket.title}</h4>
                            <span className={styles.recommendation_item_price}>
                                {ticket.price.toLocaleString('ru-RU')} {ticket.unit}
                            </span>
                        </div>
                        <div className={styles.recommendation_item_status}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_182_2657)">
                                    <g clipPath="url(#clip1_182_2657)">
                                        <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M11.9998 16.7698V10.0898H10.0898" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M10.0898 16.77H13.9098" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M11.0498 7.22998H12.9498" stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                </g>
                                <defs>
                                    <clipPath id="clip0_182_2657">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                    <clipPath id="clip1_182_2657">
                                        <rect width="24" height="24" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            <p>{ticket.status}</p>
                        </div>
                        <div className={styles.recommendation_item_description}>
                            <p>{ticket.description}</p>
                            <div className={styles.recommendation_item_inform}>
                                <div className={styles.recommendation_item_locate}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_1115)">
                                            <g clipPath="url(#clip1_324_1115)">
                                                <path d="M19.6404 9.14C19.6404 15.82 12.0004 22.5 12.0004 22.5C12.0004 22.5 4.36035 15.82 4.36035 9.14C4.36035 7.11375 5.16528 5.17048 6.59806 3.7377C8.03083 2.30493 9.9741 1.5 12.0004 1.5C14.0266 1.5 15.9699 2.30493 17.4026 3.7377C18.8354 5.17048 19.6404 7.11375 19.6404 9.14Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12.0006 11.9998C13.5802 11.9998 14.8606 10.7193 14.8606 9.13979C14.8606 7.56025 13.5802 6.27979 12.0006 6.27979C10.4211 6.27979 9.14062 7.56025 9.14062 9.13979C9.14062 10.7193 10.4211 11.9998 12.0006 11.9998Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_1115">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_1115">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p>{ticket.address}</p>
                                </div>
                                <div className={styles.recommendation_item_locate}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g clipPath="url(#clip0_324_2851)">
                                            <g clipPath="url(#clip1_324_2851)">
                                                <path d="M22.5205 3.37012H1.48047V8.15012H22.5205V3.37012Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M22.5205 8.15039H1.48047V22.5004H22.5205V8.15039Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M5.2998 12.9297H7.2198" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M9.12988 12.9297H11.0399" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12.96 12.9297H14.87" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M16.7803 12.9297H18.7003" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M16.7803 17.7197H18.7003" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M5.2998 17.7197H7.2198" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M9.12988 17.7197H11.0399" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12.96 17.7197H14.87" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M6.25977 0.5V5.28" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12 0.5V5.28" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M17.7402 0.5V5.28" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                                            </g>
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_324_2851">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            <clipPath id="clip1_324_2851">
                                                <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    <p>{ticket.date}</p>
                                </div>
                            </div>
                            <div className={styles.recommendation_item_who}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_324_2870)">
                                        <g clipPath="url(#clip1_324_2870)">
                                            <path d="M11.9995 12.9795C15.1641 12.9795 17.7295 10.4141 17.7295 7.24953C17.7295 4.08494 15.1641 1.51953 11.9995 1.51953C8.83494 1.51953 6.26953 4.08494 6.26953 7.24953C6.26953 10.4141 8.83494 12.9795 11.9995 12.9795Z" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_324_2870">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_324_2870">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                                <p>{ticket.author}</p>
                            </div>
                            <span className={styles.recommendation_item_time}>{ticket.timeAgo}</span>
                        </div>
                    </div>
                ))}

                {/* Отображение мастеров */}
                {activeTab === 'masters' && showTabs && hasMasters && favoriteMasters.map((master) => (
                    <div key={master.id} className={styles.masterCard}>
                        <div className={styles.mastersList_header}>
                            <img
                                src={formatProfileImageUrl(master.image)}
                                alt={master.name}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = './profileTest.png';
                                }}
                            />
                            <div className={styles.mastersList_title}>
                                <h3>{master.surname} {master.name}</h3>
                                <div className={styles.mastersList_title_reviews}>
                                    <div className={styles.mastersList_title_grade}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                                                  fill="#FFD700" stroke="#FFD700"/>
                                        </svg>
                                        <span>{master.rating || 'Нет оценок'}</span>
                                    </div>
                                    <div className={styles.mastersList_title_review}>
                                        <p><span>{master.reviewCount || 0}</span> Отзывов</p>
                                    </div>
                                </div>
                                <div className={styles.categories}>
                                    {master.categories?.map(cat => (
                                        <span key={cat.id} className={styles.categoryTag}>
                                            {cat.title}
                                        </span>
                                    ))}
                                </div>
                                <div className={styles.mastersList_title_btns}>
                                    <button
                                        className={styles.chatButton}
                                        onClick={() => handleMasterChat(master.id)}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 1.5C6.2 1.5 1.5 5.77 1.5 11.02C1.52866 13.0353 2.23294 14.9826 3.5 16.55L2.5 21.55L9.16 20.22C10.1031 20.4699 11.0744 20.5976 12.05 20.6C17.85 20.6 22.55 16.32 22.55 11.05C22.55 5.78 17.8 1.5 12 1.5Z"
                                                  stroke="#FFFFFF" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                        Написать
                                    </button>
                                    <button
                                        className={styles.reviewButton}
                                        onClick={() => handleMasterReview(master.id)}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2.5L15.09 8.76L22 9.77L17 14.64L18.18 21.52L12 18.27L5.82 21.52L7 14.64L2 9.77L8.91 8.76L12 2.5Z"
                                                  stroke="black" strokeWidth="2" strokeMiterlimit="10"/>
                                        </svg>
                                        Оставить отзыв
                                    </button>
                                </div>
                            </div>

                            {/* Кнопка лайка */}
                            <button
                                className={`${styles.container_like} ${isLikeLoading === master.id ? styles.loading : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLike(master.id);
                                }}
                                disabled={isLikeLoading === master.id}
                                title={likedMasters.includes(master.id) ? "Удалить из избранного" : "Добавить в избранное"}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M16.77 2.45C15.7961 2.47092 14.8444 2.74461 14.0081 3.24424C13.1719 3.74388 12.4799 4.45229 12 5.3C11.5201 4.45229 10.8281 3.74388 9.99186 3.24424C9.15563 2.74461 8.2039 2.47092 7.23 2.45C4.06 2.45 1.5 5.3 1.5 8.82C1.5 15.18 12 21.55 12 21.55C12 21.55 22.5 15.18 22.5 8.82C22.5 5.3 19.94 2.45 16.77 2.45Z"
                                        fill={likedMasters.includes(master.id) ? "#3A54DA" : "none"}
                                        stroke="#3A54DA"
                                        strokeWidth="2"
                                        strokeMiterlimit="10"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className={styles.mastersList_about}>
                            <p className={styles.mastersList_about_welcome}>О мастере</p>
                            <p className={styles.mastersList_about_title}>
                                {master.bio || 'Нет информации'}
                            </p>

                            <div className={styles.mastersList_about_atHome}>
                                <p>Мастер принимает у себя</p>
                                <div className={styles.mastersList_about_atHome_addresses}>
                                    <span>Адрес: {getMasterAddress(master)}</span>
                                </div>
                            </div>

                            <div className={styles.mastersList_about_departure}>
                                <p>Мастер готов приехать</p>
                                <div className={styles.mastersList_about_atHome_addresses}>
                                    <span>По всему городу</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Модальное окно отзыва */}
            {showReviewModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.reviewModal}>
                        <div className={styles.modalHeader}>
                            <h2>Оставьте отзыв о мастере</h2>
                        </div>

                        <div className={styles.modalContent}>
                            {/* Поле для комментария */}
                            <div className={styles.commentSection}>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Расскажите о вашем опыте работы с мастером..."
                                    className={styles.commentTextarea}
                                />
                            </div>

                            {/* Загрузка фото */}
                            <div className={styles.photoSection}>
                                <label>Приложите фото</label>
                                <div className={styles.photoUploadContainer}>
                                    {/* Превью загруженных фото */}
                                    <div className={styles.photoPreviews}>
                                        {reviewPhotos.map((photo, index) => (
                                            <div key={index} className={styles.photoPreview}>
                                                <img
                                                    src={URL.createObjectURL(photo)}
                                                    alt={`Preview ${index + 1}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(index)}
                                                    className={styles.removePhoto}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}

                                        {/* Кнопка добавления фото (всегда справа) */}
                                        <div className={styles.photoUpload}>
                                            <input
                                                type="file"
                                                id="review-photos"
                                                multiple
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                className={styles.fileInput}
                                            />
                                            <label htmlFor="review-photos" className={styles.photoUploadButton}>
                                                +
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Рейтинг звездами */}
                            <div className={styles.ratingSection}>
                                <label>Поставьте оценку</label>
                                <div className={styles.stars}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`${styles.star} ${star <= selectedStars ? styles.active : ''}`}
                                            onClick={() => handleStarClick(star)}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                <g clipPath="url(#clip0_248_13358)">
                                                    <path d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                    <path d="M12 19V18.98" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                </g>
                                                <defs>
                                                    <clipPath id="clip0_248_13358">
                                                        <rect width="24" height="24" fill="white"/>
                                                    </clipPath>
                                                </defs>
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Кнопки модалки */}
                        <div className={styles.modalActions}>
                            <button
                                className={styles.closeButton}
                                onClick={handleCloseModal}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_551_2371)">
                                        <g clipPath="url(#clip1_551_2371)">
                                            <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M16.7705 7.22998L7.23047 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                            <path d="M7.23047 7.22998L16.7705 16.77" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                        </g>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_551_2371">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                        <clipPath id="clip1_551_2371">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                                Закрыть
                            </button>
                            <button
                                className={styles.submitButton}
                                onClick={handleSubmitReview}
                            >
                                Отправить
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_551_2758)">
                                        <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M6.26953 12H17.7295" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                        <path d="M12.96 7.22998L17.73 12L12.96 16.77" stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_551_2758">
                                            <rect width="24" height="24" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FavoritesPage;