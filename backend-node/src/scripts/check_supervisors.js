
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const noZoneSupervisors = await prisma.user.findMany({
        where: {
            role: 'SUPERVISOR',
            zoneId: null
        }
    });
    console.log('Supervisors with NO Zone:', noZoneSupervisors);

    const allSupervisors = await prisma.user.findMany({ where: { role: 'SUPERVISOR' } });
    console.log('Total Supervisors:', allSupervisors.length);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
