import React from 'react';
import AuthModal from '../../../features/auth/AuthModal';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess?: (token: string, email?: string) => void;
}

const AuthModalWrapper: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    return (
        <AuthModal
            isOpen={isOpen}
            onClose={onClose}
            onLoginSuccess={() => {
            }}
        />
    );
};

export default AuthModalWrapper;