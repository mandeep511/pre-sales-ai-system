import { PrismaClient } from '@prisma/client/index'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: 'demo123',
      role: 'admin',
    },
  })

  console.log('Created demo user:', user)

  // Create demo campaign
  let campaign = await prisma.campaign.findFirst({
    where: { name: 'Demo Campaign' },
  })

  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        name: 'Demo Campaign',
        description: 'A sample campaign for testing',
        systemPrompt:
          'You are a helpful pre-sales assistant. Your goal is to qualify leads and schedule demos.',
        callGoal: 'Qualify lead and schedule demo',
        voice: 'alloy',
        status: 'draft',
        createdById: user.id,
      },
    })

    console.log('Created demo campaign:', campaign)
  } else {
    console.log('Demo campaign already exists:', campaign)
  }

  console.log('Seeding complete!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
