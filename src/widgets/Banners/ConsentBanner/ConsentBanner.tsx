import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { InfoBanner } from '../InfoBanner/InfoBanner';
import { ROUTES } from '../../../app/routers/routes';
import styles from './ConsentBanner.module.scss';

interface ConsentBannerProps {
    /** Уже переведённое начало фразы про действие, например «Добавляя адрес, вы соглашаетесь с». */
    action: string;
    className?: string;
}

/**
 * Плашка «<действие>, вы соглашаетесь с Условиями использования и Политикой конфиденциальности».
 * Ссылки открываются в новой вкладке: баннер стоит внутри заполняемой формы, и обычный переход
 * по ссылке потерял бы введённые данные. Не блокирует сохранение — это уведомление, не чекбокс.
 */
export function ConsentBanner({ action, className }: ConsentBannerProps) {
    const { t } = useTranslation(['common', 'components']);

    return (
        <InfoBanner
            className={[styles.consent_banner, className].filter(Boolean).join(' ')}
            icon={<IoInformationCircleOutline />}
            message={
                <>
                    {action}{' '}
                    <Link to={ROUTES.TERMS_OF_USE} target="_blank" rel="noopener noreferrer" className={styles.consent_link}>
                        {t('common:footer.termsOfUse')}
                    </Link>
                    {' '}{t('components:auth.and')}{' '}
                    <Link to={ROUTES.PRIVACY_POLICY} target="_blank" rel="noopener noreferrer" className={styles.consent_link}>
                        {t('common:footer.privacyPolicy')}
                    </Link>
                </>
            }
        />
    );
}
