
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Essentials...');

    // 1. Create Default Zone (Required for Dashboard Fallback)
    const zone = await prisma.zone.upsert({
        where: { code: 'Z001' },
        update: {},
        create: {
            name: 'Central Zone',
            code: 'Z001',
            centerLatitude: 12.9141,
            centerLongitude: 74.8560,
            radiusMeters: 1000,
            isActive: true
        }
    });
    console.log(`✅ Zone Created: ${zone.name}`);

    // 2. Create Default Admin
    const admin = await prisma.user.upsert({
        where: { phoneNumber: '+919999999999' },
        update: {},
        create: {
            firebaseUid: 'mock-admin-uid',
            fullName: 'System Admin',
            role: 'ADMIN',
            phoneNumber: '+919999999999',
            dailyTarget: 0,
            isActive: true
            // Not assigning zone to Admin to test fallback logic, or could assign: zoneId: zone.id
        }
    });
    console.log(`✅ Admin Created: ${admin.fullName} (${admin.phoneNumber})`);

    console.log('🚀 Essential Data Seeded. Dashboard should load.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
