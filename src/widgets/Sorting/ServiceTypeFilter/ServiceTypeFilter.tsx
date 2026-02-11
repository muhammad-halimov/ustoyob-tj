import { useTranslation } from 'react-i18next';
import styles from './ServiceTypeFilter.module.scss';

interface ServiceTypeFilterProps {
    showOnlyServices: boolean;
    showOnlyAnnouncements: boolean;
    onServiceToggle: () => void;
    onAnnouncementsToggle: () => void;
}

export const ServiceTypeFilter = ({
    showOnlyServices,
    showOnlyAnnouncements,
    onServiceToggle,
    onAnnouncementsToggle
}: ServiceTypeFilterProps) => {
    const { t } = useTranslation('category');

    return (
        <div className={styles.service_filter}>
            <div className={styles.switch_container}>
                <div className={styles.switch_label}>
                    <span className={styles.label_main}>
                        {t('filters.onlyServices')}
                    </span>
                    <span className={styles.label_sub}>
                        {t('filters.onlyServicesDesc')}
                    </span>
                </div>
                <label className={styles.switch}>
                    <input
                        type="checkbox"
                        checked={showOnlyServices}
                        onChange={onServiceToggle}
                    />
                    <span className={styles.slider}></span>
                </label>
            </div>

            <div className={styles.switch_container_second}>
                <div className={styles.switch_label}>
                    <span className={styles.label_main}>
                        {t('filters.onlyAnnouncements')}
                    </span>
                    <span className={styles.label_sub}>
                        {t('filters.onlyAnnouncementsDesc')}
                    </span>
                </div>
                <label className={styles.switch}>
                    <input
                        type="checkbox"
                        checked={showOnlyAnnouncements}
                        onChange={onAnnouncementsToggle}
                    />
                    <span className={styles.slider}></span>
                </label>
            </div>
        </div>
    );
};
