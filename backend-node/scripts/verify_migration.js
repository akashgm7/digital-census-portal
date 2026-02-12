const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.count();
    const zones = await prisma.zone.count();
    const addresses = await prisma.masterAddress.count();
    const surveys = await prisma.surveyResponse.count();

    console.log({ users, zones, addresses, surveys });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
