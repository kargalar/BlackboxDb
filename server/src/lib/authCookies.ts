import { Request, Response } from "express";

export const ACCESS_TOKEN_COOKIE = "bb_access_token";
export const REFRESH_TOKEN_COOKIE = "bb_refresh_token";

const isProduction = process.env.NODE_ENV === "production";
const sameSite = (process.env.AUTH_COOKIE_SAME_SITE || "lax") as
  | "lax"
  | "strict"
  | "none";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite,
  path: "/",
};

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string,
): void {
  response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000,
  });
  response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions);
  response.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.cookie;
  if (!header) return null;

  const cookie = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return null;
  }
}
