import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose, IoNotificationsOutline } from 'react-icons/io5';
import { InfoBanner } from '../InfoBanner/InfoBanner';
import { enableWebPush, webPushPermission, webPushSupported } from '../../../utils/webPush';
import { getStorageItem, setStorageItem } from '../../../utils/storageUtils';
import styles from './PushPrompt.module.scss';

const DISMISSED_KEY = 'webPushPromptDismissed';

/**
 * Плашка «Включите уведомления» — разрешение на уведомления браузер даёт спросить только по нажатию (см.
 * utils/webPush.ts). Показывается, пока разрешение не спрашивали, браузер умеет push и Firebase настроен.
 * «×» скрывает её насовсем (в этом браузере); отказ в разрешении — тоже.
 */
export function PushPrompt({ className }: { className?: string }) {
    const { t } = useTranslation('components');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (getStorageItem(DISMISSED_KEY) || webPushPermission() !== 'default') return;
        webPushSupported().then(ok => { if (!cancelled && ok) setVisible(true); });
        return () => { cancelled = true; };
    }, []);

    if (!visible) return null;

    const dismiss = () => {
        setStorageItem(DISMISSED_KEY, '1');
        setVisible(false);
    };

    return (
        <div className={`${styles.wrap} ${className ?? ''}`}>
            <InfoBanner
                className={styles.banner}
                icon={<IoNotificationsOutline />}
                message={t('chat.pushPrompt')}
                buttonLabel={t('chat.pushPromptEnable')}
                onButtonClick={() => {
                    void enableWebPush().then(() => {
                        // Разрешили или отказали — спрашивать больше нечего; закрыли окно, не ответив, — плашка остаётся.
                        if (webPushPermission() !== 'default') setVisible(false);
                    });
                }}
            />
            <button type="button" className={styles.close} onClick={dismiss} aria-label={t('chat.pushPromptDismiss')} title={t('chat.pushPromptDismiss')}>
                <IoClose />
            </button>
        </div>
    );
}
