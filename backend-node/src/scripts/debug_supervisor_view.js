
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

async function main() {
    // 1. Get First Active Zone (Simulation of Admin Fallback)
    const zone = await prisma.zone.findFirst({ where: { isActive: true } });

    if (!zone) {
        console.log("No active zones found.");
        return;
    }

    console.log(`\n--- Debugging Zone: ${zone.name} (${zone.id}) ---`);

    // 2. Total Surveys
    const totalSurveys = await prisma.surveyResponse.count({ where: { zoneId: zone.id } });
    console.log(`Total Surveys in Zone: ${totalSurveys}`);

    // 3. Status Breakdown
    const statusCounts = await prisma.surveyResponse.groupBy({
        by: ['status'],
        where: { zoneId: zone.id },
        _count: { status: true }
    });
    console.log("Status Breakdown:", statusCounts);

    // 4. Today's Data
    const { start, end } = getTodayRange();
    console.log(`\nChecking "Today" Range: ${start.toISOString()} to ${end.toISOString()}`);

    const todaysSurveys = await prisma.surveyResponse.count({
        where: {
            zoneId: zone.id,
            createdAt: { gte: start, lte: end }
        }
    });
    console.log(`Surveys Created Today: ${todaysSurveys}`);

    // 5. Check Recent Surveys (to see their dates)
    const recent = await prisma.surveyResponse.findMany({
        where: { zoneId: zone.id },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, status: true }
    });
    console.log("\nMost Recent 3 Surveys:", recent);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
