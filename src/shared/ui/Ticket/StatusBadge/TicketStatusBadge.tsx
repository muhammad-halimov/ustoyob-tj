import { useTranslation } from 'react-i18next';
import { IoBanOutline, IoTimeOutline } from 'react-icons/io5';
import { Marquee } from '../../Text/Marquee';
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
                <Marquee text={t('app.banned')} alwaysScroll />
            </span>
        );
    }

    if (approved === false) {
        return (
            <span className={`${styles.badge} ${styles.unapproved}`}>
                <IoTimeOutline />
                <Marquee text={t('app.notApproved')} alwaysScroll />
            </span>
        );
    }

    return null;
}
