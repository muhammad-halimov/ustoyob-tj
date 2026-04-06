import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuthToken, getUserRole, getUserData } from '../../../../utils/auth.ts';
import { getStorageItem } from '../../../../utils/storageHelper.ts';
import AuthModal from '../../../../features/auth/AuthModal.tsx';
import Status from '../Status';
import { Toggle } from '../../Button/Toggle/Toggle';
import PhotoGrid, { PhotoItem } from '../../Photo/PhotoGrid';
import { Preview, usePreview } from '../../Photo/Preview';
import { uploadPhotos } from '../../../../utils/imageHelper';
import styles from './FeedbackModal.module.scss';

export interface FeedbackModalProps {
    mode: 'review' | 'complaint';
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError?: (message: string) => void;
    targetUserId: number;
    // Shared / Review
    ticketId?: number;
    // Review-specific
    onReviewSubmitted?: (reviewCount: number) => void;
    showServiceSelector?: boolean;
    // Complaint-specific
    targetUserRole?: 'client' | 'master';
    chatId?: number;
    reviewId?: number;
    complaintType?: 'ticket' | 'chat' | 'review' | 'user';
    showUserComplaintToggle?: boolean;
}

interface Service {
    id: number;
    title: string;
}

interface Ticket {
    id: number;
    title: string;
}

