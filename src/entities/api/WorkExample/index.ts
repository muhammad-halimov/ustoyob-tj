import type { Ticket } from '../Ticket';
import type { PhotoSource } from '../Misc';

export type WorkExample = Pick<Ticket, 'id' | 'title' | 'description'> & {
    image: string;
    url?: string;
    /** Превью/WebP/BlurHash от бэка (см. toPhotoSource). `image` — оригинал, как раньше. */
    source?: PhotoSource;
};
