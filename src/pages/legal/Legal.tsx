import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../app/routers/routes';
import { Tabs } from '../../shared/ui/Tabs';
import PageLoader from '../../widgets/PageLoader/PageLoader';
import { IoDocumentTextOutline, IoShieldCheckmarkOutline, IoReceiptOutline } from 'react-icons/io5';
import styles from './Legal.module.scss';
import type { LegalDocument, LegalDocumentType } from '../../entities';
import { universalApiRequest } from '../../utils/apiUtils';
import type { LocaleType } from '../../utils/apiUtils';
import { resolveApiError } from '../../utils/appMessagesUtils';

/**
 * Legal documents page.
 * Serves three documents (Privacy Policy, Terms of Use, Public Offer) in tabs.
 * Content is fetched from the API per document type + locale and sanitised
 * with DOMPurify before being rendered as innerHTML.
 */
function Legal() {
    const { t, i18n } = useTranslation('common');
    const location = useLocation();
    const navigate = useNavigate();
    const [document, setDocument] = useState<LegalDocument | null>(null);
    const [activeType, setActiveType] = useState<LegalDocumentType>('privacy_policy');
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
                const locale = (i18n.language || 'tj') as LocaleType;
                const data = await universalApiRequest(`/api/legals?type=${activeType}`, { locale });
                if (Array.isArray(data) && data.length > 0) {
                    setDocument(data[0]);
                } else {
                    setDocument(null);
                }
            } catch (err) {
                console.error('Error fetching legal document:', err);
                setError(resolveApiError(err));
                setDocument(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDocument();
    }, [activeType, i18n.language]);

    // Переключение документа
    const handleTypeChange = (type: LegalDocumentType) => {
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
        { key: 'terms_of_use' as LegalDocumentType, icon: <IoDocumentTextOutline />, label: t('footer.termsOfUse', 'Условия использования') },
        { key: 'privacy_policy' as LegalDocumentType, icon: <IoShieldCheckmarkOutline />, label: t('footer.privacyPolicy', 'Политика конфиденциальности') },
        { key: 'public_offer' as LegalDocumentType, icon: <IoReceiptOutline />, label: t('footer.publicOffer', 'Публичная оферта') },
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
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(document.description) }}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default Legal;