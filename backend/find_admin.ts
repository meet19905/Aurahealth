import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  let admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!admin) {
    console.log("No admin found. Creating one...");
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@clinic.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log("Created Admin! Email: admin@clinic.com, Password: admin123");
  } else {
    console.log(`Found existing admin. Email: ${admin.email}`);
    // We can't see the password, so let's reset it to admin123
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.update({
      where: { email: admin.email },
      data: { password: hashedPassword }
    });
    console.log(`Reset password for ${admin.email} to: admin123`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
