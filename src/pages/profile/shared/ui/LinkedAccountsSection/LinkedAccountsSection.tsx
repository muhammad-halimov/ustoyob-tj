import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileSection } from '../ProfileSection';
import styles from './LinkedAccountsSection.module.scss';

export interface LinkedProvider {
    provider: 'google' | 'facebook' | 'instagram' | 'telegram';
    linkedAt: string;
}

interface LinkedAccountsSectionProps {
    providers: LinkedProvider[];
    loading: boolean;
    readOnly: boolean;
    onLink: (provider: string) => void;
    onUnlink: (provider: string) => void;
}

const ALL_PROVIDERS: LinkedProvider['provider'][] = ['google', 'facebook', 'instagram', 'telegram'];

interface ProviderItem {
    id: string;
}

const PROVIDER_ITEMS: ProviderItem[] = ALL_PROVIDERS.map(p => ({ id: p }));

const ProviderIcon: React.FC<{ provider: LinkedProvider['provider'] }> = ({ provider }) => {
    if (provider === 'google') {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
        );
    }
    if (provider === 'facebook') {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
        );
    }
    if (provider === 'instagram') {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <defs>
                    <radialGradient id="ig_grad" cx="30%" cy="107%" r="150%">
                        <stop offset="0%" stopColor="#ffd879"/>
                        <stop offset="30%" stopColor="#f77737"/>
                        <stop offset="60%" stopColor="#e1306c"/>
                        <stop offset="100%" stopColor="#833ab4"/>
                    </radialGradient>
                </defs>
                <rect width="24" height="24" rx="6" fill="url(#ig_grad)"/>
                <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.8" fill="none"/>
                <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
            </svg>
        );
    }
    // telegram
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#229ED9">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
        </svg>
    );
};

export const LinkedAccountsSection: React.FC<LinkedAccountsSectionProps> = ({
    providers,
    loading,
    onLink,
    onUnlink,
}) => {
    const { t } = useTranslation('profile');

    const linkedSet = new Set(providers.map(p => p.provider));
    const isOnlyOneLinked = providers.length === 1;

    const formatDate = (isoDate: string) => {
        try {
            const d = new Date(isoDate);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}.${month}.${year}`;
        } catch {
            return isoDate;
        }
    };

    return (
        <ProfileSection<ProviderItem>
            title={t('oauth.sectionTitle')}
            items={loading ? [] : PROVIDER_ITEMS}
            editingId={null}
            readOnly={true}
            isLoading={loading}
            emptyTitle=""
            renderViewItem={(providerItem) => {
                const provider = providerItem.id as LinkedProvider['provider'];
                const linkedEntry = providers.find(p => p.provider === provider);
                const isLinked = linkedSet.has(provider);
                const isLastLinked = isOnlyOneLinked && isLinked;
                return (
                    <>
                        <div className={styles.provider_icon}>
                            <ProviderIcon provider={provider} />
                        </div>
                        <div className={styles.provider_info}>
                            <div className={styles.provider_name}>
                                {t(`oauth.provider.${provider}`)}
                            </div>
                            <div className={`${styles.provider_status} ${isLinked ? styles.linked : styles.unlinked}`}>
                                {isLinked
                                    ? `${t('oauth.linked')} ${formatDate(linkedEntry!.linkedAt)}`
                                    : t('oauth.notLinked')}
                            </div>
                        </div>
                        {isLinked ? (
                            <div className={isLastLinked ? styles.tooltip_wrapper : undefined}>
                                <button
                                    className={`${styles.action_btn} ${styles.unlink_btn}`}
                                    onClick={() => {
                                        const name = t(`oauth.provider.${provider}`);
                                        if (window.confirm(t('oauth.unlinkConfirm', { provider: name }))) {
                                            onUnlink(provider);
                                        }
                                    }}
                                    disabled={isLastLinked}
                                >
                                    {t('oauth.unlinkBtn')}
                                </button>
                                {isLastLinked && (
                                    <span className={styles.tooltip}>{t('oauth.lastAuthMethod')}</span>
                                )}
                            </div>
                        ) : (
                            <button
                                className={`${styles.action_btn} ${styles.link_btn}`}
                                onClick={() => onLink(provider)}
                            >
                                {t('oauth.linkBtn')}
                            </button>
                        )}
                    </>
                );
            }}
        />
    );
};
