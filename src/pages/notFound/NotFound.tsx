import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../app/routers/routes';
import { EmptyState } from '../../widgets/EmptyState';
import { Back } from '../../shared/ui/Button/Back/Back';
import styles from './NotFound.module.scss';

/**
 * Catch-all 404 page. Rendered inside the shared Layout (header/footer stay visible)
 * for any URL that doesn't match a known route pattern — see ROUTE_PATTERNS.NOT_FOUND.
 * Composed from existing shared widgets (EmptyState, Back) instead of bespoke markup.
 */
function NotFound() {
    const { t } = useTranslation('common');
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <Back fallbackPath={ROUTES.HOME} />
            <EmptyState
                title={`404 — ${t('notFound.title', 'Страница не найдена')}`}
                subtitle={t('notFound.subtitle', 'Такой страницы не существует, либо она была перемещена или удалена.')}
                actionText={t('notFound.goHome', 'На главную')}
                onAction={() => navigate(ROUTES.HOME)}
            />
        </div>
    );
}

export default NotFound;
