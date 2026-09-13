import type { Ticket } from '../Ticket';

export type WorkExample = Pick<Ticket, 'id' | 'title' | 'description'> & {
    image: string;
    url?: string;
};
