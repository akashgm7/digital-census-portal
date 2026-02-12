
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const zoneCount = await prisma.zone.count();
    const addressCount = await prisma.masterAddress.count();
    const userCount = await prisma.user.count();

    console.log('--- Database Status ---');
    console.log(`Zones: ${zoneCount}`);
    console.log(`Addresses: ${addressCount}`);
    console.log(`Users: ${userCount}`);

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    console.log(`Admin User: ${admin ? admin.phoneNumber : 'Not Found'}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
