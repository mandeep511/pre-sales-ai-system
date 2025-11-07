import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ campaigns })
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    res.status(500).json({ error: 'Failed to fetch campaigns' })
  }
})

export default router
