import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ServicesSection.module.scss';

interface Service {
    id: number;
    title: string;
    description?: string;
    price: number;
    unit: string;
    createdAt?: string;
    active?: boolean;
    images?: Array<{
        id: number;
        image: string;
    }>;
}

interface ServicesSectionProps {
    services: Service[];
    servicesLoading: boolean;
    readOnly?: boolean;
    API_BASE_URL?: string;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
    services,
    servicesLoading,
    readOnly = false,
    API_BASE_URL = import.meta.env.VITE_API_BASE_URL,
}) => {
    const navigate = useNavigate();

    // Фильтруем только активные услуги
    const activeServices = services.filter(service => service.active !== false);

    const handleServiceClick = (serviceId: number) => {
        navigate(`/ticket/${serviceId}`);
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
        if (service.images && service.images.length > 0) {
            const firstImage = service.images[0].image;
            
            // Проверяем, это URL или путь к файлу
            if (firstImage.startsWith('http')) {
                return firstImage;
            } else {
                // Формируем полный URL к изображению
                return `${API_BASE_URL}/images/ticket_photos/${firstImage}`;
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
            <h3>Услуги ({activeServices.length})</h3>
            <div className={styles.section_content}>
                {servicesLoading ? (
                    <div className={styles.loading}>Загрузка услуг...</div>
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
                                        alt={service.title}
                                        onError={handleImageError}
                                    />
                                </div>
                                <div className={styles.service_content}>
                                    <div className={styles.service_header}>
                                        <h4 className={styles.service_title}>{service.title}</h4>
                                        <div className={styles.service_price}>
                                            {service.price} TJS / {service.unit}
                                        </div>
                                    </div>
                                    {service.description && (
                                        <p className={styles.service_description}>{service.description}</p>
                                    )}
                                    {service.createdAt && (
                                        <div className={styles.service_date}>
                                            Добавлено: {formatDate(service.createdAt)}
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
                        <span>{readOnly ? 'Услуги пока не добавлены' : 'Добавьте свои услуги'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};