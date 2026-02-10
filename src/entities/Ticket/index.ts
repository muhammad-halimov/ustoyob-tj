export interface TicketImage {
    id: number;
    image: string;
}

export interface TicketMaster {
    id: number;
    name: string;
    surname: string;
    patronymic?: string;
    email?: string;
    image?: string;
    rating?: number;
}

export interface TicketAuthor {
    id: number;
    name: string;
    surname: string;
    patronymic?: string;
    email?: string;
    image?: string;
}

export interface Ticket {
    id: number;
    title: string;
    description?: string;
    price?: number;
    unit?: string;
    service: boolean;
    active: boolean;
    urgent?: boolean;
    createdAt?: string;
    updatedAt?: string;
    author?: TicketAuthor;
    master?: TicketMaster;
    images?: TicketImage[];
    category?: import('../Occupation').Occupation;
    address?: string;
    city?: import('../Address').City;
    district?: import('../Address').District;
    suburb?: import('../Address').Suburb;
}

export interface FavoriteTicket extends Ticket {
    isFavorite?: boolean;
}

export interface ApiTicket extends Ticket {
    // API специфичные поля
    [key: string]: unknown;
}

export interface LocalStorageFavorites {
    tickets: number[];
    masters: number[];
}

export interface FormattedTicket {
    id: number;
    title: string;
    description?: string;
    price?: number;
    unit?: string;
    createdAt?: string;
    master?: TicketMaster;
    images?: TicketImage[];
    address?: string;
    urgent?: boolean;
}

export interface SearchResult {
    type: 'service' | 'request';
    id: number;
    title: string;
    description?: string;
    price?: number;
    unit?: string;
    master?: TicketMaster;
    client?: TicketAuthor;
    images?: TicketImage[];
    city?: string;
    address?: string;
    createdAt?: string;
}