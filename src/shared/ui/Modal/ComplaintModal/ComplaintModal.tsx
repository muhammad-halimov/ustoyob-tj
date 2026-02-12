import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuthToken, getUserRole } from '../../../../utils/auth.ts';
import styles from './ComplaintModal.module.scss';

interface ComplaintModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
    targetUserId: number;
}

interface Ticket {
    id: number;
    title: string;
    description?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ComplaintModal: React.FC<ComplaintModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    onError,
    targetUserId
}) => {
    const { t } = useTranslation('components');
    
    // Причины жалоб из API
    const COMPLAINT_REASONS = [
        { value: 'offend', label: t('complaintReasons.offend') },
        { value: 'rude_language', label: t('complaintReasons.rude_language') },
        { value: 'fraud', label: t('complaintReasons.fraud') },
        { value: 'racism_nazism_xenophobia', label: t('complaintReasons.racism_nazism_xenophobia') },
        { value: 'other', label: t('complaintReasons.other') },
        { value: 'lateness', label: t('complaintReasons.lateness') },
        { value: 'bad_quality', label: t('complaintReasons.bad_quality') },
        { value: 'property_damage', label: t('complaintReasons.property_damage') },
        { value: 'overpricing', label: t('complaintReasons.overpricing') },
        { value: 'unprofessionalism', label: t('complaintReasons.unprofessionalism') }
    ];
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [reason, setReason] = useState('');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Загружаем тикеты при открытии модалки
    React.useEffect(() => {
        if (isOpen && targetUserId) {
            fetchTickets();
        }
    }, [isOpen, targetUserId]);

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

            // Получаем тикеты целевого пользователя
            const endpoint = userRole === 'client'
                ? `/api/tickets?service=true&active=true&exists[author]=false&exists[master]=true&master=${targetUserId}`
                : `/api/tickets?service=false&active=true&exists[master]=false&exists[author]=true&author=${targetUserId}`;

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
            alert(t('complaintModal.errorTitleRequired'));
            return;
        }

        if (!description.trim()) {
            alert(t('complaintModal.errorDescriptionRequired'));
            return;
        }

        if (!reason) {
            alert(t('complaintModal.errorReasonRequired'));
            return;
        }

        if (!selectedTicketId) {
            alert(t('complaintModal.errorTicketRequired'));
            return;
        }

        setIsSubmitting(true);

        try {
            const token = getAuthToken()!; // Получаем токен для запросов (! так как проверили выше)

            const complaintData = {
                type: 'ticket',
                title: title,
                description: description,
                reason: reason,
                respondent: `/api/users/${targetUserId}`,
                ticket: `/api/tickets/${selectedTicketId}`
            };

            console.log('Sending complaint data:', complaintData);

            const response = await fetch(`${API_BASE_URL}/api/appeals`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
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
        onClose();
    };

    return (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.complaintModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{t('complaintModal.title')}</h2>
                </div>

                <div className={styles.modalContent}>
                    {/* Выбор тикета/услуги */}
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
                            {COMPLAINT_REASONS.map(r => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
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
    );
};

export default ComplaintModal;
