import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from "./Footer.module.scss";

function Footer() {
    const { t } = useTranslation('common');

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.links}>
                    <Link to="/terms-of-use" className={styles.link}>
                        {t('footer.termsOfUse', 'Условия использования')}
                    </Link>
                    <span className={styles.separator}>•</span>
                    <Link to="/privacy-policy" className={styles.link}>
                        {t('footer.privacyPolicy', 'Политика конфиденциальности')}
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;