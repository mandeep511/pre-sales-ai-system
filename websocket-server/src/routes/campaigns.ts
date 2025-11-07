import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// List campaigns
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: { not: 'archived' },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            leads: true,
            callSessions: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    res.json({ campaigns })
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    res.status(500).json({ error: 'Failed to fetch campaigns' })
  }
})

// Get single campaign
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            leads: true,
            callSessions: true,
          },
        },
      },
    })

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    res.json({ campaign })
  } catch (error) {
    console.error('Failed to fetch campaign:', error)
    res.status(500).json({ error: 'Failed to fetch campaign' })
  }
})

// Create campaign
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      description,
      systemPrompt,
      callGoal,
      voice,
      postCallForm,
      tools,
      batchSize,
      callGap,
      maxRetries,
      priority,
    } = req.body

    if (!name || !systemPrompt) {
      return res.status(400).json({ error: 'Name and system prompt are required' })
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        systemPrompt,
        callGoal,
        voice: voice || 'alloy',
        postCallForm: JSON.stringify(postCallForm || []),
        tools: JSON.stringify(tools || []),
        batchSize: batchSize || 10,
        callGap: callGap || 30,
        maxRetries: maxRetries || 3,
        priority: priority || 0,
        status: 'draft',
        createdById: req.user!.id,
      },
    })

    await prisma.campaignConfigVersion.create({
      data: {
        campaignId: campaign.id,
        version: 1,
        snapshot: JSON.stringify({
          systemPrompt: campaign.systemPrompt,
          callGoal: campaign.callGoal,
          voice: campaign.voice,
          postCallForm: campaign.postCallForm,
          tools: campaign.tools,
          batchSize: campaign.batchSize,
          callGap: campaign.callGap,
          maxRetries: campaign.maxRetries,
          priority: campaign.priority,
        }),
        changes: 'Initial version',
        createdById: req.user!.id,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'campaign_created',
        entityType: 'Campaign',
        entityId: campaign.id,
        details: JSON.stringify({ name: campaign.name }),
      },
    })

    res.status(201).json({ campaign })
  } catch (error) {
    console.error('Failed to create campaign:', error)
    res.status(500).json({ error: 'Failed to create campaign' })
  }
})

// Update campaign
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const {
      name,
      description,
      systemPrompt,
      callGoal,
      voice,
      postCallForm,
      tools,
      batchSize,
      callGap,
      maxRetries,
      priority,
      status,
    } = req.body

    const existing = await prisma.campaign.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name,
        description,
        systemPrompt,
        callGoal,
        voice,
        postCallForm: postCallForm ? JSON.stringify(postCallForm) : undefined,
        tools: tools ? JSON.stringify(tools) : undefined,
        batchSize,
        callGap,
        maxRetries,
        priority,
        status,
      },
    })

    const configChanged =
      systemPrompt !== existing.systemPrompt ||
      JSON.stringify(tools) !== existing.tools ||
      JSON.stringify(postCallForm) !== existing.postCallForm

    if (configChanged) {
      const latestVersion = await prisma.campaignConfigVersion.findFirst({
        where: { campaignId: id },
        orderBy: { version: 'desc' },
      })

      await prisma.campaignConfigVersion.create({
        data: {
          campaignId: id,
          version: (latestVersion?.version || 0) + 1,
          snapshot: JSON.stringify({
            systemPrompt: campaign.systemPrompt,
            callGoal: campaign.callGoal,
            voice: campaign.voice,
            postCallForm: campaign.postCallForm,
            tools: campaign.tools,
            batchSize: campaign.batchSize,
            callGap: campaign.callGap,
            maxRetries: campaign.maxRetries,
            priority: campaign.priority,
          }),
          changes: 'Configuration updated',
          createdById: req.user!.id,
        },
      })
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'campaign_updated',
        entityType: 'Campaign',
        entityId: id,
        details: JSON.stringify({ name: campaign.name }),
      },
    })

    res.json({ campaign })
  } catch (error) {
    console.error('Failed to update campaign:', error)
    res.status(500).json({ error: 'Failed to update campaign' })
  }
})

// Delete (archive) campaign
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status: 'archived' },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'campaign_archived',
        entityType: 'Campaign',
        entityId: id,
        details: JSON.stringify({ name: campaign.name }),
      },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to archive campaign:', error)
    res.status(500).json({ error: 'Failed to archive campaign' })
  }
})

export default router
