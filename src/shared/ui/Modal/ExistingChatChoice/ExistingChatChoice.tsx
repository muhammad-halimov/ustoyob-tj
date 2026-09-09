import { useTranslation } from 'react-i18next';
import { Clear } from '../../Button/Clear/Clear';
import { PageLoader } from '../../../../widgets/PageLoader';
import styles from './ExistingChatChoice.module.scss';

interface ExistingChatChoiceProps {
    isOpen: boolean;
    /** Closes the notice without picking either option (× button, backdrop click, "Отмена"). */
    onClose: () => void;
    /** User picked "Продолжить в общем чате" — open the existing general chat as-is. */
    onContinueGeneral: () => void;
    /** User picked "Откликнуться на это объявление" — create a separate ticket-scoped chat. */
    onRespond: () => void;
    isLoading?: boolean;
}

/**
 * Shown before creating a ticket-scoped chat when the respondent already has a *general*
 * chat (ticket: null) with this person — see guides for the `GET /chats/me?user=` check-
 * before-respond flow. Never shown when a chat for THIS specific ad already exists (that
 * case navigates straight to it, no choice needed) or when there's no existing chat at all
 * (a new one is just created).
 *
 * Own overlay + card, modelled directly on InstagramLinkNotice — same modal chrome, so both
 * "explain, then let the user pick" flows look consistent across the app.
 */
export function ExistingChatChoice({ isOpen, onClose, onContinueGeneral, onRespond, isLoading = false }: ExistingChatChoiceProps) {
    const { t } = useTranslation(['components', 'common']);

    if (!isOpen) return null;

    // stopPropagation on both layers — unlike InstagramLinkNotice (mounted at a page's top
    // level), this modal can be rendered by Card.tsx nested inside the card's own onClick
    // (navigate-to-ticket) div, so a backdrop click closing the modal must not also bubble
    // out and trigger the card's navigation.
    return (
        <div className={styles.modalOverlay} onClick={e => { e.stopPropagation(); onClose(); }}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <Clear className={styles.closeButton} onClick={onClose} />

                <h3 className={styles.title}>{t('components:chat.existingChatTitle')}</h3>
                <p className={styles.description}>{t('components:chat.existingChatDescription')}</p>

                <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={onRespond}
                    disabled={isLoading}
                >
                    {isLoading ? <PageLoader fullPage={false} compact /> : t('components:chat.existingChatRespond')}
                </button>

                <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={onContinueGeneral}
                    disabled={isLoading}
                >
                    {t('components:chat.existingChatContinue')}
                </button>

                <div className={styles.links}>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {t('common:app.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ExistingChatChoice;
