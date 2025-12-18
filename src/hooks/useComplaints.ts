import { useState, useCallback } from 'react';
import { makeApiRequest } from '../utils/apiHelper';

export const useComplaints = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComplaintReasons = useCallback(async () => {
        try {
            const reasons = await makeApiRequest('/api/appeals/reasons', {
                requiresAuth: false
            });
            return reasons;
        } catch {
            return [{ id: 1, complaint_code: 'other', complaint_human: 'Другое' }];
        }
    }, []);

    const createComplaint = useCallback(async (complaintData: any) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await makeApiRequest('/api/appeals', {
                method: 'POST',
                body: complaintData,
                requiresAuth: true
            });
            return result;
        } catch (err: any) {
            setError(err?.message ?? 'Ошибка при отправке жалобы');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const uploadComplaintPhotos = useCallback(async (appealId: number, photos: File[]) => {
        const uploadPromises = photos.map(async (photo) => {
            const formData = new FormData();
            formData.append('imageFile', photo);

            await makeApiRequest(`/api/appeals/${appealId}/upload-photo`, {
                method: 'POST',
                body: formData,
                requiresAuth: true
            });
        });

        await Promise.all(uploadPromises);
    }, []);

    return {
        isLoading,
        error,
        fetchComplaintReasons,
        createComplaint,
        uploadComplaintPhotos
    };
};