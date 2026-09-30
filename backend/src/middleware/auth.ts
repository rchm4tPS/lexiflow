/**
 * This protects future Tokenizer routes by ensuring the user is logged in.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    total_coins?: number;
  };
}

/**
 * Every authentication failure is a 401 — a missing, malformed, tampered or
 * expired token are all "you are not logged in" as far as a client is
 * concerned. The `code` field lets the SPA tell an expiry (worth a notice)
 * from a corrupt token, so it can end the session immediately instead of
 * leaving the user in a half-authenticated state.
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const header = req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.', code: 'NO_TOKEN' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    if (!decoded?.id) {
      res.status(401).json({ error: 'Invalid token.', code: 'TOKEN_INVALID' });
      return;
    }
    req.user = decoded;
    next();
  } catch (error: unknown) {
    const expired = error instanceof jwt.TokenExpiredError;
    res.status(401).json({
      error: expired ? 'Your session has expired.' : 'Invalid token.',
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }
};
