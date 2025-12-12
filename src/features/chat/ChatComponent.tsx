import React, { useState, useEffect } from 'react';
import { createChatWithAuthor, initChatModals } from '../../utils/chatUtils';
import styles from './ChatComponent.module.scss';

const ChatComponent: React.FC = () => {
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        initChatModals({
            showSuccessModal: (message: string) => {
                setModalMessage(message);
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 3000);
            },
            showErrorModal: (message: string) => {
                setModalMessage(message);
                setShowErrorModal(true);
                setTimeout(() => setShowErrorModal(false), 3000);
            },
            showInfoModal: (message: string) => {
                setModalMessage(message);
                setShowInfoModal(true);
                setTimeout(() => setShowInfoModal(false), 3000);
            }
        });
    }, []);

    const handleCreateChat = async () => {
        const chat = await createChatWithAuthor(123); // Пример ID пользователя
        if (chat) {
            // Дополнительные действия при успешном создании чата
        }
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);
        setShowErrorModal(false);
        setShowInfoModal(false);
    };

    return (
        <div>
            <button onClick={handleCreateChat}>Создать чат</button>

            {/* Модалка успеха */}
            {showSuccessModal && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.successTitle}>Успешно!</h2>
                        <div className={styles.successIcon}>
                            <img src="./uspeh.png" alt="Успех"/>
                        </div>
                        <p className={styles.successMessage}>{modalMessage}</p>
                        <button
                            className={styles.successButton}
                            onClick={handleCloseModal}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}

            {/* Модалка ошибки (можно использовать те же стили с другим цветом) */}
            {showErrorModal && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.errorTitle}>Ошибка</h2>
                        <div className={styles.errorIcon}>
                            <img src="./error.png" alt="Ошибка"/>
                        </div>
                        <p className={styles.errorMessage}>{modalMessage}</p>
                        <button
                            className={styles.errorButton}
                            onClick={handleCloseModal}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}

            {/* Модалка информации */}
            {showInfoModal && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.infoTitle}>Информация</h2>
                        <p className={styles.infoMessage}>{modalMessage}</p>
                        <button
                            className={styles.infoButton}
                            onClick={handleCloseModal}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatComponent;