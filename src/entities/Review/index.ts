export interface ReviewImage {
    id: number;
    image: string;
}

export interface ReviewUser {
    id: number;
    email: string;
    name: string;
    surname: string;
    rating: number;
    image: string;
    imageExternalUrl?: string;
}

export interface ReviewService {
    id: number;
    title: string;
}

export interface ReviewTicket {
    id: number;
    title: string;
    service: boolean;
    active: boolean;
    author?: ReviewUser;
    master?: ReviewUser;
}

export interface Review {
    id: number;
    user: ReviewUser;
    reviewer: ReviewUser;
    rating: number;
    description: string;
    forReviewer: boolean;
    services: ReviewService;
    ticket?: ReviewTicket;
    images: ReviewImage[];
    vacation?: string;
    worker?: string;
    date?: string;
}

export interface ReviewData {
    type: string;
    rating: number;
    description: string;
    ticket?: string;
    images?: Array<{ image: string }>;
    master: string;
    client: string;
}

export interface ReviewApiData {
    id: number;
    master?: { id: number };
    client?: { id: number };
    rating?: number;
    description?: string;
    forClient?: boolean;
    services?: { id: number; title: string };
    ticket?: ReviewTicket;
    images?: ReviewImage[];
    createdAt?: string;
    [key: string]: unknown;
}

// Для разных компонентов где используются отзывы
export interface ReviewMaster {
    id: number;
    name: string;
    surname: string;
    patronymic?: string;
    image?: string;
    imageExternalUrl?: string;
    rating?: number;
    reviews?: number;
}