import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../../../app/routers/routes';
import { Service } from '../../../../../entities';
import { ProfileSection } from '../ProfileSection';
import styles from './ServicesSection.module.scss';
import { Marquee } from '../../../../../shared/ui/Text/Marquee';

interface ServicesSectionProps {
    services: Service[];
    servicesLoading: boolean;
    readOnly?: boolean;
    userRole?: 'master' | 'client' | null;
    API_BASE_URL?: string;
    onReorder?: (services: Service[]) => void;
    onRefresh?: () => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
    services,
    servicesLoading,
    readOnly = false,
    userRole = null,
    API_BASE_URL = import.meta.env.VITE_API_BASE_URL,
    onReorder,
    onRefresh,
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation(['profile', 'components']);

    // Фильтруем только активные услуги
    const activeServices = services.filter(service => service.active !== false);

    const formatDate = (dateString?: string): string => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            const months = t('components:time.months', { returnObjects: true }) as string[];
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
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
                        return `${API_BASE_URL}/uploads/tickets/${firstImage}`;
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
        <ProfileSection<Service>
            title={`${userRole === 'client' ? t('profile:servicesTitleClient') : t('profile:servicesTitle')} (${activeServices.length})`}
            items={activeServices}
            editingId={null}
            readOnly={readOnly}
            isLoading={servicesLoading}
            emptyTitle={readOnly
                ? (userRole === 'client' ? t('profile:noServicesClient') : t('profile:noServicesMaster'))
                : (userRole === 'client' ? t('profile:addServicesClient') : t('profile:addServicesMaster'))}
            onAdd={!readOnly ? () => navigate(ROUTES.TICKET_CREATE) : undefined}
            onReorder={onReorder}
            onRefresh={onRefresh}
            renderViewItem={(service) => {
                const titleText = typeof service.title === 'string'
                    ? service.title
                    : (typeof service.title === 'object' && service.title && 'title' in service.title
                        ? String((service.title as { title: unknown }).title)
                        : t('profile:serviceDefault'));
                const unitText = typeof service.unit === 'string'
                    ? service.unit
                    : (typeof service.unit === 'object' && service.unit && 'title' in service.unit
                        ? String((service.unit as { title: unknown }).title)
                        : t('profile:unitDefault'));
                const budget = typeof service.budget === 'number' ? service.budget : 0;
                const priceText = (service.negotiableBudget && !budget)
                    ? t('components:app.negotiablePrice')
                    : `${budget} TJS / ${unitText}`;
                const descText = typeof service.description === 'string'
                    ? service.description
                    : (typeof service.description === 'object' && service.description && 'text' in service.description
                        ? String((service.description as { text: unknown }).text)
                        : '');
                return (
                    <div
                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', minWidth: 0 }}
                        onClick={() => navigate(ROUTES.TICKET_BY_ID(service.id))}
                    >
                        <div className={styles.service_image}>
                            <img
                                src={getServiceImage(service)}
                                alt={titleText}
                                onError={handleImageError}
                            />
                        </div>
                        <div className={styles.service_content}>
                            <div className={styles.service_header}>
                                <div className={styles.service_title}><Marquee text={titleText} alwaysScroll /></div>
                                <div className={styles.service_price}>
                                    <Marquee text={priceText} alwaysScroll />
                                </div>
                            </div>
                            {descText && (
                                <>
                                    <p className={styles.service_description_desktop}><Marquee text={descText} alwaysScroll /></p>
                                    <p className={styles.service_description_mobile}><Marquee text={descText} alwaysScroll /></p>
                                </>
                            )}
                            {service.createdAt && (
                                <div className={styles.service_date}>
                                    <Marquee
                                        text={`${t('profile:addedAt')} ${formatDate(service.createdAt)}`}
                                        alwaysScroll
                                    />
                                </div>
                            )}
                        </div>
                        <div className={styles.service_arrow}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 18L15 12L9 6" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>
                );
            }}
        />
    );
};