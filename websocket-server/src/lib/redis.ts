import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
})

const normalizeSetArgs = (args: any[]): any[] => {
  if (args.length === 0) {
    return args
  }

  const [first, ...rest] = args

  if (first && typeof first === 'object' && !Array.isArray(first)) {
    const options = first as Record<string, any>
    const normalized: any[] = []

    for (const [rawKey, rawValue] of Object.entries(options)) {
      const option = transformOption(rawKey, rawValue)
      if (!option) {
        continue
      }
      normalized.push(...option)
    }

    return [...normalized, ...rest]
  }

  return args
}

const transformOption = (key: string, value: any): any[] | null => {
  if (value === undefined || value === false) {
    return null
  }

  const upperKey = key.toUpperCase()

  if (value === true) {
    return [upperKey]
  }

  if (upperKey === 'EXPIRATION' && value && typeof value === 'object') {
    const type = String(value.type || value.TYPE || '').toUpperCase()
    const val = value.value ?? value.VALUE
    if (!type) {
      return null
    }
    return val === undefined ? [type] : [type, val]
  }

  if (upperKey === 'CONDITION' && value && typeof value === 'object') {
    const type = String(value.type || value.TYPE || '').toUpperCase()
    if (!type) {
      return null
    }
    return [type]
  }

  return [upperKey, value]
}

const originalSet = redis.set.bind(redis)

redis.set = ((key: any, value: any, ...args: any[]) => {
  const normalizedArgs = normalizeSetArgs(args)
  return originalSet(key, value, ...normalizedArgs)
}) as typeof redis.set

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})

redis.on('connect', () => {
  console.log('Redis connected')
})

export { redis }
