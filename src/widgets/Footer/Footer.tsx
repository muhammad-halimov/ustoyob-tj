import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../app/routers/routes';
import styles from "./Footer.module.scss";

function Footer() {
    const { t } = useTranslation('common');

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.links}>
                    <Link to={ROUTES.TERMS_OF_USE} className={styles.link}>
                        {t('footer.termsOfUse', 'Условия использования')}
                    </Link>
                    <span className={styles.separator}>•</span>
                    <Link to={ROUTES.PRIVACY_POLICY} className={styles.link}>
                        {t('footer.privacyPolicy', 'Политика конфиденциальности')}
                    </Link>
                    <span className={styles.separator}>•</span>
                    <Link to={ROUTES.PUBLIC_OFFER} className={styles.link}>
                        {t('footer.publicOffer', 'Публичная оферта')}
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;