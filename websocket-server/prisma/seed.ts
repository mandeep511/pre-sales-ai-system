import 'dotenv/config'
import bcrypt from 'bcrypt'
import { MongoClient, ObjectId, Collection } from 'mongodb'

const SAMPLE_CAMPAIGN_NAME = 'Sample Pre-Sales Campaign'

interface SeedUserParams {
  email: string
  name: string
  password: string
  role: string
  label: string
}

interface UserDocument {
  _id: ObjectId
  email: string
  name: string
  password: string
  role: string
  active?: boolean
  createdAt?: Date
  updatedAt?: Date
}

async function ensureUser(
  users: Collection<UserDocument>,
  { email, name, password, role, label }: SeedUserParams,
): Promise<UserDocument> {
  const existing = await users.findOne({ email })
  const now = new Date()

  if (!existing) {
    const hashedPassword = await bcrypt.hash(password, 10)
    const doc: Omit<UserDocument, '_id'> = {
      email,
      name,
      password: hashedPassword,
      role,
      active: true,
      createdAt: now,
      updatedAt: now,
    }

    const result = await users.insertOne(doc as unknown as UserDocument)
    const created: UserDocument = { _id: result.insertedId, ...doc }
    console.log(`Created ${label} user: ${created.email}`)
    return created
  }

  const updates: Partial<UserDocument> = {}
  let hasMutation = false

  if (!existing.password?.startsWith('$2')) {
    updates.password = await bcrypt.hash(password, 10)
    hasMutation = true
  }

  if (existing.name !== name) {
    updates.name = name
    hasMutation = true
  }

  if (existing.role !== role) {
    updates.role = role
    hasMutation = true
  }

  if (existing.active === false) {
    updates.active = true
    hasMutation = true
  }

  if (!existing.createdAt) {
    updates.createdAt = now
    hasMutation = true
  }

  if (!existing.updatedAt || hasMutation) {
    updates.updatedAt = now
    hasMutation = true
  }

  if (hasMutation) {
    await users.updateOne({ _id: existing._id }, { $set: updates })
    Object.assign(existing, updates)
    console.log(`Updated ${label} user: ${existing.email}`)
  } else {
    console.log(`${label} user already exists: ${existing.email}`)
  }

  return existing as UserDocument
}

function objectIdsEqual(value: unknown, target: ObjectId): boolean {
  const candidate = value as ObjectId | string | undefined

  if (candidate instanceof ObjectId) {
    return candidate.equals(target)
  }

  if (typeof candidate === 'string') {
    return candidate === target.toHexString()
  }

  return false
}

async function ensureSampleCampaign(
  campaigns: Collection,
  operatorId: ObjectId,
) {
  const existing = await campaigns.findOne({ name: SAMPLE_CAMPAIGN_NAME })
  const now = new Date()
  const defaultPostCallForm = [
    { type: 'checkbox', label: 'Interested in demo', key: 'interested' },
    { type: 'text', label: 'Pain points', key: 'painPoints' },
    {
      type: 'select',
      label: 'Company size',
      key: 'companySize',
      options: ['1-10', '11-50', '51-200', '200+'],
    },
  ]
  const defaultTools: unknown[] = []

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

  if (!existing) {
    await campaigns.insertOne({
      name: SAMPLE_CAMPAIGN_NAME,
      description: 'Demo campaign for testing',
      systemPrompt:
        "You are a helpful pre-sales assistant. Your goal is to understand the prospect's needs and schedule a demo.",
      callGoal: 'Qualify lead and schedule demo',
      voice: 'alloy',
      status: 'draft',
      postCallForm: defaultPostCallForm,
      tools: defaultTools,
      batchSize: 10,
      callGap: 30,
      maxRetries: 3,
      priority: 0,
      createdById: operatorId,
      createdAt: now,
      updatedAt: now,
    })

    console.log('Created campaign:', SAMPLE_CAMPAIGN_NAME)
    return
  }

  const updates: Record<string, unknown> = {}

  if (!objectIdsEqual(existing.createdById, operatorId)) {
    updates.createdById = operatorId
  }

  if (!existing.voice) {
    updates.voice = 'alloy'
  }

  if (typeof existing.batchSize !== 'number') {
    updates.batchSize = 10
  }

  if (typeof existing.callGap !== 'number') {
    updates.callGap = 30
  }

  if (typeof existing.maxRetries !== 'number') {
    updates.maxRetries = 3
  }

  if (typeof existing.priority !== 'number') {
    updates.priority = 0
  }

  const existingPostCallForm = ensureArray(existing.postCallForm)
  if (existingPostCallForm.length === 0 && defaultPostCallForm.length > 0) {
    updates.postCallForm = defaultPostCallForm
  }

  const existingTools = ensureArray(existing.tools)
  if (existingTools.length === 0 && defaultTools.length > 0) {
    updates.tools = defaultTools
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = now
    await campaigns.updateOne({ _id: existing._id }, { $set: updates })
    console.log('Updated campaign:', SAMPLE_CAMPAIGN_NAME)
  } else {
    console.log('Campaign already exists:', SAMPLE_CAMPAIGN_NAME)
  }
}

async function main() {
  console.log('Seeding database...')
  const uri = process.env.DATABASE_URL

  if (!uri) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = new MongoClient(uri)
  await client.connect()

  try {
    const db = client.db()
    const users = db.collection<UserDocument>('User')
    const campaigns = db.collection('Campaign')

    const operator = await ensureUser(users, {
      email: 'operator@example.com',
      name: 'Default Operator',
      password: 'operator123',
      role: 'operator',
      label: 'Operator',
    })

    await ensureUser(users, {
      email: 'demo@example.com',
      name: 'Demo User',
      password: 'demo123',
      role: 'admin',
      label: 'Demo',
    })

    await ensureSampleCampaign(campaigns, operator._id)

    console.log('Seeding complete!')
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error('Seeding failed:', error)
  process.exit(1)
})
