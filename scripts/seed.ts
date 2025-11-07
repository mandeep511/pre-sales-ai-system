import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('operator123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'operator@example.com' },
    update: {},
    create: {
      email: 'operator@example.com',
      password: hashedPassword,
      name: 'Default Operator',
      role: 'operator',
    },
  })

  console.log('Created user:', user.email)

  const campaign = await prisma.campaign.create({
    data: {
      name: 'Sample Pre-Sales Campaign',
      description: 'Demo campaign for testing',
      systemPrompt: "You are a helpful pre-sales assistant. Your goal is to understand the prospect's needs and schedule a demo.",
      callGoal: 'Qualify lead and schedule demo',
      status: 'draft',
      createdById: user.id,
      postCallForm: [
        { type: 'checkbox', label: 'Interested in demo', key: 'interested' },
        { type: 'text', label: 'Pain points', key: 'painPoints' },
        { type: 'select', label: 'Company size', key: 'companySize', options: ['1-10', '11-50', '51-200', '200+'] },
      ],
      tools: [],
    },
  })

  console.log('Created campaign:', campaign.name)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
