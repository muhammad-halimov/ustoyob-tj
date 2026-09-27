import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Clear } from '../../Button/Clear/Clear';
import { PageLoader } from '../../../../widgets/PageLoader';
import { Performers } from '../../../../pages/main/performers/Performers';
import type { PerformerItem } from '../../../../pages/main/performers/Performers';
import styles from './SelectRoleModal.module.scss';

interface SelectRoleModalProps {
    isOpen: boolean;
    /** Закрывает модалку без выбора роли — только по ×, клик по фону НЕ закрывает
     *  (случайный клик мимо карточки не должен сбрасывать уже начатый OAuth-выбор). */
    onClose: () => void;
    onSelectRole: (role: 'master' | 'client') => void;
    isLoading?: boolean;
    /** Доп. строка под заголовком — например, «Чтобы продолжить через Google» перед стартом
     *  OAuth-редиректа. Без неё — просто заголовок. */
    hint?: ReactNode;
}

/**
 * "Выберите тип аккаунта" — компактная модалка выбора роли (client/master) для РЕГИСТРАЦИИ через
 * OAuth, тот же стандалон-паттерн, что и InstagramLinkNotice (своя оверлей+карточка,
 * переиспользуется из Auth.tsx поверх текущего экрана, а не отдельный currentState/страница).
 *
 * Переиспользует тот же блок "Performers", что и полноэкранный пикер в
 * OAuthCallbackPage/TelegramCallbackPage — но с проп `forceMobile`, т.к. у Performers
 * десктоп/моб. раскладка переключается по ширине ВЬЮПОРТА, а не контейнера, и в узкой
 * модалке на широком вьюпорте без этого пропа ломается/накладывается.
 *
 * Показывается из Auth.tsx только при РЕГИСТРАЦИИ (см. beginOAuth — вызывается из кнопок на
 * экране REGISTER, не LOGIN), сразу по клику на кнопку провайдера, до открытия popup/виджета.
 * Выбор передаётся дальше через sessionStorage (`pending{Provider}Role`, читает
 * OAuthCallbackPage/TelegramCallbackPage) и применяется автоматически, без второго вопроса.
 */
export function SelectRoleModal({ isOpen, onClose, onSelectRole, isLoading = false, hint }: SelectRoleModalProps) {
    const { t } = useTranslation(['common', 'components']);

    if (!isOpen) return null;

    const roleItems: PerformerItem[] = [
        { id: 1, name: t('components:roles.customers'), title: t('components:roles.customersDesc'), img: '/img/misc/clientTest.jpg' },
        { id: 2, name: t('components:roles.masters'), title: t('components:roles.mastersDesc'), img: '/img/misc/master.jpg' },
    ];

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <Clear className={styles.closeButton} onClick={onClose} />
                <h3 className={styles.title}>{t('common:oauth.selectAccountType')}</h3>
                {hint && <p className={styles.subtitle}>{hint}</p>}
                {isLoading ? (
                    <PageLoader fullPage={false} compact />
                ) : (
                    <Performers
                        forceMobile
                        items={roleItems}
                        getButtonText={item => item.id === 1 ? t('components:auth.iAmClient') : t('components:auth.iAmSpecialist')}
                        onItemClick={item => onSelectRole(item.id === 1 ? 'client' : 'master')}
                    />
                )}
            </div>
        </div>
    );
}

export default SelectRoleModal;
