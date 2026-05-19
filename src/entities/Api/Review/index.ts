import type { Image, Timestamps } from '../Misc';
import type { User } from '../User';
import type { Ticket } from '../Ticket';

export type Review = {
    id: number;
    title?: string;
    description: string;
    rating: number;
    type?: string;
    master?: User;
    client?: User;
    services?: { id: number; title: string };
    ticket?: Ticket;
    images: Image[];
    vacation?: string;
    worker?: string;
    date?: string;
} & Timestamps<true>;
