interface SSOList {
    google: SSO<"google">;
}

interface SSO<T extends string>{
    id: T;
    value: string;
}

export interface Admin {
    firstName: string;
    role: string;
    email: string;
    ssoList: SSOList
}

export interface User {
    a: string;
    b: string;
    c: string;
}