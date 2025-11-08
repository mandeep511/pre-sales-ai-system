import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import {
  parseJson,
  stringifyJson,
  toObjectId,
  toObjectIdArray,
  coerceDate,
  withTransactionFallback,
  createDateFieldNormalizer,
  withDateNormalization,
} from '../lib/mongo-utils'
import { recordActivity } from '../lib/activity-log'

const router = Router()

const ensureLeadDatesNormalized = createDateFieldNormalizer(prisma, 'Lead', [
  { path: 'createdAt' },
  { path: 'updatedAt' },
  { path: 'lastCalledAt', nullable: true },
])

const runLeadOperation = <T>(operation: () => Promise<T>) =>
  withDateNormalization(operation, ensureLeadDatesNormalized)

const normalizeLead = (lead: any) => ({
  ...lead,
  metadata: parseJson(lead.metadata, {}),
  tags: parseJson(lead.tags, [] as string[]),
})

const safeCreateLead = async (data: Prisma.LeadUncheckedCreateInput) =>
  withTransactionFallback(
    () => runLeadOperation(() => prisma.lead.create({ data })),
    async () => {
      const now = new Date()
      const document = {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        company: data.company ?? null,
        metadata: data.metadata ?? '{}',
        tags: data.tags ?? '[]',
        status: data.status ?? 'new',
        campaignId: toObjectId(data.campaignId ?? null),
        priority: data.priority ?? 0,
        attempts: (data as any).attempts ?? 0,
        lastCalledAt: coerceDate((data as any).lastCalledAt ?? null),
        createdAt: coerceDate(data.createdAt ?? null, now) ?? now,
        updatedAt: coerceDate(data.updatedAt ?? null, now) ?? now,
      }

      await prisma.$runCommandRaw({
        insert: 'Lead',
        documents: [document],
      })

      const created = await runLeadOperation(() =>
        prisma.lead.findUnique({
          where: { phone: data.phone },
        })
      )

      if (!created) {
        throw new Error('Failed to insert lead without transaction')
      }

      return created
    }
  )

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureLeadDatesNormalized()

    const {
      status,
      campaignId,
      tags,
      search,
      page = '1',
      limit = '50',
    } = req.query

    const filters: any = {}
    const andClauses: any[] = []

    if (status) filters.status = status
    if (campaignId) filters.campaignId = campaignId

    if (tags) {
      const tagArray = (tags as string)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)

      if (tagArray.length) {
        andClauses.push(
          ...tagArray.map((tag) => ({ tags: { contains: `"${tag}"` } }))
        )
      }
    }

    if (search) {
      const query = search as string
      andClauses.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
        ],
      })
    }

    if (andClauses.length) {
      filters.AND = andClauses
    }

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const skip = (pageNum - 1) * limitNum

    const [leads, total] = await Promise.all([
      runLeadOperation(() =>
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
        })
      ),
      runLeadOperation(() => prisma.lead.count({ where: filters })),
    ])

    res.json({
      leads: leads.map(normalizeLead),
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
    const lead = await runLeadOperation(() =>
      prisma.lead.findUnique({
        where: { id: req.params.id },
        include: {
          campaign: {
            select: { id: true, name: true },
          },
          callSessions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      })
    )

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    res.json({ lead: normalizeLead(lead) })
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

    const existing = await runLeadOperation(() =>
      prisma.lead.findUnique({
        where: { phone },
      })
    )

    if (existing) {
      return res.status(409).json({ error: 'Lead with this phone number already exists' })
    }

    const lead = await safeCreateLead({
      name,
      phone,
      email,
      company,
      metadata: stringifyJson(metadata, {}),
      tags: stringifyJson(tags, []),
      campaignId: campaignId || undefined,
      priority: priority ?? 0,
      status: 'new',
    })

    await recordActivity({
      userId: req.user!.id,
      action: 'lead_created',
      entityType: 'Lead',
      entityId: lead.id,
      details: JSON.stringify({ name: lead.name, phone: lead.phone }),
    })

    res.status(201).json({ lead: normalizeLead(lead) })
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
      const existing = await runLeadOperation(() =>
        prisma.lead.findFirst({
          where: {
            phone,
            id: { not: id },
          },
        })
      )
      if (existing) {
        return res.status(409).json({ error: 'Another lead with this phone number exists' })
      }
    }

    const lead = await runLeadOperation(() =>
      prisma.lead.update({
        where: { id },
        data: {
          name,
          phone,
          email,
          company,
          metadata: metadata !== undefined ? stringifyJson(metadata, {}) : undefined,
          tags: tags !== undefined ? stringifyJson(tags, []) : undefined,
          campaignId,
          priority,
          status,
        },
      })
    )

    await recordActivity({
      userId: req.user!.id,
      action: 'lead_updated',
      entityType: 'Lead',
      entityId: id,
      details: JSON.stringify({ name: lead.name }),
    })

    res.json({ lead: normalizeLead(lead) })
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

    const leads = await runLeadOperation(() =>
      prisma.lead.findMany({
        where: { id: { in: leadIds } },
        select: { id: true, tags: true },
      })
    )

    const updates = leads.map((lead: { tags: string | null | undefined; id: any }) => {
      const currentTags = parseJson<string[]>(lead.tags, [])
      let newTags = [...currentTags]

      if (addTags) {
        newTags = [...new Set([...newTags, ...addTags])]
      }

      if (removeTags) {
        newTags = newTags.filter((tag) => !removeTags.includes(tag))
      }

      return runLeadOperation(() =>
        prisma.lead.update({
          where: { id: lead.id },
          data: { tags: stringifyJson(newTags, []) },
        })
      )
    })

    await Promise.all(updates)

    await recordActivity({
      userId: req.user!.id,
      action: 'leads_bulk_tags_updated',
      entityType: 'Lead',
      details: JSON.stringify({ count: leadIds.length, addTags, removeTags }),
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

    await withTransactionFallback(
      () =>
        runLeadOperation(() =>
          prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { campaignId },
          })
        ),
      async () => {
        await ensureLeadDatesNormalized()

        const ids = toObjectIdArray(leadIds)
        if (!ids.length) {
          return { count: 0 }
        }

        const campaignObjectId = toObjectId(campaignId ?? null)
        const updateDocument: Record<string, unknown> = {
          $set: { campaignId: campaignObjectId ?? null },
        }

        const command = {
          update: 'Lead',
          updates: [
            {
              q: { _id: { $in: ids } },
              u: updateDocument,
              multi: true,
            },
          ],
        } as unknown as Prisma.JsonObject

        const result = (await prisma.$runCommandRaw(command)) as {
          nModified?: number
          modifiedCount?: number
          n?: number
        }

        const count =
          typeof result.modifiedCount === 'number'
            ? result.modifiedCount
            : typeof result.nModified === 'number'
              ? result.nModified
              : typeof result.n === 'number'
                ? result.n
                : ids.length

        return { count } as Prisma.BatchPayload
      }
    )

    await recordActivity({
      userId: req.user!.id,
      action: 'leads_bulk_campaign_assigned',
      entityType: 'Lead',
      details: JSON.stringify({ count: leadIds.length, campaignId }),
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

        const existing = await runLeadOperation(() =>
          prisma.lead.findUnique({
            where: { phone: leadData.phone },
          })
        )

        if (existing) {
          results.duplicates++
          continue
        }

        await safeCreateLead({
          name: leadData.name,
          phone: leadData.phone,
          email: leadData.email || null,
          company: leadData.company || null,
          metadata: stringifyJson(leadData.metadata, {}),
          tags: stringifyJson(leadData.tags, []),
          campaignId: campaignId || undefined,
          priority: leadData.priority ?? 0,
          status: 'new',
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

    await recordActivity({
      userId: req.user!.id,
      action: 'leads_imported',
      entityType: 'Lead',
      details: JSON.stringify({
        success: results.success,
        failed: results.failed,
        duplicates: results.duplicates,
        campaignId,
      }),
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

    const lead = await runLeadOperation(() =>
      prisma.lead.update({
        where: { id },
        data: { status: 'archived' },
      })
    )

    await recordActivity({
      userId: req.user!.id,
      action: 'lead_archived',
      entityType: 'Lead',
      entityId: id,
      details: JSON.stringify({ name: lead.name }),
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to archive lead:', error)
    res.status(500).json({ error: 'Failed to archive lead' })
  }
})

export default router
