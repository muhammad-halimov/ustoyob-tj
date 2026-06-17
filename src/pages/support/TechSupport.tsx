import { useTranslation } from 'react-i18next';
import styles from './TechSupport.module.scss';

function TechSupport() {
    const { t } = useTranslation('common');

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{t('footer.techSupport')}</h1>
        </div>
    );
}

export default TechSupport;
