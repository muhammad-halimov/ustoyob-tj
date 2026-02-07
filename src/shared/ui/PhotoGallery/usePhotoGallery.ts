import { useState } from 'react';

export interface UsePhotoGalleryProps {
    images: string[];
    onOpen?: () => void;
    onClose?: () => void;
    onImageChange?: (index: number) => void;
}

export const usePhotoGallery = ({ 
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
        const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
        setCurrentIndex(nextIndex);
        onImageChange?.(nextIndex);
    };

    const goToPrevious = () => {
        const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(prevIndex);
        onImageChange?.(prevIndex);
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