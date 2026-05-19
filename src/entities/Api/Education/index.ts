import type { Occupation } from '../Occupation';

export interface Education {
    id: number;
    title?: string;
    beginning?: number;
    ending?: number;
    graduated?: boolean;
    occupation?: string | Occupation | Occupation[];
    [key: string]: unknown;
}
