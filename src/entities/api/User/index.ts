import type { Occupation } from '../Occupation';
import type { Education } from '../Education';
import type { Address } from '../Address';
import type { SocialNetwork } from '../SocialNetwork';
import type { Phone } from '../Phone';
import type { OAuthProvider } from '../OAuth';
import type { Timestamps } from '../Misc';

export type User = {
    // UUID string as of the 06–07.09.2026 backend migration (was auto-increment
    // number) — widened rather than a clean `string` cutover so pre-migration
    // code that narrows/compares against a number doesn't need a synchronized
    // rewrite everywhere at once; see guides/UUID_MIGRATION_GUIDE.md.
    id: string | number;
    email?: string;
    login?: string;
    name?: string;
    surname?: string;
    patronymic?: string;
    /** Computed — not stored on backend */
    fullName?: string;
    gender?: string;
    rating?: number;
    image?: string;
    imageExternalUrl?: string;
    avatar?: string | null;
    description?: string;
    atHome?: boolean;
    canWorkRemotely?: boolean;
    roles?: string[];
    active?: boolean;
    approved?: boolean;
    isOnline?: boolean;
    lastSeen?: string | null;
    reviewsCount?: number;
    dateOfBirth?: string;
    occupation?: Occupation[];
    education?: Education[];
    addresses?: Address[];
    phones?: Phone[];
    socialNetworks?: SocialNetwork[];
    oauthProviders?: OAuthProvider[];
    /** Only present on /users/me; owner-writable via PATCH /users/{id} (§3). */
    cookiesAgreed?: boolean;
    [key: string]: unknown;
} & Timestamps;
