import { useTranslation } from 'react-i18next';
import { InstagramProfessionalNotice } from '../../InstagramProfessionalNotice';
import { Clear } from '../../Button/Clear/Clear';
import { PageLoader } from '../../../../widgets/PageLoader';
import styles from './InstagramLinkNotice.module.scss';

interface InstagramLinkNoticeProps {
    isOpen: boolean;
    /** Closes the notice without starting Instagram OAuth (× button, backdrop click, "Назад"). */
    onClose: () => void;
    /** User confirmed — go ahead and start the actual Instagram OAuth redirect. */
    onContinue: () => void;
    isLoading?: boolean;
}

/**
 * Standalone "Instagram requires a Business/Creator account" modal — Instagram closed the
 * Basic Display API (04.12.2024), so a Personal account has no way to authenticate via
 * Instagram Login. Shown pre-emptively before starting the OAuth redirect, explaining why
 * and how to switch, instead of sending the user to Meta to get an unhelpful rejection.
 *
 * Own overlay + card (modelled on Auth.tsx's modal chrome, which is where this notice
 * originally lived as one of its internal screens) — used both by Auth.tsx (login/register
 * via Instagram) and Profile.tsx (linking Instagram to an existing account), so both flows
 * show the exact same explanation instead of each hand-rolling their own wrapper.
 */
export function InstagramLinkNotice({ isOpen, onClose, onContinue, isLoading = false }: InstagramLinkNoticeProps) {
    const { t } = useTranslation(['components', 'common']);

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <Clear className={styles.closeButton} onClick={onClose} />
                <InstagramProfessionalNotice>
                    <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={onContinue}
                        disabled={isLoading}
                    >
                        {isLoading ? <PageLoader fullPage={false} compact /> : t('components:auth.instagramNoticeContinue')}
                    </button>

                    <div className={styles.links}>
                        <button
                            type="button"
                            className={styles.linkButton}
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            {t('common:app.back')}
                        </button>
                    </div>
                </InstagramProfessionalNotice>
            </div>
        </div>
    );
}

export default InstagramLinkNotice;
