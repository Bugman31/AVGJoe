import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@avgjoe.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      name: 'Admin',
    },
  });

  console.log(`✅ Admin user created: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
