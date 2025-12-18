import { useState, useCallback } from 'react';
import { makeApiRequest } from '../utils/apiHelper';

export const useReviews = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReviews = useCallback(async (userId: number, userType: 'client' | 'master') => {
        setIsLoading(true);
        setError(null);

        try {
            // В зависимости от типа пользователя фильтруем отзывы
            const endpoint = userType === 'client'
                ? `/api/reviews?client=${userId}`
                : `/api/reviews?master=${userId}`;

            const reviewsData = await makeApiRequest(endpoint, { requiresAuth: false });
            setReviews(reviewsData['hydra:member'] || reviewsData || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка загрузки отзывов');
            setReviews([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createReview = useCallback(async (reviewData: any) => {
        setIsLoading(true);
        try {
            const result = await makeApiRequest('/api/reviews', {
                method: 'POST',
                body: reviewData,
                requiresAuth: true
            });
            return result;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const uploadReviewPhotos = useCallback(async (reviewId: number, photos: File[]) => {
        const uploadPromises = photos.map(async (photo) => {
            const formData = new FormData();
            formData.append('imageFile', photo);

            await makeApiRequest(`/api/reviews/${reviewId}/upload-photo`, {
                method: 'POST',
                body: formData,
                requiresAuth: true
            });
        });

        await Promise.all(uploadPromises);
    }, []);

    return {
        reviews,
        isLoading,
        error,
        fetchReviews,
        createReview,
        uploadReviewPhotos
    };
};