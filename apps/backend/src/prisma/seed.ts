import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Check if admin user exists
    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!adminExists) {
      const passwordHash = await bcrypt.hash('admin123', 12);
      
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@blunow.com',
          passwordHash,
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
          profile: {
            create: {
              username: 'Blunow Admin',
              bio: 'System Administrator',
              birthDate: new Date('1990-01-01'),
              gender: 'OTHER',
              interests: ['System', 'Management', 'Moderation'],
              lookingFor: ['Users'],
            },
          },
        },
      });

      console.log(`✅ Admin user created: ${adminUser.email}`);
    } else {
      console.log('✅ Admin user already exists.');
    }

    console.log('🌱 Seeding completed successfully.');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
