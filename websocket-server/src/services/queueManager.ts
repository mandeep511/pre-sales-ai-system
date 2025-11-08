import { EventEmitter } from 'events'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'

interface QueueConfig {
  campaignId: string
  batchSize: number
  callGap: number
  maxRetries: number
  priority: number
}

class QueueManager extends EventEmitter {
  private activeQueues: Map<string, NodeJS.Timeout> = new Map()
  private processing: Set<string> = new Set()

  constructor() {
    super()
  }

  async startQueue(campaignId: string): Promise<void> {
    if (this.activeQueues.has(campaignId)) {
      console.log(`Queue already running for campaign ${campaignId}`)
      return
    }

    console.log(`Starting queue for campaign ${campaignId}`)

    let queueState = await prisma.queueState.findUnique({
      where: { campaignId },
    })

    if (queueState) {
      queueState = await prisma.queueState.update({
        where: { campaignId },
        data: { status: 'running' },
      })
    } else {
      try {
        queueState = await prisma.queueState.create({
          data: {
            campaignId,
            status: 'running',
            totalQueued: 0,
            totalCompleted: 0,
            totalFailed: 0,
          },
        })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          queueState = await prisma.queueState.update({
            where: { campaignId },
            data: { status: 'running' },
          })
        } else {
          throw error
        }
      }
    }

    await this.cacheQueueState(campaignId, queueState)

