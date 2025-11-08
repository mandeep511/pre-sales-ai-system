import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import {
  toObjectId,
  coerceDate,
  withTransactionFallback,
  createDateFieldNormalizer,
} from './mongo-utils'

const ensureActivityLogDatesNormalized = createDateFieldNormalizer(prisma, 'ActivityLog', [
  { path: 'createdAt' },
])

export const recordActivity = async (data: Prisma.ActivityLogUncheckedCreateInput) =>
  withTransactionFallback(
    async () => {
      await ensureActivityLogDatesNormalized()
      await prisma.activityLog.create({ data })
    },
    async () => {
      const now = new Date()
      await ensureActivityLogDatesNormalized()
      await prisma.$runCommandRaw({
        insert: 'ActivityLog',
        documents: [
          {
            userId: toObjectId(data.userId),
            action: data.action,
            entityType: data.entityType,
            entityId: toObjectId(data.entityId ?? null),
            details: data.details ?? null,
            createdAt: coerceDate(data.createdAt ?? null, now) ?? now,
          },
        ],
      })
    }
  )

