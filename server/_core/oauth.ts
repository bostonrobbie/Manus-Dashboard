import type { Request, Response } from "express";

/**
 * Placeholder for Manus OAuth callback handling.
 * Manus platform injects authenticated users via headers, so this handler
 * simply returns a 200 response when invoked in local development.
 */
export const handleOAuthCallback = (_req: Request, res: Response) => {
  return res.status(200).json({ status: "ok" });
};
