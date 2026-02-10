export interface Occupation {
    id: number;
    title: string;
    description?: string;
    slug?: string;
    [key: string]: unknown;
}

export interface OccupationApiData {
    id: number;
    title: string;
    [key: string]: unknown;
}