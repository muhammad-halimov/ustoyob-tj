import type { Image } from '../Misc';
import type { User } from '../User';

export interface Gallery {
    id: string | number;
    images?: Image[];
    user?: User;
    [key: string]: unknown;
}
