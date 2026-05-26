import type { Timestamps } from './Timestamps';

/** Distinguishes the three legal document types served on the /legal/* pages. */
export type LegalDocumentType = 'privacy_policy' | 'terms_of_use' | 'public_offer';

/** Legal document entity returned by /api/legal_documents. */
export type LegalDocument = {
    id: number;
    type: LegalDocumentType;
    title: string;
    description: string;
} & Required<Timestamps>;
