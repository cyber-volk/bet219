const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      balance: 1000,
    },
  })

  // Create agent user
  const agentPassword = await bcrypt.hash('agent123', 10)
  await prisma.user.upsert({
    where: { username: 'agent' },
    update: {},
    create: {
      username: 'agent',
      passwordHash: agentPassword,
      role: 'AGENT',
      balance: 500,
    },
  })

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10)
  await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      passwordHash: userPassword,
      role: 'USER',
      balance: 100,
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
