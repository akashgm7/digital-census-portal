const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

// console.log('DB URL:', process.env.DATABASE_URL); // Debug logging

async function main() {
    const mockUser = await prisma.user.upsert({
        where: { firebaseUid: 'mock-admin-uid' },
        update: {},
        create: {
            firebaseUid: 'mock-admin-uid',
            fullName: 'Admin User',
            role: 'ADMIN',
            phoneNumber: '+919999999999',
            dailyTarget: 10
        },
    });
    console.log({ mockUser });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
