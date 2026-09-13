import { useState, useEffect } from 'react';
import React from 'react';
import DOMPurify from 'dompurify';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../app/routers/routes';
import { Tabs } from '../../shared/ui/Tabs';
import { EmptyState } from '../../widgets/EmptyState';
import { IoDocumentTextOutline, IoShieldCheckmarkOutline, IoReceiptOutline, IoHeadsetOutline } from 'react-icons/io5';
import styles from './Legal.module.scss';
import type { LegalDocument, LegalDocumentType } from '../../entities';
import { getLegalDocuments } from '../../utils/dataCacheUtils';
import { resolveApiError } from '../../utils/appMessagesUtils';
import TechSupportForm, { type TechSupportProps as _TSP } from '../support/TechSupport';

const EmbeddedTechSupport = TechSupportForm as React.ComponentType<_TSP>;

type PageTab = LegalDocumentType | 'tech_support';

/**
 * Legal documents page.
 * Serves three documents (Privacy Policy, Terms of Use, Public Offer) in tabs.
 * Content is fetched from the API per document type + locale and sanitised
 * with DOMPurify before being rendered as innerHTML.
 */
function getTabFromPath(pathname: string): PageTab {
    if (pathname === ROUTES.TERMS_OF_USE) return 'terms_of_use';
    if (pathname === ROUTES.PUBLIC_OFFER) return 'public_offer';
    if (pathname === ROUTES.TECH_SUPPORT) return 'tech_support';
    return 'privacy_policy';
}

function Legal() {
    const { t, i18n } = useTranslation('common');
    const location = useLocation();
    const navigate = useNavigate();
    const [document, setDocument] = useState<LegalDocument | null>(null);
    // Инициализируем сразу из URL — без задержки через useEffect
    const [activeType, setActiveType] = useState<PageTab>(() => getTabFromPath(location.pathname));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Синхронизируем вкладку при навигации назад/вперёд
    useEffect(() => {
        setActiveType(getTabFromPath(location.pathname));
    }, [location.pathname]);

    // Загружаем документ с API для активного типа
    useEffect(() => {
        const fetchDocument = async () => {
            if (activeType === 'tech_support') {
                setDocument(null);
                setIsLoading(false);
                setError(null);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const data = await getLegalDocuments(i18n.language, `type=${activeType}`);
                setDocument(data.length > 0 ? data[0] : null);
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
    const handleTypeChange = (type: PageTab) => {
        if (type !== activeType) {
            setActiveType(type);
            let newPath: string = ROUTES.PRIVACY_POLICY;
            if (type === 'terms_of_use') {
                newPath = ROUTES.TERMS_OF_USE;
            } else if (type === 'public_offer') {
                newPath = ROUTES.PUBLIC_OFFER;
            } else if (type === 'tech_support') {
                newPath = ROUTES.TECH_SUPPORT;
            }
            navigate(newPath, { replace: true });
        }
    };

    const navTabs = [
        { key: 'terms_of_use' as PageTab, icon: <IoDocumentTextOutline />, label: t('footer.termsOfUse', 'Условия использования') },
        { key: 'privacy_policy' as PageTab, icon: <IoShieldCheckmarkOutline />, label: t('footer.privacyPolicy', 'Политика конфиденциальности') },
        { key: 'public_offer' as PageTab, icon: <IoReceiptOutline />, label: t('footer.publicOffer', 'Публичная оферта') },
        { key: 'tech_support' as PageTab, icon: <IoHeadsetOutline />, label: t('footer.techSupport', 'Техподдержка') },
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
                {activeType === 'tech_support' ? (
                    <EmbeddedTechSupport embedded />
                ) : isLoading ? (
                    <div className={styles.emptyWrap}>
                        <EmptyState isLoading />
                    </div>
                ) : error || !document ? (
                    <div className={styles.emptyWrap}>
                        <EmptyState
                            title={error || t('legal.notFound', 'Документ не найден')}
                            subtitle={t('legal.tryAnotherDocument', 'Попробуйте выбрать другой документ из навигации выше')}
                        />
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