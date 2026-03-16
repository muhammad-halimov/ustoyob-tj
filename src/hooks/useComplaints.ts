import { useState, useCallback } from 'react';
import { makeApiRequest } from '../utils/apiHelper';
import { getAuthToken } from '../utils/auth';
import { uploadPhotos } from '../utils/imageHelper';

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
        const token = getAuthToken();
        await uploadPhotos('appeals', appealId, photos, token);
    }, []);

    return {
        isLoading,
        error,
        fetchComplaintReasons,
        createComplaint,
        uploadComplaintPhotos
    };
};