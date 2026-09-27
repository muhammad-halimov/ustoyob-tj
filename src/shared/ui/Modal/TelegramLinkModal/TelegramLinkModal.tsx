import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Clear } from '../../Button/Clear/Clear';
import styles from './TelegramLinkModal.module.scss';

interface TelegramLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    botName: string;
}

/**
 * Отдельная модалка для привязки Telegram к уже существующему аккаунту (Profile.tsx) — тот
 * же виджет telegram-widget.js, что и в Auth.tsx, но здесь рендерится как обычная React-модалка
 * (см. InstagramLinkNotice — та же схема overlay/modalContent/Clear), а не собирается вручную
 * через document.createElement, как было раньше.
 *
 * data-auth-url, не data-onauth — у telegram-widget.js data-onauth разбирает атрибут через
 * eval() (window.__parseFunction), а наш CSP (script-src без 'unsafe-eval', см. index.html)
 * такой eval блокирует — виджет ломается на инициализации, кнопка вообще не рендерится.
 */
export function TelegramLinkModal({ isOpen, onClose, botName }: TelegramLinkModalProps) {
    const { t } = useTranslation('profile');
    const widgetContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !widgetContainerRef.current) return;
        const container = widgetContainerRef.current;

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-radius', '10');
        script.setAttribute('data-auth-url', `${window.location.origin}/auth/telegram/callback`);
        script.setAttribute('data-request-access', 'write');
        container.appendChild(script);

        return () => { container.innerHTML = ''; };
    }, [isOpen, botName]);

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <Clear className={styles.closeButton} onClick={onClose} />
                <p className={styles.title}>{t('oauth.linkTelegramTitle')}</p>
                <div ref={widgetContainerRef} className={styles.widgetWrap} />
            </div>
        </div>
    );
}

export default TelegramLinkModal;
