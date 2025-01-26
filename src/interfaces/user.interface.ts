import { INotificationDocument } from "./notification.interface";

declare global {
    namespace Express {
        interface Request {
            currentUser?: IAuthPayload;
        }
    }
}

export interface IAuthPayload {
    id : number;
    username : string;
    email : string;
    iat? : number;
}

export interface IUserDocument {
    id?: number;
    username? : string;
    googleId? : string;
    githubId? : string;
    email? : string;
    socialId? : string;
    type? : string;
    password? : string;
    createdAt? : Date;
    comparePassword : (password: string, hashedPassword : string) => Promise<boolean>;
    hashPassword : (password: string) => Promise<string>;
}

export interface IUserResponse {
    user : IUserDocument;
    notifications : INotificationDocument[];
}