    await this.processQueue(campaignId)
  }

  async pauseQueue(campaignId: string): Promise<void> {
    const timer = this.activeQueues.get(campaignId)
    if (timer) {
      clearTimeout(timer)
      this.activeQueues.delete(campaignId)
    }

    this.processing.delete(campaignId)

    const existing = await prisma.queueState.findUnique({
      where: { campaignId },
    })

    if (!existing) {
      console.log(`No queue state to pause for campaign ${campaignId}`)
      return
    }

    const queueState = await prisma.queueState.update({
      where: { campaignId },
      data: { status: 'paused' },
    })

    await this.cacheQueueState(campaignId, queueState)

    console.log(`Queue paused for campaign ${campaignId}`)
  }

  async stopQueue(campaignId: string): Promise<void> {
    await this.pauseQueue(campaignId)

    const existing = await prisma.queueState.findUnique({
      where: { campaignId },
    })

    if (!existing) {
      console.log(`No queue state to stop for campaign ${campaignId}`)
      return
    }

    const queueState = await prisma.queueState.update({
      where: { campaignId },
      data: {
        status: 'idle',
        currentBatch: null,
        batchStartedAt: null,
        nextScheduledAt: null,
      },
    })

    await this.cacheQueueState(campaignId, queueState)

    console.log(`Queue stopped for campaign ${campaignId}`)
  }

  private async processQueue(campaignId: string): Promise<void> {
    if (this.processing.has(campaignId)) {
      return
    }

    this.processing.add(campaignId)

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      })

      if (!campaign || campaign.status !== 'active') {
        await this.stopQueue(campaignId)
        return
      }

      const queueState = await prisma.queueState.findUnique({
        where: { campaignId },
      })

      if (!queueState || queueState.status !== 'running') {
        return
      }

      const leads = await this.getNextBatch(campaignId, campaign.batchSize)

      if (leads.length === 0) {
        console.log(`No leads available for campaign ${campaignId}`)
        await this.stopQueue(campaignId)
        return
      }

      console.log(`Processing batch of ${leads.length} leads for campaign ${campaignId}`)

      const batchStartedAt = new Date()

      const updatedQueueState = await prisma.queueState.update({
        where: { campaignId },
        data: {
          currentBatch: {
            leadIds: leads.map((lead) => lead.id),
            startedAt: batchStartedAt.toISOString(),
          },
          batchStartedAt,
        },
      })

      await this.cacheQueueState(campaignId, updatedQueueState)

      for (const [index, lead] of leads.entries()) {
        const callSession = await prisma.callSession.create({
          data: {
            leadId: lead.id,
            campaignId: campaign.id,
            direction: 'outbound',
            status: 'queued',
            configSnapshot: {
              systemPrompt: campaign.systemPrompt,
              voice: campaign.voice,
              tools: campaign.tools,
              callGoal: campaign.callGoal,
            },
          },
        })

        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'queued' },
        })

        this.emit('call:ready', {
          callSessionId: callSession.id,
          leadId: lead.id,
          campaignId: campaign.id,
        })

        if (index < leads.length - 1) {
          await this.sleep(campaign.callGap * 1000)
        }
      }

      const nextScheduledAt = new Date(Date.now() + campaign.callGap * 1000)

      const postBatchQueueState = await prisma.queueState.update({
        where: { campaignId },
        data: {
          totalQueued: { increment: leads.length },
          nextScheduledAt,
          currentBatch: null,
        },
      })

      await this.cacheQueueState(campaignId, postBatchQueueState)

      const timer = setTimeout(() => {
        this.processing.delete(campaignId)
        this.processQueue(campaignId)
      }, campaign.callGap * 1000)

      this.activeQueues.set(campaignId, timer)
    } catch (error) {
      console.error(`Error processing queue for campaign ${campaignId}:`, error)
    } finally {
      this.processing.delete(campaignId)
    }
  }

  private async getNextBatch(campaignId: string, batchSize: number): Promise<any[]> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) return []

    const leads = await prisma.lead.findMany({
      where: {
        campaignId,
        status: { in: ['new', 'queued'] },
      },
      include: {
        callSessions: {
          where: {
            campaignId,
            status: { in: ['failed', 'no_answer', 'busy'] },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: batchSize * 2,
    })

    const eligibleLeads = leads.filter((lead) => {
      const failedAttempts = lead.callSessions.length
      return failedAttempts < campaign.maxRetries
    })

    return eligibleLeads.slice(0, batchSize)
  }

  async handleCallComplete(callSessionId: string, outcome: string): Promise<void> {
    const callSession = await prisma.callSession.findUnique({
      where: { id: callSessionId },
      include: { lead: true, campaign: true },
    })

    if (!callSession) return

    const { lead, campaign } = callSession

    await prisma.callSession.update({
      where: { id: callSessionId },
      data: {
        outcome,
        status: outcome === 'completed' ? 'completed' : 'failed',
        endedAt: new Date(),
      },
    })

    const queueState = await prisma.queueState.findUnique({
      where: { campaignId: campaign.id },
    })

    if (!queueState) return

    if (outcome === 'completed') {
      const updatedQueueState = await prisma.queueState.update({
        where: { campaignId: campaign.id },
        data: { totalCompleted: { increment: 1 } },
      })

      await this.cacheQueueState(campaign.id, updatedQueueState)

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'completed',
          lastCalledAt: new Date(),
        },
      })
    } else if (['failed', 'no_answer', 'busy'].includes(outcome)) {
      const failedAttempts = await prisma.callSession.count({
        where: {
          leadId: lead.id,
          campaignId: campaign.id,
          status: { in: ['failed', 'no_answer', 'busy'] },
        },
      })

      if (failedAttempts >= campaign.maxRetries) {
        const updatedQueueState = await prisma.queueState.update({
          where: { campaignId: campaign.id },
          data: { totalFailed: { increment: 1 } },
        })

        await this.cacheQueueState(campaign.id, updatedQueueState)

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'archived',
            lastCalledAt: new Date(),
          },
        })
      } else {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'queued',
            lastCalledAt: new Date(),
          },
        })
      }
    }
  }

  async getQueueStatus(campaignId: string): Promise<any> {
    const cachedState = await this.getCachedQueueState(campaignId)

    const queueState = cachedState
      ? cachedState
      : await prisma.queueState.findUnique({
          where: { campaignId },
        })

    if (queueState && !cachedState) {
      await this.cacheQueueState(campaignId, queueState)
    }

    const counts = await prisma.lead.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    })

    return {
      state: queueState,
      leadCounts: counts,
      isRunning: this.activeQueues.has(campaignId),
    }
  }

  getActiveQueues(): string[] {
    return Array.from(this.activeQueues.keys())
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async cacheQueueState(campaignId: string, state: any): Promise<void> {
    await redis.set(`queue:${campaignId}`, JSON.stringify(state), 'EX', 60)
  }

  private async getCachedQueueState(campaignId: string): Promise<any | null> {
    const cached = await redis.get(`queue:${campaignId}`)
    return cached ? JSON.parse(cached) : null
  }
}

export const queueManager = new QueueManager()
