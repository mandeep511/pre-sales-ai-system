import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { ObjectId } from 'mongodb'

const ISO_8601_LENGTH = 24
const REPLICA_SET_MESSAGE = 'MongoDB server to be run as a replica set'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isTransactionError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2031' ||
    error.message.includes(REPLICA_SET_MESSAGE))

export const isDateConversionError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2023' &&
  /Failed to convert/.test(error.message)

export const toObjectId = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  try {
    return new ObjectId(value)
  } catch {
    return null
  }
}

export const toObjectIdArray = (values: Array<string | null | undefined>) =>
  values
    .map((value) => toObjectId(value))
    .filter((value): value is ObjectId => value !== null)

export const coerceDate = (value: unknown, fallback?: Date | null): Date | null => {
  if (value === null) {
    return null
  }

  if (value instanceof Date) {
    return new Date(value)
  }

  if (typeof value === 'string') {
    if (!value) {
      return fallback ?? null
    }

    const normalized = value.length === ISO_8601_LENGTH ? value : value.trim()
    const date = new Date(normalized)
    return Number.isNaN(date.getTime()) ? fallback ?? null : date
  }

  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? fallback ?? null : date
  }

  if (isObject(value) && typeof value.$date !== 'undefined') {
    return coerceDate(value.$date, fallback)
  }

  return fallback ?? null
}

export const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.error('Failed to parse JSON field', error)
    return fallback
  }
}

export const stringifyJson = (value: unknown, fallback: unknown): string => {
  try {
    return JSON.stringify(value ?? fallback)
  } catch (error) {
    console.error('Failed to stringify JSON field', error)
    return JSON.stringify(fallback)
  }
}

type DateFieldConfig = {
  path: string
  nullable?: boolean
}

const buildDateFieldMatch = (fields: Array<DateFieldConfig>) => ({
  $or: fields.map((field) => ({
    [field.path]: { $type: 'string' },
  })),
})

const buildDateFieldSetStage = (fields: Array<DateFieldConfig>) =>
  fields.reduce<Record<string, unknown>>((acc, field) => {
    const fieldRef = `$${field.path}`
    const fallback: unknown = field.nullable ? null : '$$NOW'

    acc[field.path] = {
      $cond: [
        {
          $and: [
            { $eq: [{ $type: fieldRef }, 'string'] },
            { $gt: [{ $strLenCP: fieldRef }, 0] },
          ],
        },
        {
          $dateFromString: {
            dateString: fieldRef,
            onError: fallback,
            onNull: field.nullable ? null : fallback,
          },
        },
        field.nullable ? fieldRef : { $ifNull: [fieldRef, fallback] },
      ],
    }

    return acc
  }, {})

export const createDateFieldNormalizer = (
  prisma: PrismaClient,
  collection: string,
  fields: Array<DateFieldConfig>
) => {
  let inflight: Promise<void> | null = null
  let normalized = false

  const run = async () => {
    if (!fields.length) {
      normalized = true
      return
    }

    try {
      const command = {
        update: collection,
        updates: [
          {
            q: buildDateFieldMatch(fields),
            u: [{ $set: buildDateFieldSetStage(fields) }],
            multi: true,
          },
        ],
      } as unknown as Prisma.JsonObject

      await prisma.$runCommandRaw(command)
      normalized = true
    } catch (error) {
      console.error(`Failed to normalize date fields for ${collection}`, error)
      throw error
    } finally {
      inflight = null
    }
  }

  return async () => {
    if (normalized) {
      return
    }

    if (!inflight) {
      inflight = run()
    }

    await inflight
  }
}

export const withTransactionFallback = async <T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
) => {
  try {
    return await primary()
  } catch (error) {
    if (!isTransactionError(error)) {
      throw error
    }

    return fallback()
  }
}

export const withDateNormalization = async <T>(
  operation: () => Promise<T>,
  normalize: () => Promise<void>
): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    if (!isDateConversionError(error)) {
      throw error
    }

    await normalize()
    return operation()
  }
}
