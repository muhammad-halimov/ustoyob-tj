import type { Image } from '../Misc';
import type { User } from '../User';

export interface Gallery {
    id: number;
    images?: Image[];
    user?: User;
    [key: string]: unknown;
}
