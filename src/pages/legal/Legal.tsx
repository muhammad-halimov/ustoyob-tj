import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAuthToken } from '../../utils/auth';
import styles from './Legal.module.scss';

interface LegalDocument {
    id: number;
    type: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}

type DocumentType = 'privacy_policy' | 'terms_of_use';

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
        if (path.includes('privacy-policy')) {
            setActiveType('privacy_policy');
        } else if (path.includes('terms-of-use')) {
            setActiveType('terms_of_use');
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
    }, [activeType]);

    // Переключение документа
    const handleTypeChange = (type: DocumentType) => {
        if (type !== activeType) {
            setActiveType(type);
            const newPath = type === 'privacy_policy' ? '/privacy-policy' : '/terms-of-use';
            navigate(newPath, { replace: true });
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <p>{t('app.loading', 'Загрузка...')}</p>
                </div>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <h1>{t('error.title', 'Ошибка')}</h1>
                    <p>{error || t('legal.notFound', 'Документ не найден')}</p>
                    <button onClick={() => navigate('/')} className={styles.backButton}>
                        {t('navigation.goHome', 'На главную')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.navigation}>
                    <button 
                        className={`${styles.navButton} ${activeType === 'terms_of_use' ? styles.active : ''}`}
                        onClick={() => handleTypeChange('terms_of_use')}
                    >
                        {t('footer.termsOfUse', 'Условия использования')}
                    </button>
                    <button 
                        className={`${styles.navButton} ${activeType === 'privacy_policy' ? styles.active : ''}`}
                        onClick={() => handleTypeChange('privacy_policy')}
                    >
                        {t('footer.privacyPolicy', 'Политика конфиденциальности')}
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                <h1 className={styles.title}>{document.title}</h1>
                <div className={styles.meta}>
                    <p>{t('legal.lastUpdated', 'Последнее обновление')}: {new Date(document.updatedAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div 
                    className={styles.description}
                    dangerouslySetInnerHTML={{ __html: document.description }}
                />
            </div>
        </div>
    );
}

export default Legal;