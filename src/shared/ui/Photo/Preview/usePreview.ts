import { useState } from 'react';

export interface UsePhotoGalleryProps {
    images: string[];
    onOpen?: () => void;
    onClose?: () => void;
    onImageChange?: (index: number) => void;
}

export const usePreview = ({
    images, 
    onOpen, 
    onClose,
    onImageChange 
}: UsePhotoGalleryProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const openGallery = (startIndex: number = 0) => {
        setCurrentIndex(startIndex);
        setIsOpen(true);
        onOpen?.();
    };

    const closeGallery = () => {
        setIsOpen(false);
        setCurrentIndex(0);
        onClose?.();
    };

    const goToNext = () => {
        setCurrentIndex(prev => {
            const nextIndex = prev === images.length - 1 ? 0 : prev + 1;
            onImageChange?.(nextIndex);
            return nextIndex;
        });
    };

    const goToPrevious = () => {
        setCurrentIndex(prev => {
            const prevIndex = prev === 0 ? images.length - 1 : prev - 1;
            onImageChange?.(prevIndex);
            return prevIndex;
        });
    };

    const selectImage = (index: number) => {
        setCurrentIndex(index);
        onImageChange?.(index);
    };

    return {
        isOpen,
        currentIndex,
        openGallery,
        closeGallery,
        goToNext,
        goToPrevious,
        selectImage
    };
};