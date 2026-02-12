
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const zones = await prisma.zone.findMany();
    console.log('Zones in DB:', zones);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
