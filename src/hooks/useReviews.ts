import { useState, useCallback } from 'react';
import { makeApiRequest } from '../utils/apiHelper';
import { getAuthToken } from '../utils/auth.ts';
import { uploadPhotos } from '../utils/imageHelper';

export interface Review {
    id: number;
    master?: {
        id: number;
        name?: string;
        surname?: string;
        patronymic?: string;
        image?: string;
    };
    client?: {
        id: number;
        name?: string;
        surname?: string;
        patronymic?: string;
        image?: string;
    };
    rating: number;
    description: string;
    ticket?: {
        id: number;
        title: string;
        service?: boolean;
        active?: boolean;
    };
    images: Array<{
        id: number;
        image: string;
    }>;
    createdAt?: string;
    type?: string;
}

export const useReviews = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReviews = useCallback(async (userId: number, userType: 'client' | 'master') => {
        setIsLoading(true);
        setError(null);

        try {
            const token = getAuthToken();

            let endpoint;
            const params = new URLSearchParams({
                [userType]: userId.toString(),
                type: userType
            });

            if (token) {
                endpoint = `/api/reviews/me?${params.toString()}`;
            } else {
                endpoint = `/api/reviews?${params.toString()}`;
            }

            const reviewsData = await makeApiRequest(endpoint, {
                requiresAuth: !!token
            });

            let reviewsArray: any[] = [];
            if (Array.isArray(reviewsData)) {
                reviewsArray = reviewsData;
            } else if (reviewsData && reviewsData['hydra:member']) {
                reviewsArray = reviewsData['hydra:member'];
            } else if (reviewsData) {
                reviewsArray = [reviewsData];
            }

            const transformedReviews: Review[] = reviewsArray.map((review: any) => {
                const getUserId = (user: any) => {
                    if (typeof user === 'object' && user?.id) {
                        return user.id;
                    }
                    if (typeof user === 'string') {
                        return parseInt(user.split('/').pop() || '0');
                    }
                    return 0;
                };

                return {
                    id: review.id,
                    master: review.master ? {
                        id: getUserId(review.master),
                        name: review.master?.name,
                        surname: review.master?.surname,
                        patronymic: review.master?.patronymic,
                        image: review.master?.image
                    } : undefined,
                    client: review.client ? {
                        id: getUserId(review.client),
                        name: review.client?.name,
                        surname: review.client?.surname,
                        patronymic: review.client?.patronymic,
                        image: review.client?.image
                    } : undefined,
                    rating: review.rating || 0,
                    description: review.description || '',
                    ticket: review.ticket,
                    images: review.images || [],
                    createdAt: review.createdAt,
                    type: review.type
                };
            });

            setReviews(transformedReviews);
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
            console.log('Creating review with data:', reviewData);

            const result = await makeApiRequest('/api/reviews', {
                method: 'POST',
                body: reviewData,
                requiresAuth: true,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('Review created successfully:', result);
            return result;
        } catch (error) {
            console.error('Error creating review:', error);
            setError(error instanceof Error ? error.message : 'Ошибка создания отзыва');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const uploadReviewPhotos = useCallback(async (reviewId: number, photos: File[]) => {
        if (photos.length === 0) return;
        setIsLoading(true);
        try {
            const token = getAuthToken();
            await uploadPhotos('reviews', reviewId, photos, token);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Ошибка загрузки фото');
            throw error;
        } finally {
            setIsLoading(false);
        }
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