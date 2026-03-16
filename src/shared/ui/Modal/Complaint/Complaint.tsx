import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuthToken, getUserRole } from '../../../../utils/auth.ts';
import { getStorageItem } from '../../../../utils/storageHelper.ts';
import Status from '../Status';
import { Toggle } from '../../Button/Toggle/Toggle';
import PhotoPicker from '../../Photo/PhotoPicker';
import { uploadPhotos } from '../../../../utils/imageHelper';
import { PageLoader } from '../../../../widgets/PageLoader';
import styles from './Complaint.module.scss';

interface ComplaintModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
    targetUserId: number;
    targetUserRole?: 'client' | 'master';
    ticketId?: number;
    chatId?: number;
    reviewId?: number;
    complaintType?: 'ticket' | 'chat' | 'review' | 'user';
    showUserComplaintToggle?: boolean;
}

interface Ticket {
    id: number;
    title: string;
    description?: string;
}

interface AppealReason {
    id: number;
    code: string;
    title: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Complaint: React.FC<ComplaintModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    onError,
    targetUserId,
    targetUserRole,
    ticketId,
    chatId,
    reviewId,
    complaintType = 'ticket',
    showUserComplaintToggle = false,
}) => {
    const { t } = useTranslation('components');
    const [reasons, setReasons] = useState<AppealReason[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [reason, setReason] = useState('');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(ticketId || null);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUserComplaint, setIsUserComplaint] = useState(false);
    const [photos, setPhotos] = useState<File[]>([]);
    const [statusOpen, setStatusOpen] = useState(false);
    const [statusType, setStatusType] = useState<'success' | 'error'>('error');
    const [statusMessage, setStatusMessage] = useState('');

    const showStatus = (type: 'success' | 'error', message: string) => {
        setStatusType(type);
        setStatusMessage(message);
        setStatusOpen(true);
    };

    const effectiveType = isUserComplaint ? 'user' : complaintType;

    // Загружаем причины жалоб из API
    React.useEffect(() => {
        if (!isOpen) return;
        const locale = getStorageItem('i18nextLng') || 'ru';
        const type = effectiveType === 'chat' ? 'chat' : effectiveType === 'review' ? 'review' : effectiveType === 'user' ? 'overall' : 'ticket';
        fetch(`${API_BASE_URL}/api/appeal-reasons?locale=${locale}&applicableTo=${type}`)
            .then(r => r.ok ? r.json() : [])
            .then((data: any[]) => {
                setReasons(data.map(r => ({ id: r.id, code: r.code, title: r.title })));
            })
            .catch(() => setReasons([]));
    }, [isOpen, effectiveType]);

    // Загружаем тикеты при открытии модалки (только если не передан ticketId)
    React.useEffect(() => {
        if (isOpen && targetUserId && !ticketId) {
            fetchTickets();
        }
        // Устанавливаем selectedTicketId если передан ticketId
        if (isOpen && ticketId) {
            setSelectedTicketId(ticketId);
        }
    }, [isOpen, targetUserId, ticketId]);

    const fetchTickets = async () => {
        try {
            setLoadingTickets(true);
            const token = getAuthToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const userRole = getUserRole();

            // Endpoint строится по роли ЦЕЛЕВОГО пользователя:
            // мастер — его сервисные тикеты; клиент — его заявки
            const resolvedTargetRole = targetUserRole ?? (userRole === 'client' ? 'master' : 'client');
            const endpoint = resolvedTargetRole === 'master'
                ? `/api/tickets?service=true&active=true&exists[master]=true&master=${targetUserId}`
                : `/api/tickets?service=false&active=true&exists[author]=true&author=${targetUserId}`;

            console.log('Fetching tickets with endpoint:', endpoint);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

            if (response.ok) {
                const data = await response.json();
                let ticketsArray: any[] = [];

                if (Array.isArray(data)) {
                    ticketsArray = data;
                } else if (data && typeof data === 'object') {
                    if (data['hydra:member'] && Array.isArray(data['hydra:member'])) {
                        ticketsArray = data['hydra:member'];
                    }
                }

                const ticketsList: Ticket[] = ticketsArray.map(ticket => ({
                    id: ticket.id,
                    title: ticket.title || 'Без названия',
                    description: ticket.description
                }));

                setTickets(ticketsList);
                console.log('Loaded tickets:', ticketsList);
            } else {
                console.error('Failed to fetch tickets:', response.status);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoadingTickets(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmitComplaint = async () => {
        if (!title.trim()) {
            showStatus('error', t('complaintModal.errorTitleRequired'));
            return;
        }

        if (!description.trim()) {
            showStatus('error', t('complaintModal.errorDescriptionRequired'));
            return;
        }

        if (!reason) {
            showStatus('error', t('complaintModal.errorReasonRequired'));
            return;
        }

        if (effectiveType === 'ticket' && !selectedTicketId) {
            showStatus('error', t('complaintModal.errorTicketRequired'));
            return;
        }

        setIsSubmitting(true);

        try {
            const token = getAuthToken();

            const complaintData: Record<string, any> = {
                type: effectiveType,
                title: title,
                description: description,
                reason: `/api/appeal-reasons/${reason}`,
                respondent: `/api/users/${targetUserId}`,
            };

            if (selectedTicketId) {
                complaintData.ticket = `/api/tickets/${selectedTicketId}`;
            }
            if (chatId) {
                complaintData.chat = `/api/chats/${chatId}`;
            }
            if (reviewId) {
                complaintData.review = `/api/reviews/${reviewId}`;
            }

            console.log('Sending complaint data:', complaintData);

            const response = await fetch(`${API_BASE_URL}/api/appeals`, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(complaintData)
            });

            if (response.ok || response.status === 201) {
                const complaintResponse = await response.json();
                console.log('Complaint created successfully:', complaintResponse);

                handleCloseModal();
                onSuccess(t('complaintModal.successMessage'));

                // Upload photos after successful complaint creation
                if (photos.length > 0 && complaintResponse.id) {
                    const token = getAuthToken();
                    uploadPhotos('appeals', complaintResponse.id, photos, token)
                        .catch(err => console.warn('Failed to upload complaint photos:', err));
                }

            } else {
                const errorText = await response.text();
                console.error('Error creating complaint. Status:', response.status, 'Response:', errorText);

                let errorMessage = t('complaintModal.errorDefault');
                
                if (response.status === 422) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.violations && errorData.violations.length > 0) {
                            errorMessage = errorData.violations.map((v: any) => v.message).join(', ');
                        } else if (errorData.message) {
                            errorMessage = errorData.message;
                        }
                    } catch (e) {
                        errorMessage = t('complaintModal.errorValidation');
                    }
                } else if (response.status === 400) {
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.message) {
                            errorMessage = errorData.message;
                        } else {
                            errorMessage = t('complaintModal.errorInvalidData');
                        }
                    } catch (e) {
                        errorMessage = t('complaintModal.errorInvalidData');
                    }
                } else if (response.status === 404) {
                    errorMessage = t('complaintModal.errorNotFound');
                } else if (response.status === 403) {
                    errorMessage = t('complaintModal.errorNoAccess');
                }

                onError(errorMessage);
            }

        } catch (error) {
            console.error('Error submitting complaint:', error);
            onError(t('complaintModal.errorUnexpected'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setTitle('');
        setDescription('');
        setReason('');
        setSelectedTicketId(null);
        setTickets([]);
        setPhotos([]);
        onClose();
    };

    // Показываем форму жалобы
    return (
        <>
        <Status
            type={statusType}
            isOpen={statusOpen}
            onClose={() => setStatusOpen(false)}
            message={statusMessage}
        />
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.complaintModal} onClick={(e) => e.stopPropagation()}>
                {isSubmitting && <PageLoader overlay />}
                <div className={styles.modalHeader}>
                    <h2>{t('complaintModal.title')}</h2>
                </div>

                <div className={styles.modalContent}>
                    {/* Переключатель «Жалоба на пользователя» */}
                    {showUserComplaintToggle && (
                        <Toggle
                            checked={isUserComplaint}
                            onChange={(e) => setIsUserComplaint(e.target.checked)}
                            label={t('complaintModal.userComplaintToggle')}
                        />
                    )}

                    {/* Выбор тикета/услуги - только для типа ticket и если не передан ticketId */}
                    {effectiveType === 'ticket' && !ticketId && !isUserComplaint && (
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
                                        <option key={ticket.id} value={ticket.id}>
                                            {ticket.title}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Выбор причины жалобы */}
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
                                <option key={r.id} value={r.id}>
                                    {r.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Заголовок жалобы */}
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

                    {/* Описание жалобы */}
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
                </div>

                {/* Фотографии */}
                <div className={styles.photoSection}>
                    <PhotoPicker
                        photos={photos}
                        onChange={setPhotos}
                        disabled={isSubmitting}
                        inputId="complaint-photos"
                    />
                </div>

                {/* Кнопки модалки */}
                <div className={styles.modalActions}>
                    <button
                        className={styles.closeButton}
                        onClick={handleCloseModal}
                        disabled={isSubmitting}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                             xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_complaint_close)">
                                <g clipPath="url(#clip1_complaint_close)">
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
                                <clipPath id="clip0_complaint_close">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                                <clipPath id="clip1_complaint_close">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                        {t('complaintModal.close')}
                    </button>
                    <button
                        className={styles.submitButton}
                        onClick={handleSubmitComplaint}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t('complaintModal.submitting') : t('complaintModal.submit')}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                             xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_complaint_submit)">
                                <path
                                    d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z"
                                    stroke="white" strokeWidth="2" strokeMiterlimit="10"/>
                                <path d="M6.26953 12H17.7295" stroke="white" strokeWidth="2"
                                      strokeMiterlimit="10"/>
                                <path d="M12.96 7.22998L17.73 12L12.96 16.77" stroke="white" strokeWidth="2"
                                      strokeMiterlimit="10"/>
                            </g>
                            <defs>
                                <clipPath id="clip0_complaint_submit">
                                    <rect width="24" height="24" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        </>
    );
};

export default Complaint;
