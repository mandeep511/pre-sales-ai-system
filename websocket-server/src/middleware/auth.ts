import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  active?: boolean
}

declare module 'express-session' {
  interface SessionData {
    userId?: string
    user?: AuthenticatedUser
  }
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser
}

const resolveUserId = (req: AuthRequest): string | null => {
  if (req.session?.userId) {
    return req.session.userId
  }

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      return token
    }
  }

  return null
}

const attachUserToRequest = (req: AuthRequest, user: AuthenticatedUser) => {
  req.user = user
  if (req.session) {
    req.session.userId = user.id
    req.session.user = user
  }
}

const fetchUser = async (req: AuthRequest): Promise<AuthenticatedUser | null> => {
  if (req.session?.user) {
    const sessionUser = req.session.user as AuthenticatedUser
    attachUserToRequest(req, sessionUser)
    return sessionUser
  }

  const userId = resolveUserId(req)
  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  })

  if (!user) {
    return null
  }

  attachUserToRequest(req, user)
  return user
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await fetchUser(req)

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (typeof user.active === 'boolean' && !user.active) {
      return res.status(401).json({ error: 'User inactive' })
    }

    next()
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await fetchUser(req)
  } catch (error) {
    console.error('Optional auth error:', error)
  } finally {
    next()
  }
}
