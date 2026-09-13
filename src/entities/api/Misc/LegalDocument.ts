import type { Timestamps } from './Timestamps';

export type LegalDocumentType = 'privacy_policy' | 'terms_of_use' | 'public_offer';

export type LegalDocument = {
    id: string | number;
    type: LegalDocumentType;
    title: string;
    description: string;
} & Required<Timestamps>;
