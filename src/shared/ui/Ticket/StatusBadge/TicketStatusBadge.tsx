import { useTranslation } from 'react-i18next';
import { IoBanOutline, IoTimeOutline } from 'react-icons/io5';
import styles from './TicketStatusBadge.module.scss';

interface TicketStatusBadgeProps {
    approved?: boolean;
    banned?: boolean;
}

export function TicketStatusBadge({ approved, banned }: TicketStatusBadgeProps) {
    const { t } = useTranslation('components');

    if (banned) {
        return (
            <span className={`${styles.badge} ${styles.banned}`}>
                <IoBanOutline />
                {t('app.banned')}
            </span>
        );
    }

    if (approved === false) {
        return (
            <span className={`${styles.badge} ${styles.unapproved}`}>
                <IoTimeOutline />
                {t('app.notApproved')}
            </span>
        );
    }

    return null;
}
