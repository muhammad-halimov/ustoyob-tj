import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAuthToken } from '../../utils/auth';
import { ROUTES } from '../../app/routers/routes';
import { Tabs } from '../../shared/ui/Tabs';
import PageLoader from '../../widgets/PageLoader/PageLoader';
import { IoDocumentTextOutline, IoShieldCheckmarkOutline, IoReceiptOutline } from 'react-icons/io5';
import styles from './Legal.module.scss';

interface LegalDocument {
    id: number;
    type: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}

type DocumentType = 'privacy_policy' | 'terms_of_use' | 'public_offer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Legal() {
    const { t, i18n } = useTranslation('common');
    const location = useLocation();
    const navigate = useNavigate();
    const [document, setDocument] = useState<LegalDocument | null>(null);
    const [activeType, setActiveType] = useState<DocumentType>('privacy_policy');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Определяем активный тип из URL
    useEffect(() => {
        const path = location.pathname;
        if (path === ROUTES.PRIVACY_POLICY) {
            setActiveType('privacy_policy');
        } else if (path === ROUTES.TERMS_OF_USE) {
            setActiveType('terms_of_use');
        } else if (path === ROUTES.PUBLIC_OFFER) {
            setActiveType('public_offer');
        }
    }, [location.pathname]);

    // Загружаем документ с API для активного типа
    useEffect(() => {
        const fetchDocument = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const token = getAuthToken();
                
                const headers: HeadersInit = {
                    'Accept': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                };

                const locale = i18n.language || 'ru';
                const response = await fetch(`${API_BASE_URL}/api/legals?type=${activeType}&locale=${locale}`, {
                    headers
                });

                if (response.ok) {
                    const data = await response.json();
                    // API возвращает массив с одним объектом для конкретного типа
                    if (Array.isArray(data) && data.length > 0) {
                        setDocument(data[0]);
                    } else {
                        throw new Error('Document not found');
                    }
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (err) {
                console.error('Error fetching legal document:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setDocument(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDocument();
    }, [activeType, i18n.language]);

    // Переключение документа
    const handleTypeChange = (type: DocumentType) => {
        if (type !== activeType) {
            setActiveType(type);
            let newPath: string = ROUTES.PRIVACY_POLICY;
            if (type === 'terms_of_use') {
                newPath = ROUTES.TERMS_OF_USE;
            } else if (type === 'public_offer') {
                newPath = ROUTES.PUBLIC_OFFER;
            }
            navigate(newPath, { replace: true });
        }
    };

    const navTabs = [
        { key: 'terms_of_use' as DocumentType, icon: <IoDocumentTextOutline />, label: t('footer.termsOfUse', 'Условия использования') },
        { key: 'privacy_policy' as DocumentType, icon: <IoShieldCheckmarkOutline />, label: t('footer.privacyPolicy', 'Политика конфиденциальности') },
        { key: 'public_offer' as DocumentType, icon: <IoReceiptOutline />, label: t('footer.publicOffer', 'Публичная оферта') },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Tabs
                    tabs={navTabs}
                    activeTab={activeType}
                    onChange={handleTypeChange}
                />
            </div>
            <div className={styles.content}>
                {isLoading ? (
                    <div className={styles.loading_wrap}>
                        <PageLoader fullPage={false} />
                    </div>
                ) : error || !document ? (
                    <div className={styles.error}>
                        <h1>{t('error.title', 'Ошибка')}</h1>
                        <p>{error || t('legal.notFound', 'Документ не найден')}</p>
                        <p>{t('legal.tryAnotherDocument', 'Попробуйте выбрать другой документ из навигации выше')}</p>
                    </div>
                ) : (
                    <>
                        <h1 className={styles.title}>{document.title}</h1>
                        <div className={styles.meta}>
                            <p>{t('legal.lastUpdated', 'Последнее обновление')}: {new Date(document.updatedAt).toLocaleDateString('ru-RU')}</p>
                        </div>
                        <div
                            className={styles.description}
                            dangerouslySetInnerHTML={{ __html: document.description }}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default Legal;