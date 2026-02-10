export interface GalleryImage {
    id: number;
    image: string;
    url?: string;
    path?: string;
}

export interface Gallery {
    id: number;
    images?: GalleryImage[];
    [key: string]: unknown;
}

export interface GalleryImageApiData extends GalleryImage {
    [key: string]: unknown;
}

export interface GalleryApiData extends Gallery {
    images?: GalleryImageApiData[];
}