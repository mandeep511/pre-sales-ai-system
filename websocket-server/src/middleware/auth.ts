import { Request, Response, NextFunction } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  req.user = req.session.user;
  next();
}

export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.session?.userId) {
    req.user = req.session.user;
  }
  next();
}
