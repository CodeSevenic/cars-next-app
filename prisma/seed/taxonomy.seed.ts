import type { Prisma, PrismaClient } from '@prisma/client';
import { parse } from 'csv';
import fs from 'node:fs';

type Rows = {
  make: string;
  model: string;
  variant?: string | undefined;
  yearStart: number;
  yearEnd: number;
};

export async function seedTaxonomy(prisma: PrismaClient) {
  const rows = await new Promise<Rows[]>((resolve, reject) => {
    const eachRow: Rows[] = [];
    fs.createReadStream('taxonomy.csv')
      .pipe(parse({ columns: true }))
      .on('data', async (row: { [index: string]: string }) => {
        eachRow.push({
          make: row.Make,
          model: row.Model,
          variant: row.Model_Variant || undefined,
          yearStart: Number(row.Year_Start),
          yearEnd: row.Year_End ? Number(row.Year_End) : new Date().getFullYear(),
        });
      })
      .on('error', (error: Error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      })
      .on('end', () => {
        console.log('CSV file successfully processed');
        resolve(eachRow);
      });
  });

  type MakeModelMap = {
    [make: string]: {
      [model: string]: {
        variants: {
          [variant: string]: {
            yearStart: number;
            yearEnd: number;
          };
        };
      };
    };
  };

  const result: MakeModelMap = {};
  for (const row of rows) {
    if (!result[row.make]) {
      result[row.make] = {};
    }

    if (!result[row.make][row.model]) {
      result[row.make][row.model] = {
        variants: {},
      };
    }

    if (row.variant) {
      result[row.make][row.model].variants[row.variant] = {
        yearStart: row.yearStart,
        yearEnd: row.yearEnd,
      };
    }
  }

  console.log({ result });

  const makePromises = Object.entries(result).map(([name]) => {
    return prisma.make.upsert({
      where: {
        name,
      },
      update: {
        name,
        image: `https://vl.imgix.net/img/${name
          ?.replace(/\s+/g, '-')
          .toLowerCase()}-logo.png?auto=format,compress`,
      },
      create: {
        name,
        image: `https://vl.imgix.net/img/${name
          ?.replace(/\s+/g, '-')
          .toLowerCase()}-logo.png?auto=format,compress`,
      },
    });
  });

  const makes = await Promise.all(makePromises);

  // console.log(`Seeded db with ${makeResults.length} makes 🌱`);

  const modelPromises: Prisma.Prisma__ModelClient<unknown, unknown>[] = [];

  for (const make of makes) {
    for (const model in result[make.name]) {
      modelPromises.push(
        prisma.model.upsert({
          where: {
            makeId_name: {
              makeId: make.id,
              name: model,
            },
          },
          update: {
            name: model,
          },
          create: {
            name: model,
            make: {
              connect: {
                id: make.id,
              },
            },
          },
        })
      );
    }
  }

  async function insertInBatches<TUpsertArgs>(
    items: TUpsertArgs[],
    batchSize: number,
    insertFunction: (batch: TUpsertArgs[]) => void
  ) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await insertFunction(batch);
    }
  }
}
