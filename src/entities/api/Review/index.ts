import type { Image, Timestamps } from '../Misc';
import type { User } from '../User';
import type { Ticket } from '../Ticket';

export type Review = {
    id: string | number;
    title?: string;
    description: string;
    rating: number;
    type?: string;
    master?: User;
    client?: User;
    services?: { id: string | number; title: string };
    ticket?: Ticket;
    images: Image[];
    vacation?: string;
    worker?: string;
    date?: string;
} & Timestamps<true>;
