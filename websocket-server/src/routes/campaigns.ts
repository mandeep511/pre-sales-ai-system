import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { recordActivity } from '../lib/activity-log'

const ensureArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

const toJsonArrayInput = (value: unknown): Prisma.InputJsonValue =>
  ensureArray(value) as Prisma.JsonArray
const hasBodyProperty = (body: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(body, key)

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

    const normalizedCampaigns = campaigns.map((campaign) => ({
      ...campaign,
      postCallForm: ensureArray(campaign.postCallForm),
      tools: ensureArray(campaign.tools),
    }))

    res.json({ campaigns: normalizedCampaigns })
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

    res.json({
      campaign: {
        ...campaign,
        postCallForm: ensureArray(campaign.postCallForm),
        tools: ensureArray(campaign.tools),
      },
    })
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

    const createData: Prisma.CampaignUncheckedCreateInput = {
      name,
      description,
      systemPrompt,
      callGoal,
      voice: voice || 'alloy',
      // Type-only cast avoids stale Prisma metadata complaints in language server caches.
      postCallForm: toJsonArrayInput(postCallForm) as unknown as string,
      tools: toJsonArrayInput(tools) as unknown as string,
      batchSize: batchSize ?? 10,
      callGap: callGap ?? 30,
      maxRetries: maxRetries ?? 3,
      priority: priority ?? 0,
      status: 'draft',
      createdById: req.user!.id,
    }

    const campaign = await prisma.campaign.create({
      data: createData,
    })

    await prisma.campaignConfigVersion.create({
      data: {
        campaignId: campaign.id,
        version: 1,
        snapshot: JSON.stringify({
          systemPrompt: campaign.systemPrompt,
          callGoal: campaign.callGoal,
          voice: campaign.voice,
          postCallForm: ensureArray(campaign.postCallForm),
          tools: ensureArray(campaign.tools),
          batchSize: campaign.batchSize,
          callGap: campaign.callGap,
          maxRetries: campaign.maxRetries,
          priority: campaign.priority,
        }),
        changes: 'Initial version',
        createdById: req.user!.id,
      },
    })

    await recordActivity({
      userId: req.user!.id,
      action: 'campaign_created',
      entityType: 'Campaign',
      entityId: campaign.id,
      details: JSON.stringify({ name: campaign.name }),
    })

    res.status(201).json({
      campaign: {
        ...campaign,
        postCallForm: ensureArray(campaign.postCallForm),
        tools: ensureArray(campaign.tools),
      },
    })
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

    const existingPostCallForm = ensureArray(existing.postCallForm)
    const existingTools = ensureArray(existing.tools)

    const updateData: Prisma.CampaignUncheckedUpdateInput = {
      name,
      description,
      systemPrompt,
      callGoal,
      voice,
      batchSize,
      callGap,
      maxRetries,
      priority,
      status,
    }

    if (hasBodyProperty(req.body, 'postCallForm')) {
      updateData.postCallForm = toJsonArrayInput(postCallForm) as unknown as string
    }

    if (hasBodyProperty(req.body, 'tools')) {
      updateData.tools = toJsonArrayInput(tools) as unknown as string
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
    })

    const incomingPostCallForm = hasBodyProperty(req.body, 'postCallForm')
      ? ensureArray(postCallForm)
      : existingPostCallForm
    const incomingTools = hasBodyProperty(req.body, 'tools') ? ensureArray(tools) : existingTools

    const configChanged =
      (systemPrompt !== undefined && systemPrompt !== existing.systemPrompt) ||
      JSON.stringify(incomingTools) !== JSON.stringify(existingTools) ||
      JSON.stringify(incomingPostCallForm) !== JSON.stringify(existingPostCallForm)

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
            postCallForm: ensureArray(incomingPostCallForm),
            tools: ensureArray(campaign.tools),
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

    await recordActivity({
      userId: req.user!.id,
      action: 'campaign_updated',
      entityType: 'Campaign',
      entityId: id,
      details: JSON.stringify({ name: campaign.name }),
    })

    res.json({
      campaign: {
        ...campaign,
        postCallForm: ensureArray(campaign.postCallForm),
        tools: ensureArray(campaign.tools),
      },
    })
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

    await recordActivity({
      userId: req.user!.id,
      action: 'campaign_archived',
      entityType: 'Campaign',
      entityId: id,
      details: JSON.stringify({ name: campaign.name }),
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to archive campaign:', error)
    res.status(500).json({ error: 'Failed to archive campaign' })
  }
})

export default router
