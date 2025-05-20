import { PrismaClient } from '@prisma/client/extension';

const prisma = new PrismaClient();

async function main() {}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
// This is a seed file for the Prisma database. It uses the Prisma Client to connect to the database and perform operations.
