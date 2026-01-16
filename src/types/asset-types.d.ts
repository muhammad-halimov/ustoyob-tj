declare module '*.ttf' {
    const content: string;
    export default content;
}

declare module '*.woff' {
    const content: string;
    export default content;
}

declare module '*.woff2' {
    const content: string;
    export default content;
}

declare module "*.png" {
    const value: string;
    export default value;
}

declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.svg";

declare module '*.module.scss' {
    const classes: { [key: string]: string };
    export default classes;
}

declare module '*.module.css' {
    const classes: { [key: string]: string };
    export default classes;
}

declare module '*.scss' {
    const content: { [key: string]: string };
    export default content;
}

declare module '*.css' {
    const content: { [key: string]: string };
    export default content;
}