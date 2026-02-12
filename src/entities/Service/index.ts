export interface ServiceImage {
    id: number;
    image: string;
    url?: string;
    path?: string;
}

export interface Service {
    id: number;
    title: string;
    description?: string;
    budget: number;
    price?: number; // deprecated, используется budget
    unit: string | { id: number; title: string };
    createdAt?: string;
    active?: boolean;
    images?: ServiceImage[];
}

export interface ServiceApiData extends Service {
    // Дополнительные поля API если нужно
}