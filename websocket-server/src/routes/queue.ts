import { Router } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { queueManager } from '../services/queueManager'

const router = Router()

router.post('/start/:campaignId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { campaignId } = req.params

    await queueManager.startQueue(campaignId)

    res.json({ success: true, message: 'Queue started' })
  } catch (error) {
    console.error('Failed to start queue:', error)
    res.status(500).json({ error: 'Failed to start queue' })
  }
})

router.post('/pause/:campaignId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { campaignId } = req.params

    await queueManager.pauseQueue(campaignId)

    res.json({ success: true, message: 'Queue paused' })
  } catch (error) {
    console.error('Failed to pause queue:', error)
    res.status(500).json({ error: 'Failed to pause queue' })
  }
})

router.post('/stop/:campaignId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { campaignId } = req.params

    await queueManager.stopQueue(campaignId)

    res.json({ success: true, message: 'Queue stopped' })
  } catch (error) {
    console.error('Failed to stop queue:', error)
    res.status(500).json({ error: 'Failed to stop queue' })
  }
})

router.get('/status/:campaignId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { campaignId } = req.params

    const status = await queueManager.getQueueStatus(campaignId)

    res.json(status)
  } catch (error) {
    console.error('Failed to get queue status:', error)
    res.status(500).json({ error: 'Failed to get queue status' })
  }
})

router.get('/active', requireAuth, async (req: AuthRequest, res) => {
  try {
    const activeQueues = queueManager.getActiveQueues()
    res.json({ queues: activeQueues })
  } catch (error) {
    console.error('Failed to get active queues:', error)
    res.status(500).json({ error: 'Failed to get active queues' })
  }
})

export default router
