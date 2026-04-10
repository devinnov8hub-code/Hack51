import jwt, { type SignOptions } from "jsonwebtoken";
import { UnauthorizedError } from "../exceptions/errors.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
// Numeric seconds for jsonwebtoken compatibility
const ACCESS_EXPIRES_SEC  = 60 * 15;          // 15 minutes
const REFRESH_EXPIRES_SEC = 60 * 60 * 24 * 30; // 30 days

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: "access";
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: "refresh";
  iat?: number;
  exp?: number;
}

export function signAccessToken(userId: string, email: string, role: string): string {
  const payload = { sub: userId, email, role, type: "access" };
  const opts: SignOptions = { algorithm: "HS256", expiresIn: ACCESS_EXPIRES_SEC };
  return jwt.sign(payload, ACCESS_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET, { algorithms: ["HS256"] }) as AccessTokenPayload;
    if (payload.type !== "access") throw new UnauthorizedError("Invalid token type", "INVALID_TOKEN_TYPE");
    return payload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof jwt.TokenExpiredError) throw new UnauthorizedError("Access token expired", "TOKEN_EXPIRED");
    throw new UnauthorizedError("Invalid access token", "INVALID_TOKEN");
  }
}

export function signRefreshToken(userId: string, jti: string): string {
  const payload = { sub: userId, jti, type: "refresh" };
  const opts: SignOptions = { algorithm: "HS256", expiresIn: REFRESH_EXPIRES_SEC };
  return jwt.sign(payload, REFRESH_SECRET, opts);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET, { algorithms: ["HS256"] }) as RefreshTokenPayload;
    if (payload.type !== "refresh") throw new UnauthorizedError("Invalid token type", "INVALID_TOKEN_TYPE");
    return payload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof jwt.TokenExpiredError) throw new UnauthorizedError("Refresh token expired", "REFRESH_TOKEN_EXPIRED");
    throw new UnauthorizedError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }
}

export function decodeToken<T = unknown>(token: string): T | null {
  try { return jwt.decode(token) as T; } catch { return null; }
}
