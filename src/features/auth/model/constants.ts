const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const GOOGLE_LOGIN_URL = `${API_URL}/oauth2/authorization/google`;
