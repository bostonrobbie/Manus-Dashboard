import type { CookieOptions, Response } from "express";

export const sessionCookieName = "manus_session";

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  path: "/",
};

export const setSessionCookie = (res: Response, value: string, options: Partial<CookieOptions> = {}) => {
  res.cookie(sessionCookieName, value, { ...sessionCookieOptions, ...options });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(sessionCookieName, sessionCookieOptions);
};
