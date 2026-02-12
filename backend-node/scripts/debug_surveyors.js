const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- Debugging Surveyor Data ---");

    // 1. Get all Supervisors
    const supervisors = await prisma.user.findMany({
        where: { role: 'SUPERVISOR' },
        include: { zone: true }
    });

    console.log(`Found ${supervisors.length} Supervisors.`);

    for (const supervisor of supervisors) {
        console.log(`\nSupervisor: ${supervisor.fullName} (${supervisor.phoneNumber})`);
        console.log(`Assigned Zone: ${supervisor.zone ? supervisor.zone.name : 'None'} (ID: ${supervisor.zoneId})`);

        if (supervisor.zoneId) {
            // 2. Count Surveyors in this Zone
            const surveyors = await prisma.user.findMany({
                where: {
                    role: 'SURVEYOR',
                    zoneId: supervisor.zoneId
                }
            });

            console.log(` -> Surveyors in Zone: ${surveyors.length}`);
            surveyors.forEach(s => console.log(`    - ${s.fullName} (${s.phoneNumber})`));
        } else {
            console.log(" -> No Zone assigned!");
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
