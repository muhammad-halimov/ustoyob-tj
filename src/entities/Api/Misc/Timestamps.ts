/**
 * Adds `createdAt` (and optionally `updatedAt`) fields to any entity.
 * Use `Timestamps<true>` when the backend only returns `createdAt`.
 */
export type Timestamps<Short extends boolean = false> =
    Short extends true
        ? { createdAt?: string }
        : { createdAt?: string; updatedAt?: string };
