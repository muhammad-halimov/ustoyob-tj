export interface Education {
    id: string;
    institution: string;
    specialty: string;
    startYear: string;
    endYear: string;
    currentlyStudying: boolean;
}

export interface EducationApiData {
    id: number;
    uniTitle?: string;
    beginning?: number;
    ending?: number;
    graduated?: boolean;
    occupation?: string | import('../Occupation').OccupationApiData | import('../Occupation').OccupationApiData[];
    [key: string]: unknown;
}