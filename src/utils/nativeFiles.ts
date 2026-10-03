/**
 * Выбор файлов (`<input type="file">`) в приложении. Только мобильная сборка.
 *
 * Android WebView отдаёт выбранное фото не байтами, а ссылкой на файл системного выбора (content://),
 * и читает его лениво — тогда, когда файл понадобился. Сразу после выбора это работает (превью
 * показывается), а через некоторое время тот же File уже не читается: сжатие перед загрузкой падает,
 * и загрузка фото обрывается без ответа сервера — «Failed to fetch». То же фото, выбранное заново и
 * отправленное сразу, уходит.
 *
 * Поэтому байты забираются в память в момент выбора, пока файл точно доступен, — дальше превью, сжатие,
 * загрузка и повторы работают с копией и от системного выбора не зависят. Делается для всех полей выбора
 * сразу: исходное событие change останавливается до обработчиков страницы, файлы поля подменяются копиями,
 * и change отправляется заново.
 */
import { Capacitor } from '@capacitor/core';

/** Копия файла в памяти. Не прочитался — исходный файл как есть (дальше разберётся загрузка). */
export const fileToMemory = async (file: File): Promise<File> => {
    try {
        return new File([await file.arrayBuffer()], file.name, { type: file.type, lastModified: file.lastModified });
    } catch {
        return file;
    }
};

export function initNativeFileInputs(): void {
    if (!Capacitor.isNativePlatform()) return;

    const resent = new WeakSet<Event>();
    window.addEventListener('change', (e) => {
        const input = e.target;
        if (!(input instanceof HTMLInputElement) || input.type !== 'file' || resent.has(e)) return;
        const files = Array.from(input.files ?? []);
        if (files.length === 0) return;
        e.stopImmediatePropagation();
        void Promise.all(files.map(fileToMemory)).then((copies) => {
            const list = new DataTransfer();
            copies.forEach((file) => list.items.add(file));
            input.files = list.files;
            const again = new Event('change', { bubbles: true });
            resent.add(again);
            input.dispatchEvent(again);
        });
    }, true);
}
