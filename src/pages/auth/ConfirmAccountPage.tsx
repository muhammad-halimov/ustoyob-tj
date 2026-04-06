import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../app/routers/routes';
import { PageLoader } from '../../widgets/PageLoader';
import Status from '../../shared/ui/Modal/Status';
import { useTranslation } from 'react-i18next';

const ConfirmAccountPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation('common');
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        if (!token) {
            setError(t('confirmAccount.invalidLink'));
            setLoading(false);
            return;
        }

        const confirm = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/confirm-account/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                if (!response.ok) {
                    setError(t('confirmAccount.linkExpired'));
                    setLoading(false);
                    return;
                }

                setSuccess(true);
                setTimeout(() => navigate(ROUTES.HOME, { replace: true }), 3000);
            } catch {
                setError(t('confirmAccount.error'));
            } finally {
                setLoading(false);
            }
        };

        confirm();
    }, [token, API_BASE_URL, navigate, t]);

    if (loading) {
        return <PageLoader text={t('confirmAccount.loading')} />;
    }

    if (success) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', gap: '16px' }}>
                <span style={{ fontSize: '52px', color: 'var(--color-actual-blue)' }}>✓</span>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', margin: 0 }}>{t('confirmAccount.success')}</p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>{t('confirmAccount.redirecting')}</p>
            </div>
        );
    }

    return (
        <Status
            type="error"
            isOpen={!!error}
            onClose={() => navigate(ROUTES.HOME)}
            message={error}
        />
    );
};

export default ConfirmAccountPage;
