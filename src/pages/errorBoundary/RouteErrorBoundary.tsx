import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../app/routers/routes';
import { EmptyState } from '../../widgets/EmptyState';
import styles from './RouteErrorBoundary.module.scss';

/**
 * Prod-only fallback for react-router's own error boundary (`errorElement`).
 *
 * Without an `errorElement`, any unhandled render/loader/action error in the route tree
 * falls through to React Router's built-in default — the "💿 Hey developer" page, which is
 * genuinely useful in dev (shows the real stack) but is not something an end user should
 * ever see. Wired conditionally via `import.meta.env.PROD` in routers/index.tsx — dev keeps
 * seeing the raw error for debugging, prod gets this instead.
 *
 * Deliberately generic ("something broke"), unlike NotFound — this only ever fires for a
 * genuine thrown error, never for an unmatched route (that's ROUTE_PATTERNS.NOT_FOUND).
 */
function RouteErrorBoundary() {
    const { t } = useTranslation('common');
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <EmptyState
                title={t('error.title', 'Что-то пошло не так')}
                subtitle={t('error.subtitle', 'Произошла непредвиденная ошибка. Попробуйте вернуться на главную и повторить действие.')}
                actionText={t('error.goHome', 'На главную')}
                onAction={() => navigate(ROUTES.HOME)}
            />
        </div>
    );
}

export default RouteErrorBoundary;
