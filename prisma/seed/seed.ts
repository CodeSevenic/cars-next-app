import { PrismaClient } from '@prisma/client';
import { seedTaxonomy } from './taxonomy.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  await prisma.$executeRaw`TRUNCATE TABLE "makes" RESTART IDENTITY CASCADE`;
  await seedTaxonomy(prisma);
  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
// This is a seed file for the Prisma database. It uses the Prisma Client to connect to the database and perform operations.
