import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Example: create an image record
  await prisma.image.create({
    data: {
      filename: 'example.jpg',
      url: 'https://s3.amazonaws.com/bucket/example.jpg',
      status: 'ACCEPTED',
      mimetype: 'image/jpeg',
      size: 123456,
      reason: null,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
