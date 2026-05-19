import type { User } from '../User';

// MultipleImage на бэке — одна сущность для всего. На фронте — один тип.
export interface Image {
    id: number;
    image: string;
    priority?: number;
    author?: User | null;
    createdAt?: string | null;
}
