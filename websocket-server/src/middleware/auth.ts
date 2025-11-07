import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // For now, we'll use a simple session-based auth
    // In production, you'd want to use proper session management or JWT
    const userId = req.session?.userId
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}
