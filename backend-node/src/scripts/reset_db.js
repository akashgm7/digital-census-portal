
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Starting Database Reset...');

    // Delete in order of dependencies (Child -> Parent)

    console.log('Deleting Audit Logs...');
    await prisma.auditLog.deleteMany({});

    console.log('Deleting Daily Progress...');
    await prisma.dailyProgress.deleteMany({});

    console.log('Deleting Survey Responses...');
    await prisma.surveyResponse.deleteMany({});

    console.log('Deleting Master Addresses...');
    await prisma.masterAddress.deleteMany({});

    console.log('Deleting Users...');
    await prisma.user.deleteMany({});

    console.log('Deleting Zones...');
    await prisma.zone.deleteMany({});

    console.log('✅ Database Cleared (Schema Intact).');
}

main()
    .catch((e) => {
        console.error('❌ Error clearing database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
