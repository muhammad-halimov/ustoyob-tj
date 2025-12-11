import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from './SearchServicePage.module.scss';
import { createChatWithAuthor } from '../../utils/chatUtils';

interface Master {
    id: number;
    email: string;
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
            title: string;
        };
    }>;
    rating: number;
    reviewCount: number;
    bio: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SearchServicePage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [masters, setMasters] = useState<Master[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [likedMasters, setLikedMasters] = useState<number[]>([]);
    const [isLikeLoading, setIsLikeLoading] = useState<number | null>(null);

    // Состояния для модального окна отзыва
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);

    const categoryId = searchParams.get('category');
    const source = searchParams.get('source');

    useEffect(() => {
        fetchMastersByCategory();
        checkFavoriteStatus();
    }, [categoryId]);

    const checkFavoriteStatus = async () => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/favorites/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const favorite = await response.json();
                const masterIds = favorite.masters?.map((master: any) => master.id) || [];
                setLikedMasters(masterIds);
            }
        } catch (error) {
            console.error('Error checking favorite status:', error);
        }
    };

    const fetchMastersByCategory = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            const url = `${API_BASE_URL}/api/users/masters`;

            console.log('Fetching masters from:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                let mastersData: Master[] = await response.json();
                console.log('Received masters:', mastersData);

                if (categoryId) {
                    mastersData = mastersData.filter(master =>
                        master.categories?.some(cat => cat.id.toString() === categoryId)
                    );
                    console.log('Filtered masters by category:', mastersData);
                }

                setMasters(mastersData);
            } else {
                console.error('Error fetching masters, status:', response.status);
                setMasters([]);
            }
        } catch (error) {
            console.error('Error fetching masters:', error);
            setMasters([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Функции для работы с лайками
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
            }

            const masterIri = `/api/users/${masterId}`;
            const isCurrentlyLiked = existingMasters.includes(masterIri);

            if (isCurrentlyLiked) {
                await handleUnlikeMaster(masterId, existingFavoriteId, existingMasters, existingClients, existingTickets);
            } else {
                await handleLikeMaster(masterId, existingFavoriteId, existingMasters, existingClients, existingTickets);
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

        if (favoriteId) {
            const updateData: any = {
                masters: [...existingMasters, masterIri],
                clients: existingClients,
                tickets: existingTickets
            };

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

            const createResponse = await fetch(`${API_BASE_URL}/api/favorites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(createData)
            });

            if (createResponse.ok) {
                await createResponse.json();
                setLikedMasters(prev => [...prev, masterId]);
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
            window.dispatchEvent(new Event('favoritesUpdated'));
        } else {
            console.error("PATCH error:", await patchResponse.text());
            alert('Ошибка при удалении из избранного');
        }
    };

    // Функции для чата
    const handleMasterChat = async (masterId: number) => {
        const chat = await createChatWithAuthor(masterId);
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
            for (const photo of photos) {
                const formData = new FormData();
                formData.append('image', photo);

                const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Error uploading photo for review ${reviewId}:`, errorText);
                }
            }
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

            const reviewData = {
                type: 'master',
                rating: selectedStars,
                description: reviewText,
                master: `/api/users/${selectedMasterId}`,
                client: `/api/users/${currentUserId}`
            };

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

                if (reviewPhotos.length > 0) {
                    try {
                        await uploadReviewPhotos(reviewResponse.id, reviewPhotos, token);
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
                alert('Ошибка при отправке отзыва');
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Произошла непредвиденная ошибка при отправке отзыва');
        }
    };

    const handleMasterClick = (masterId: number) => {
        navigate(`/master/${masterId}`);
    };

    const handleClose = () => {
        navigate('/my-tickets');
    };

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

    const getPageTitle = () => {
        if (categoryId) {
            return 'Мастера по выбранной категории';
        }
        return 'Все мастера';
    };

    const getMasterAddress = (master: Master) => {
        const district = master.districts?.[0];
        if (!district) return 'Адрес не указан';

        const city = district.city?.title || '';
        const districtTitle = district.title || '';

        return [city, districtTitle].filter(Boolean).join(', ');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{getPageTitle()}</h1>
                <button className={styles.closeButton} onClick={handleClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 6L18 18" stroke="#101010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>

            {categoryId && (
                <div className={styles.filterInfo}>
                    <p>
                        {source === 'created' ? 'После создания вашего заказа найдены ' : 'Показываем '}
                        мастера работающие в выбранной категории
                    </p>
                </div>
            )}

            <div className={styles.mastersList}>
                {isLoading ? (
                    <div className={styles.loading}><p>Загрузка мастеров...</p></div>
                ) : masters.length === 0 ? (
                    <div className={styles.noResults}>
                        <p>Нет мастеров в выбранной категории</p>
                    </div>
                ) : (
                    masters.map((master) => (
                        <div
                            key={master.id}
                            className={styles.masterCard}
                            onClick={() => handleMasterClick(master.id)}
                            style={{ cursor: 'pointer' }}
                        >
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
                                    <div className={styles.mastersList_title_btns} onClick={(e) => e.stopPropagation()}>
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
                                    {isLikeLoading === master.id && (
                                        <div className={styles.loadingSpinner}></div>
                                    )}
                                </button>
                            </div>

                            <div className={styles.mastersList_about}>
                                <p className={styles.mastersList_about_welcome}>О мастере</p>
                                <p className={styles.mastersList_about_title}>
                                    {master.bio || 'Нет информации о мастере'}
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
                    ))
                )}
            </div>

            {/* Модальное окно отзыва */}
            {showReviewModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.reviewModal}>
                        <div className={styles.modalHeader}>
                            <h2>Оставьте отзыв о мастере</h2>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.commentSection}>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Расскажите о вашем опыте работы с мастером..."
                                    className={styles.commentTextarea}
                                />
                            </div>

                            <div className={styles.photoSection}>
                                <label>Приложите фото</label>
                                <div className={styles.photoUploadContainer}>
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

                        <div className={styles.modalActions}>
                            <button
                                className={styles.closeButton_end}
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
};

export default SearchServicePage;