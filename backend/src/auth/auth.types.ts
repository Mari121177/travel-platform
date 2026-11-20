// What is stored inside the JWT access and refresh tokens
export interface TokenPayload {
  sub: string; // user id
  typ: 'access' | 'refresh';
  jti?: string;
  iat?: number;
  exp?: number;
}