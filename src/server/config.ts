import dotenv from "dotenv";

dotenv.config({});

const ENV = process.env;

export const POSTGRES_DB = ENV.POSTGRES_DB as string;
export const NODE_ENV = ENV.NODE_ENV as string;
export const SECRET_KEY_ONE = ENV.SECRET_KEY_ONE as string;
export const SECRET_KEY_TWO = ENV.SECRET_KEY_TWO as string;
export const JWT_TOKEN = ENV.JWT_TOKEN as string;
export const SENDER_EMAIL = ENV.SENDER_EMAIL as string;
export const SENDER_EMAIL_PASSWORD = ENV.SENDER_EMAIL_PASSWORD as string;
export const CLIENT_URL = ENV.CLIENT_URL as string;
export const PORT = ENV.PORT as string;
