import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoNotificationsOutline } from 'react-icons/io5';
import { InfoBanner } from '../InfoBanner/InfoBanner';
import { Clear } from '../../../shared/ui/Button/Clear/Clear';
import { enableNativePush, nativePushState, type NativePushState } from '../../../utils/nativePush';
import { onPageSeen } from '../../../utils/pageAttention';
import styles from './NativePushPrompt.module.scss';

/**
 * Мобильное приложение: плашка «Включите уведомления», пока уведомления не разрешены (см. utils/nativePush.ts).
 * Система ещё может спросить — «Включить» показывает системный запрос; уже не спросит (отказались) — «Открыть
 * настройки» ведёт в настройки уведомлений приложения. Вернулись в приложение с разрешением — плашка пропадает.
 * «×» скрывает её до следующего захода на экран. На сайте не показывается (там PushPrompt).
 */
export function NativePushPrompt({ className }: { className?: string }) {
    const { t } = useTranslation('components');
    const [state, setState] = useState<NativePushState>('unavailable');
    const [dismissed, setDismissed] = useState(false);

    const refresh = useCallback(() => { void nativePushState().then(setState); }, []);
    useEffect(() => {
        refresh();
        return onPageSeen(refresh);
    }, [refresh]);

    if (dismissed || state === 'granted' || state === 'unavailable') return null;

    const blocked = state === 'denied';

    return (
        <div className={`${styles.wrap} ${className ?? ''}`}>
            <InfoBanner
                className={styles.banner}
                icon={<IoNotificationsOutline />}
                message={blocked ? t('chat.nativePushBlocked') : t('chat.pushPrompt')}
                buttonLabel={blocked ? t('chat.pushPromptOpenSettings') : t('chat.pushPromptEnable')}
                onButtonClick={() => { void enableNativePush().then(setState); }}
            />
            <Clear className={styles.close} onClick={() => setDismissed(true)} ariaLabel={t('chat.pushPromptDismiss')} />
        </div>
    );
}
