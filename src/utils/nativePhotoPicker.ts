import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';
import { Capacitor } from '@capacitor/core';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import type { MouseEvent } from 'react';

interface NativePhotoPickerOptions {
    multiple: boolean;
    cameraLabel: string;
    photosLabel: string;
    cancelLabel: string;
}

/** Opens the native camera/gallery and forwards selected files through the input's existing React change handler. */
export async function handleNativePhotoPickerClick(
    event: MouseEvent<HTMLInputElement>,
    input: HTMLInputElement,
    options: NativePhotoPickerOptions
): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    event.preventDefault();
    if (input.dataset.nativePickerOpen === 'true') return;
    input.dataset.nativePickerOpen = 'true';

    try {
        const action = await ActionSheet.showActions({
            title: options.photosLabel,
            options: [
                { title: options.cameraLabel },
                { title: options.photosLabel },
                { title: options.cancelLabel, style: ActionSheetButtonStyle.Cancel },
            ],
        });

        if (action.index === 0) {
            const photo = await Camera.takePhoto({ quality: 90, correctOrientation: true });
            const file = await mediaToFile(photo.webPath ?? photo.uri, 'camera-photo.jpg');
            if (file) dispatchFiles(input, [file]);
        } else if (action.index === 1) {
            const { results } = await Camera.chooseFromGallery({
                mediaType: MediaTypeSelection.Photo,
                allowMultipleSelection: options.multiple,
            });
            const files = await Promise.all(results.map((photo, index) =>
                mediaToFile(photo.webPath ?? photo.uri, `photo-${Date.now()}-${index + 1}.jpg`)
            ));
            dispatchFiles(input, files.filter((file): file is File => file !== null));
        }
    } catch (error) {
        console.error('Unable to open native photo picker:', error);
    } finally {
        delete input.dataset.nativePickerOpen;
    }
}

async function mediaToFile(path: string | undefined, fallbackName: string): Promise<File | null> {
    if (!path) return null;
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Unable to read selected photo (${response.status})`);
    const blob = await response.blob();
    const type = blob.type || 'image/jpeg';
    const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], fallbackName.replace(/\.jpg$/i, `.${extension}`), {
        type,
        lastModified: Date.now(),
    });
}

function dispatchFiles(input: HTMLInputElement, files: File[]): void {
    if (!files.length) return;
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
}
