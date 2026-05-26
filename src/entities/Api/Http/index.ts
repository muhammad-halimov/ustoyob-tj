/**
 * Hydra-paginated collection response from the API (JSON-LD).
 * Used with endpoints that return a `hydra:member` array and `hydra:totalItems`.
 */
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

/**
 * Generic API response shape for endpoints that may or may not return
 * a Hydra collection.  Use `HydraResponse<T>` when you know the endpoint
 * always returns a collection.
 */
export interface ApiResponse<T> {
    [key: string]: unknown;
    'hydra:member'?: T[];
    'hydra:totalItems'?: number;
}
