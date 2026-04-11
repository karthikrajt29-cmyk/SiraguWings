import apiClient from './client';

export interface TokenResponse {
  user_id: string;
  name: string;
  email: string;
  roles: Array<{ role: string; center_id: string | null }>;
}

export interface RegisterRequest {
  firebase_id_token: string;
  name: string;
}

export const verifyToken = (firebase_id_token: string) =>
  apiClient.post<TokenResponse>('/auth/token', { firebase_id_token }).then((r) => r.data);

export const registerUser = (data: RegisterRequest) =>
  apiClient.post<TokenResponse>('/auth/register', data).then((r) => r.data);

export const getMe = () =>
  apiClient.get<TokenResponse>('/auth/me').then((r) => r.data);
