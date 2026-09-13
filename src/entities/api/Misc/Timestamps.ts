export type Timestamps<Short extends boolean = false> =
    Short extends true
        ? { createdAt?: string }
        : { createdAt?: string; updatedAt?: string };
