import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkContentTypes() {
  console.log('🔍 Checking content types...\n')

  try {
    const types = await prisma.contentTypeLookup.findMany({
      orderBy: { id: 'asc' },
    })

    if (types.length === 0) {
      console.log('❌ No content types found in database!')
      console.log('\n📋 Run the following command to seed content types:')
      console.log('   npm run prisma:seed\n')
      return false
    }

    console.log('✅ Found content types:')
    types.forEach((type) => {
      console.log(`   ID: ${type.id} | Name: ${type.name}`)
    })

    return true
  } catch (error) {
    console.error('❌ Error checking content types:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

checkContentTypes()