interface AppealReason {
    id: number;
    code: string;
    title: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const FeedbackModal: React.FC<FeedbackModalProps> = ({
    mode,
    isOpen,
    onClose,
    onSuccess,
    targetUserId,
    ticketId,
    onReviewSubmitted,
    showServiceSelector = false,
    targetUserRole,
    chatId,
    reviewId,
    complaintType = 'ticket',
    showUserComplaintToggle = false,
}) => {
    const { t } = useTranslation('components');
    const isReview = mode === 'review';

    // --- Common state ---
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [statusType, setStatusType] = useState<'success' | 'error'>('error');
    const [statusMessage, setStatusMessage] = useState('');

    // --- Review state ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [selectedStars, setSelectedStars] = useState(0);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
    const [loadingServices, setLoadingServices] = useState(false);

    // --- Complaint state ---
    const [reasons, setReasons] = useState<AppealReason[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [reason, setReason] = useState('');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(ticketId ?? null);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [isUserComplaint, setIsUserComplaint] = useState(false);

    const effectiveComplaintType = isUserComplaint ? 'user' : complaintType;

    const photoPreviewUrls = photos
        .filter((p): p is Extract<PhotoItem, { type: 'new' }> => p.type === 'new')
        .map(p => p.previewUrl);
    const photoGallery = usePreview({ images: photoPreviewUrls });

    const showStatus = (type: 'success' | 'error', message: string) => {
        setStatusType(type);
        setStatusMessage(message);
        setStatusOpen(true);
    };

    // --- Review effects ---
    React.useEffect(() => {
        if (isOpen && isReview) {
            setIsAuthenticated(!!getAuthToken());
        }
    }, [isOpen, isReview]);

    React.useEffect(() => {
        if (isOpen && isReview && isAuthenticated && showServiceSelector && targetUserId) {
            fetchServices();
        }
    }, [isOpen, isReview, isAuthenticated, showServiceSelector, targetUserId]);

    // --- Complaint effects ---
    React.useEffect(() => {
        if (!isOpen || isReview) return;
        const locale = getStorageItem('i18nextLng') || 'ru';
        const type = effectiveComplaintType === 'chat' ? 'chat'
            : effectiveComplaintType === 'review' ? 'review'
            : effectiveComplaintType === 'user' ? 'overall'
            : 'ticket';
        fetch(`${API_BASE_URL}/api/appeal-reasons?locale=${locale}&applicableTo=${type}`)
            .then(r => r.ok ? r.json() : [])
            .then((data: any[]) => setReasons(data.map(r => ({ id: r.id, code: r.code, title: r.title }))))
            .catch(() => setReasons([]));
    }, [isOpen, isReview, effectiveComplaintType]);

    React.useEffect(() => {
        if (!isOpen || isReview) return;
        if (targetUserId && !ticketId) fetchTickets();
        if (ticketId) setSelectedTicketId(ticketId);
    }, [isOpen, isReview, targetUserId, ticketId]);

    // --- Review helpers ---
    const fetchServices = async () => {
        try {
            setLoadingServices(true);
            const token = getAuthToken();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const userRole = getUserRole();
            const endpoint = userRole === 'client'
                ? `/api/tickets?service=true&active=true&exists[author]=false&exists[master]=true&master=${targetUserId}`
                : `/api/tickets?service=false&active=true&exists[master]=false&exists[author]=true&author=${targetUserId}`;
            const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
            if (response.ok) {
                const data = await response.json();
                const arr: any[] = Array.isArray(data) ? data : (data['hydra:member'] ?? []);
                setServices(arr.map(t => ({ id: t.id, title: t.title || 'Без названия' })));
            }
        } catch (e) {
            console.error('Error fetching services:', e);
        } finally {
            setLoadingServices(false);
        }
    };

    const getCurrentUserId = (): number | null => getUserData()?.id ?? null;

    const fetchReviewCount = async (userId: number): Promise<number> => {
        try {
            const token = getAuthToken();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_BASE_URL}/api/reviews?exists[ticket]=true&exists[master]=true&exists[client]=true&master=${userId}`, { headers });
            if (!res.ok) return 0;
            const data = await res.json();
            const arr: any[] = Array.isArray(data) ? data : (data['hydra:member'] ?? []);
            return arr.filter(r => r.master?.id === userId || r.client?.id === userId).length;
        } catch {
            return 0;
        }
    };

    // --- Complaint helpers ---
    const fetchTickets = async () => {
        try {
            setLoadingTickets(true);
            const token = getAuthToken();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const userRole = getUserRole();
            const resolvedTargetRole = targetUserRole ?? (userRole === 'client' ? 'master' : 'client');
            const endpoint = resolvedTargetRole === 'master'
                ? `/api/tickets?service=true&active=true&exists[master]=true&master=${targetUserId}`
                : `/api/tickets?service=false&active=true&exists[author]=true&author=${targetUserId}`;
            const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
            if (response.ok) {
                const data = await response.json();
                const arr: any[] = Array.isArray(data) ? data : (data['hydra:member'] ?? []);
                setTickets(arr.map(t => ({ id: t.id, title: t.title || 'Без названия' })));
            }
        } catch (e) {
            console.error('Error fetching tickets:', e);
        } finally {
            setLoadingTickets(false);
        }
    };

    if (!isOpen) return null;

    // --- Submit: Review ---
    const handleSubmitReview = async () => {
        if (!reviewText.trim()) { showStatus('error', t('reviewModal.errorCommentRequired')); return; }
        if (selectedStars === 0) { showStatus('error', t('reviewModal.errorRatingRequired')); return; }
        if (showServiceSelector && !selectedServiceId) { showStatus('error', t('reviewModal.errorServiceRequired')); return; }

        setIsSubmitting(true);
        try {
            const token = getAuthToken()!;
            const userRole = getUserRole();
            const currentUserId = getCurrentUserId();
            if (!currentUserId) { showStatus('error', t('reviewModal.errorUserNotFound')); return; }
            if (currentUserId === targetUserId) { showStatus('error', t('reviewModal.errorSelfReview')); return; }

            interface ReviewData { type: string; rating: number; description: string; ticket: string; master?: string; client?: string; }
            const reviewData: ReviewData = {
                type: '',
                rating: selectedStars,
                description: reviewText,
                ticket: `/api/tickets/${showServiceSelector && selectedServiceId ? selectedServiceId : ticketId}`,
            };
            if (userRole === 'master') {
                reviewData.type = 'client';
                reviewData.master = `/api/users/${currentUserId}`;
                reviewData.client = `/api/users/${targetUserId}`;
            } else if (userRole === 'client') {
                reviewData.type = 'master';
                reviewData.client = `/api/users/${currentUserId}`;
                reviewData.master = `/api/users/${targetUserId}`;
            } else {
                showStatus('error', t('reviewModal.errorUnknownRole'));
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(reviewData),
            });

            if (response.ok || response.status === 201) {
                const reviewResponse = await response.json();
                if (photos.length > 0 && reviewResponse.id) {
                    const filesToUpload = photos.flatMap(p => p.type === 'new' ? [p.file] : []);
                    try { await uploadPhotos('reviews', reviewResponse.id, filesToUpload, token); }
                    catch (e) { console.error('Error uploading review photos:', e); }
                }
                if (onReviewSubmitted) {
                    const updatedCount = await fetchReviewCount(targetUserId);
                    onReviewSubmitted(updatedCount);
                }
                showStatus('success', t('reviewModal.successMessage'));
            } else {
                const errorText = await response.text();
                let errorMessage = t('reviewModal.errorDefault');
                if (errorText.includes('no interactions') || errorText.includes('no interaction')) {
                    errorMessage = t('reviewModal.errorNoInteraction');
                } else if (response.status === 422) {
                    try {
                        const errData = JSON.parse(errorText);
                        if (errData.violations?.length > 0) errorMessage = errData.violations.map((v: any) => v.message).join(', ');
                        else if (errData.message?.includes('no interaction')) errorMessage = t('reviewModal.errorNoInteraction');
                        else if (errData.message) errorMessage = errData.message;
                    } catch { errorMessage = t('reviewModal.errorValidation'); }
                } else if (response.status === 400) errorMessage = t('reviewModal.errorInvalidData');
                else if (response.status === 404) errorMessage = t('reviewModal.errorNotFound');
                else if (response.status === 403) errorMessage = t('reviewModal.errorNoAccess');
                showStatus('error', errorMessage);
            }
        } catch {
            showStatus('error', t('reviewModal.errorUnexpected'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Submit: Complaint ---
    const handleSubmitComplaint = async () => {
        if (!title.trim()) { showStatus('error', t('complaintModal.errorTitleRequired')); return; }
        if (!description.trim()) { showStatus('error', t('complaintModal.errorDescriptionRequired')); return; }
        if (!reason) { showStatus('error', t('complaintModal.errorReasonRequired')); return; }
        if (effectiveComplaintType === 'ticket' && !selectedTicketId) { showStatus('error', t('complaintModal.errorTicketRequired')); return; }

        setIsSubmitting(true);
        try {
            const token = getAuthToken();
            const complaintData: Record<string, any> = {
                type: effectiveComplaintType,
                title,
                description,
                reason: `/api/appeal-reasons/${reason}`,
                respondent: `/api/users/${targetUserId}`,
            };
            if (selectedTicketId) complaintData.ticket = `/api/tickets/${selectedTicketId}`;
            if (chatId) complaintData.chat = `/api/chats/${chatId}`;
            if (reviewId) complaintData.review = `/api/reviews/${reviewId}`;

            const response = await fetch(`${API_BASE_URL}/api/appeals`, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(complaintData),
            });

            if (response.ok || response.status === 201) {
                const complaintResponse = await response.json();
                if (photos.length > 0 && complaintResponse.id) {
                    const filesToUpload = photos.flatMap(p => p.type === 'new' ? [p.file] : []);
                    uploadPhotos('appeals', complaintResponse.id, filesToUpload, token)
                        .catch(err => console.warn('Failed to upload complaint photos:', err));
                }
                showStatus('success', t('complaintModal.successMessage'));
            } else {
                const errorText = await response.text();
                let errorMessage = t('complaintModal.errorDefault');
                if (response.status === 422) {
                    try {
                        const errData = JSON.parse(errorText);
                        if (errData.violations?.length > 0) errorMessage = errData.violations.map((v: any) => v.message).join(', ');
                        else if (errData.message) errorMessage = errData.message;
                    } catch { errorMessage = t('complaintModal.errorValidation'); }
                } else if (response.status === 400) {
                    try {
                        const errData = JSON.parse(errorText);
                        errorMessage = errData.message || t('complaintModal.errorInvalidData');
                    } catch { errorMessage = t('complaintModal.errorInvalidData'); }
                } else if (response.status === 404) errorMessage = t('complaintModal.errorNotFound');
                else if (response.status === 403) errorMessage = t('complaintModal.errorNoAccess');
                showStatus('error', errorMessage);
            }
        } catch {
            showStatus('error', t('complaintModal.errorUnexpected'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        // Review state
        setReviewText('');
        setSelectedStars(0);
        setSelectedServiceId(null);
        setServices([]);
        setIsAuthenticated(false);
        // Complaint state
        setTitle('');
        setDescription('');
        setReason('');
        setSelectedTicketId(null);
        setTickets([]);
        setIsUserComplaint(false);
        // Common
        setPhotos([]);
        onClose();
    };

    // Review: show AuthModal if not authenticated
    if (isReview && !isAuthenticated) {
        return (
            <AuthModal
                isOpen={true}
                onClose={handleCloseModal}
                onLoginSuccess={(_token: string) => setIsAuthenticated(true)}
            />
        );
    }

    return (
        <>
        <Status
            type={statusType}
            isOpen={statusOpen}
            onClose={() => {
                setStatusOpen(false);
                if (statusType === 'success') {
                    onSuccess(statusMessage);
                    handleCloseModal();
                }
            }}
            message={statusMessage}
        />
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.feedbackModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{isReview ? t('reviewModal.title') : t('complaintModal.title')}</h2>
                </div>

                <div className={styles.modalContent}>
                    {/* ===== REVIEW FIELDS ===== */}
                    {isReview && showServiceSelector && (
                        <div className={styles.serviceSection}>
                            <label>{t('reviewModal.selectService')}</label>
                            {loadingServices ? (
                                <div className={styles.loadingServices}>{t('reviewModal.loadingServices')}</div>
                            ) : services.length === 0 ? (
                                <div className={styles.noServices}>{t('reviewModal.noServices')}</div>
                            ) : (
                                <select
                                    value={selectedServiceId || ''}
                                    onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                                    className={styles.serviceSelect}
                                    disabled={isSubmitting}
                                >
                                    <option value="">{t('reviewModal.selectServicePlaceholder')}</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {isReview && (
                        <div className={styles.commentSection}>
                            <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                placeholder={t('reviewModal.commentPlaceholder')}
                                className={styles.commentTextarea}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {/* ===== COMPLAINT FIELDS ===== */}
                    {!isReview && showUserComplaintToggle && (
                        <Toggle
                            checked={isUserComplaint}
                            onChange={(e) => setIsUserComplaint(e.target.checked)}
                            label={t('complaintModal.userComplaintToggle')}
                        />
                    )}

                    {!isReview && effectiveComplaintType === 'ticket' && !ticketId && !isUserComplaint && (
                        <div className={styles.ticketSection}>
                            <label>{t('complaintModal.selectTicket')}</label>
                            {loadingTickets ? (
                                <div className={styles.loadingTickets}>{t('complaintModal.loadingTickets')}</div>
                            ) : tickets.length === 0 ? (
                                <div className={styles.noTickets}>{t('complaintModal.noTickets')}</div>
                            ) : (
                                <select
                                    value={selectedTicketId || ''}
                                    onChange={(e) => setSelectedTicketId(Number(e.target.value))}
                                    className={styles.ticketSelect}
                                    disabled={isSubmitting}
                                >
                                    <option value="">{t('complaintModal.selectTicketPlaceholder')}</option>
                                    {tickets.map(ticket => (
                                        <option key={ticket.id} value={ticket.id}>{ticket.title}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {!isReview && (
                        <div className={styles.reasonSection}>
                            <label>{t('complaintModal.selectReason')}</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className={styles.reasonSelect}
                                disabled={isSubmitting}
                            >
                                <option value="">{t('complaintModal.selectReasonPlaceholder')}</option>
                                {reasons.map(r => (
                                    <option key={r.id} value={r.id}>{r.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!isReview && (
                        <div className={styles.titleSection}>
                            <label>{t('complaintModal.complaintTitle')}</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('complaintModal.titlePlaceholder')}
                                className={styles.titleInput}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {!isReview && (
                        <div className={styles.descriptionSection}>
                            <label>{t('complaintModal.complaintDescription')}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('complaintModal.descriptionPlaceholder')}
                                className={styles.descriptionTextarea}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {/* ===== PHOTOS (common) ===== */}
                    <div className={styles.photoSection}>
                        <label className={styles.photoLabel}>
                            {isReview ? t('reviewModal.attachPhoto') : t('complaintModal.attachPhoto')}
                        </label>
                        <Preview
                            isOpen={photoGallery.isOpen}
                            images={photoPreviewUrls}
                            currentIndex={photoGallery.currentIndex}
                            onClose={photoGallery.closeGallery}
                            onNext={photoGallery.goToNext}
                            onPrevious={photoGallery.goToPrevious}
                            onSelectImage={photoGallery.selectImage}
                        />
                        <PhotoGrid
                            photos={photos}
                            onChange={setPhotos}
                            getImageUrl={() => ''}
                            onClickPhoto={photoGallery.openGallery}
                            disabled={isSubmitting}
                            inputId={isReview ? 'review-photos' : 'complaint-photos'}
                        />
                    </div>

                    {/* ===== REVIEW: Star rating ===== */}
                    {isReview && (
                        <div className={styles.ratingSection}>
                            <label>{t('reviewModal.rateWork')}</label>
                            <div className={styles.stars}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`${styles.star} ${star <= selectedStars ? styles.active : ''}`}
                                        onClick={() => setSelectedStars(star)}
                                        disabled={isSubmitting}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_248_13358)">
                                                <path
                                                    d="M12 2.49023L15.51 8.17023L22 9.76023L17.68 14.8502L18.18 21.5102L12 18.9802L5.82 21.5102L6.32 14.8502L2 9.76023L8.49 8.17023L12 2.49023Z"
                                                    stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                                <path d="M12 19V18.98" stroke="currentColor" strokeWidth="2"
                                                      strokeMiterlimit="10"/>
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
                    )}
                </div>

                {/* ===== ACTIONS ===== */}
                <div className={styles.modalActions}>
                    <button
                        className={styles.closeButton}
                        onClick={handleCloseModal}
                        disabled={isSubmitting}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                             xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_fb_close)">
                                <g clipPath="url(#clip1_fb_close)">
                                    <path
                                        d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                        stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M16.7705 7.22998L7.23047 16.77" stroke="currentColor" strokeWidth="2"
                                          strokeMiterlimit="10"/>
                                    <path d="M7.23047 7.22998L16.7705 16.77" stroke="currentColor" strokeWidth="2"
                                          strokeMiterlimit="10"/>
                                </g>
                            </g>
                            <defs>
                                <clipPath id="clip0_fb_close"><rect width="24" height="24" fill="white"/></clipPath>
                                <clipPath id="clip1_fb_close"><rect width="24" height="24" fill="white"/></clipPath>
                            </defs>
                        </svg>
                        {isReview ? t('reviewModal.close') : t('complaintModal.close')}
                    </button>
                    <button
                        className={`${styles.submitButton} ${!isReview ? styles.submitButtonComplaint : ''}`}
                        onClick={isReview ? handleSubmitReview : handleSubmitComplaint}
                        disabled={isSubmitting}
                    >
                        <span style={{ visibility: isSubmitting ? 'hidden' : 'visible', display: 'flex', alignItems: 'center' }}>
                            {isReview ? t('reviewModal.submit') : t('complaintModal.submit')}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_fb_submit)">
                                    <path
                                        d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                        stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                    <path d="M6.26953 12H17.7295" stroke="white" strokeWidth="2"
                                          strokeMiterlimit="10"/>
                                    <path d="M12.96 7.22998L17.73 12L12.96 16.77" stroke="white" strokeWidth="2"
                                          strokeMiterlimit="10"/>
                                </g>
                                <defs>
                                    <clipPath id="clip0_fb_submit"><rect width="24" height="24" fill="white"/></clipPath>
                                </defs>
                            </svg>
                        </span>
                        {isSubmitting && <span className={styles.submitSpinner} />}
                    </button>
                </div>
            </div>
        </div>
        </>
    );
};

export default FeedbackModal;
