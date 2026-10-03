import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoNotificationsOutline } from 'react-icons/io5';
import { InfoBanner } from '../InfoBanner/InfoBanner';
import { Clear } from '../../../shared/ui/Button/Clear/Clear';
import { enableWebPush, webPushPermission, webPushSupported } from '../../../utils/webPush';
import styles from './PushPrompt.module.scss';

/**
 * Плашка «Включите уведомления» — разрешение на уведомления браузер даёт спросить только по нажатию (см.
 * utils/webPush.ts). Показывается, пока разрешения нет (браузер умеет push и Firebase настроен): «×» скрывает
 * её только до следующего захода на страницу. Уведомления запрещены в браузере — сайт уже не может спросить
 * сам, вместо кнопки подсказка, где разрешить.
 */
export function PushPrompt({ className }: { className?: string }) {
    const { t } = useTranslation('components');
    const [supported, setSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>(webPushPermission);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        webPushSupported().then(ok => { if (!cancelled) setSupported(ok); });
        return () => { cancelled = true; };
    }, []);

    if (!supported || dismissed || permission === 'granted') return null;

    const blocked = permission === 'denied';

    return (
        <div className={`${styles.wrap} ${className ?? ''}`}>
            <InfoBanner
                className={styles.banner}
                icon={<IoNotificationsOutline />}
                message={blocked ? t('chat.pushPromptBlocked') : t('chat.pushPrompt')}
                buttonLabel={blocked ? undefined : t('chat.pushPromptEnable')}
                onButtonClick={blocked ? undefined : () => {
                    void enableWebPush().finally(() => setPermission(webPushPermission()));
                }}
            />
            <Clear className={styles.close} onClick={() => setDismissed(true)} ariaLabel={t('chat.pushPromptDismiss')} />
        </div>
    );
}
