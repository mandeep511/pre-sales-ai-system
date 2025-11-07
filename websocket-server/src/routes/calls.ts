import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const calls = await prisma.callSession.findMany({
      include: {
        lead: {
          select: { id: true, name: true, phone: true },
        },
        campaign: {
          select: { id: true, name: true },
        },
      },
      orderBy: { queuedAt: 'desc' },
      take: 100,
    })

    res.json({ calls })
  } catch (error) {
    console.error('Failed to fetch calls:', error)
    res.status(500).json({ error: 'Failed to fetch calls' })
  }
})

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const callSession = await prisma.callSession.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        campaign: true,
        transcript: true,
        recording: true,
      },
    })

    if (!callSession) {
      return res.status(404).json({ error: 'Call not found' })
    }

    res.json({ callSession })
  } catch (error) {
    console.error('Failed to fetch call:', error)
    res.status(500).json({ error: 'Failed to fetch call' })
  }
})

export default router

