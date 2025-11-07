import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser
}

const fetchUserFromSession = async (req: AuthRequest): Promise<AuthenticatedUser | null> => {
  const userId = req.session?.userId

  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  })

  if (!user) {
    return null
  }

  req.user = user
  return user
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await fetchUserFromSession(req)

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    next()
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await fetchUserFromSession(req)
  } catch (error) {
    console.error('Optional auth error:', error)
  } finally {
    next()
  }
}
