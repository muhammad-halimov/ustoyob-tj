export interface HydraResponse<T> {
    'hydra:member': T[];
    'hydra:totalItems': number;
    'hydra:view'?: {
        '@id': string;
        'hydra:first': string;
        'hydra:last': string;
        'hydra:next'?: string;
        'hydra:previous'?: string;
    };
    [key: string]: unknown;
}

export interface ApiResponse<T> {
    [key: string]: unknown;
    'hydra:member'?: T[];
    'hydra:totalItems'?: number;
}
