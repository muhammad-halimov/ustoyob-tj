import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../../../app/routers/routes';
import { Service } from '../../../../../entities';
import styles from './ServicesSection.module.scss';
import { truncateText } from '../../../../../shared/ui/TicketCard/TicketCard.tsx';

interface ServicesSectionProps {
    services: Service[];
    servicesLoading: boolean;
    readOnly?: boolean;
    userRole?: 'master' | 'client' | null;
    API_BASE_URL?: string;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
    services,
    servicesLoading,
    readOnly = false,
    userRole = null,
    API_BASE_URL = import.meta.env.VITE_API_BASE_URL,
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation(['profile']);

    // Фильтруем только активные услуги
    const activeServices = services.filter(service => service.active !== false);

    const handleServiceClick = (serviceId: number) => {
        navigate(ROUTES.TICKET_BY_ID(serviceId));
    };

    const formatDate = (dateString?: string): string => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return '';
        }
    };

    const getServiceImage = (service: Service): string => {
        // Если есть массив изображений и в нём есть хотя бы одно изображение
        if (service.images && Array.isArray(service.images) && service.images.length > 0) {
            const firstImageObj = service.images[0];
            // Проверяем, что это объект с полем image
            if (firstImageObj && typeof firstImageObj === 'object' && 'image' in firstImageObj) {
                const firstImage = firstImageObj.image;
                
                // Проверяем, что image это строка
                if (typeof firstImage === 'string' && firstImage.length > 0) {
                    // Проверяем, это URL или путь к файлу
                    if (firstImage.startsWith('http')) {
                        return firstImage;
                    } else {
                        // Формируем полный URL к изображению
                        return `${API_BASE_URL}/images/ticket_photos/${firstImage}`;
                    }
                }
            }
        }
        
        // Дефолтное изображение, если нет фото
        return '../fonTest6.png';
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = '../fonTest6.png';
    };

    return (
        <div className={styles.section_item}>
            <h3>{userRole === 'client' ? t('profile:servicesTitleClient') : t('profile:servicesTitle')} ({activeServices.length})</h3>
            <div className={styles.section_content}>
                {servicesLoading ? (
                    <div className={styles.loading}>{t('profile:loadingServices')}</div>
                ) : activeServices.length > 0 ? (
                    <>
                        {activeServices.map((service, index) => (
                            <div
                                key={service.id}
                                className={`${styles.service_item} ${index === activeServices.length - 1 ? styles.service_item_last : ''}`}
                                onClick={() => handleServiceClick(service.id)}
                            >
                                <div className={styles.service_image}>
                                    <img 
                                        src={getServiceImage(service)} 
                                        alt={typeof service.title === 'string' ? service.title : t('profile:serviceDefault')}
                                        onError={handleImageError}
                                    />
                                </div>
                                <div className={styles.service_content}>
                                    <div className={styles.service_header}>
                                        <h4 className={styles.service_title}>{truncateText(typeof service.title === 'string' ? service.title : (typeof service.title === 'object' && service.title && 'title' in service.title ? String((service.title as any).title) : t('profile:serviceDefault')), 17)}</h4>
                                        <div className={styles.service_price}>
                                            {typeof service.budget === 'number' ? service.budget : 0} TJS / {typeof service.unit === 'string' ? service.unit : (typeof service.unit === 'object' && service.unit && 'title' in service.unit ? String((service.unit as any).title) : 'шт')}
                                        </div>
                                    </div>
                                    {service.description && (() => {
                                        const desc = typeof service.description === 'string'
                                            ? service.description
                                            : (typeof service.description === 'object' && service.description && 'text' in service.description
                                                ? String((service.description as any).text)
                                                : '');
                                        return (
                                            <>
                                                <p className={styles.service_description_desktop}>{truncateText(desc, 150)}</p>
                                                <p className={styles.service_description_mobile}>{truncateText(desc, 25)}</p>
                                            </>
                                        );
                                    })()}
                                    {service.createdAt && (
                                        <div className={styles.service_date}>
                                            {t('profile:addedAt')} {formatDate(service.createdAt)}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.service_arrow}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 18L15 12L9 6" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    <div className={styles.empty_state}>
                        <span>{readOnly 
                            ? (userRole === 'client' ? t('profile:noServicesClient') : t('profile:noServicesMaster'))
                            : (userRole === 'client' ? t('profile:addServicesClient') : t('profile:addServicesMaster'))
                        }</span>
                    </div>
                )}
            </div>
        </div>
    );
};