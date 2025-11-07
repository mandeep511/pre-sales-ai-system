import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      status,
      campaignId,
      tags,
      search,
      page = '1',
      limit = '50',
    } = req.query

    const filters: any = {}

    if (status) filters.status = status
    if (campaignId) filters.campaignId = campaignId
    if (tags) {
      const tagArray = (tags as string).split(',')
      filters.tags = { hasSome: tagArray }
    }
    if (search) {
      filters.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: filters,
        include: {
          campaign: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.lead.count({ where: filters }),
    ])

    res.json({
      leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Failed to fetch leads:', error)
    res.status(500).json({ error: 'Failed to fetch leads' })
  }
})

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: {
          select: { id: true, name: true },
        },
        callSessions: {
          orderBy: { queuedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    res.json({ lead })
  } catch (error) {
    console.error('Failed to fetch lead:', error)
    res.status(500).json({ error: 'Failed to fetch lead' })
  }
})

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      phone,
      email,
      company,
      metadata,
      tags,
      campaignId,
      priority,
    } = req.body

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' })
    }

    const existing = await prisma.lead.findUnique({
      where: { phone },
    })
    if (existing) {
      return res.status(409).json({ error: 'Lead with this phone number already exists' })
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        email,
        company,
        metadata: metadata || {},
        tags: tags || [],
        campaignId,
        priority: priority || 0,
        status: 'new',
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'lead_created',
        entityType: 'Lead',
        entityId: lead.id,
        details: { name: lead.name, phone: lead.phone },
      },
    })

    res.status(201).json({ lead })
  } catch (error) {
    console.error('Failed to create lead:', error)
    res.status(500).json({ error: 'Failed to create lead' })
  }
})

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const {
      name,
      phone,
      email,
      company,
      metadata,
      tags,
      campaignId,
      priority,
      status,
    } = req.body

    if (phone) {
      const existing = await prisma.lead.findFirst({
        where: {
          phone,
          id: { not: id },
        },
      })
      if (existing) {
        return res.status(409).json({ error: 'Another lead with this phone number exists' })
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        company,
        metadata,
        tags,
        campaignId,
        priority,
        status,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'lead_updated',
        entityType: 'Lead',
        entityId: id,
        details: { name: lead.name },
      },
    })

    res.json({ lead })
  } catch (error) {
    console.error('Failed to update lead:', error)
    res.status(500).json({ error: 'Failed to update lead' })
  }
})

router.post('/bulk/tags', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { leadIds, addTags, removeTags } = req.body

    if (!leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({ error: 'leadIds array required' })
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, tags: true },
    })

    const updates = leads.map((lead) => {
      let newTags = [...lead.tags]
      
      if (addTags) {
        newTags = [...new Set([...newTags, ...addTags])]
      }
      
      if (removeTags) {
        newTags = newTags.filter((tag) => !removeTags.includes(tag))
      }

      return prisma.lead.update({
        where: { id: lead.id },
        data: { tags: newTags },
      })
    })

    await Promise.all(updates)

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'leads_bulk_tags_updated',
        entityType: 'Lead',
        details: { count: leadIds.length, addTags, removeTags },
      },
    })

    res.json({ success: true, updated: leadIds.length })
  } catch (error) {
    console.error('Failed to update tags:', error)
    res.status(500).json({ error: 'Failed to update tags' })
  }
})

router.post('/bulk/assign-campaign', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { leadIds, campaignId } = req.body

    if (!leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({ error: 'leadIds array required' })
    }

    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: { campaignId },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'leads_bulk_campaign_assigned',
        entityType: 'Lead',
        details: { count: leadIds.length, campaignId },
      },
    })

    res.json({ success: true, updated: leadIds.length })
  } catch (error) {
    console.error('Failed to assign campaign:', error)
    res.status(500).json({ error: 'Failed to assign campaign' })
  }
})

router.post('/import', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { leads, campaignId } = req.body

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ error: 'leads array required' })
    }

    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as any[],
    }

    for (const leadData of leads) {
      try {
        if (!leadData.name || !leadData.phone) {
          results.failed++
          results.errors.push({
            lead: leadData,
            error: 'Missing required fields (name, phone)',
          })
          continue
        }

        const existing = await prisma.lead.findUnique({
          where: { phone: leadData.phone },
        })

        if (existing) {
          results.duplicates++
          continue
        }

        await prisma.lead.create({
          data: {
            name: leadData.name,
            phone: leadData.phone,
            email: leadData.email || null,
            company: leadData.company || null,
            metadata: leadData.metadata || {},
            tags: leadData.tags || [],
            campaignId: campaignId || null,
            priority: leadData.priority || 0,
            status: 'new',
          },
        })

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push({
          lead: leadData,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'leads_imported',
        entityType: 'Lead',
        details: {
          success: results.success,
          failed: results.failed,
          duplicates: results.duplicates,
          campaignId,
        },
      },
    })

    res.json({ results })
  } catch (error) {
    console.error('Failed to import leads:', error)
    res.status(500).json({ error: 'Failed to import leads' })
  }
})

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const lead = await prisma.lead.update({
      where: { id },
      data: { status: 'archived' },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'lead_archived',
        entityType: 'Lead',
        entityId: id,
        details: { name: lead.name },
      },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to archive lead:', error)
    res.status(500).json({ error: 'Failed to archive lead' })
  }
})

export default router
