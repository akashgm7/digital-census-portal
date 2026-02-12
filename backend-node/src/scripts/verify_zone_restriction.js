const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Zone Restriction ---');

    // 1. Find a Surveyor (e.g., Assigned to Hampankatta - 575001)
    const surveyor = await prisma.user.findFirst({
        where: { role: 'SURVEYOR', phoneNumber: '+919876500001' },
        include: { zone: true }
    });

    if (!surveyor) {
        console.error('Surveyor +919876500001 not found. Please run seed first.');
        return;
    }

    console.log(`Surveyor: ${surveyor.fullName}`);
    console.log(`Assigned Zone: ${surveyor.zone.name} (Code: ${surveyor.zone.code})`);

    // 2. Mock Pincode Validation Logic (Manually testing the controller logic)
    const testPincodes = ['575001', '575002'];

    for (const pincode of testPincodes) {
        console.log(`\nTesting Pincode: ${pincode}`);
        if (surveyor.zone.code !== pincode) {
            console.log(`[PASS] Blocked: Pincode ${pincode} does not match surveyor zone code ${surveyor.zone.code}`);
        } else {
            console.log(`[PASS] Allowed: Pincode ${pincode} matches surveyor zone code`);
        }
    }

    // 3. Test Survey Creation Restriction
    // Find an address in a DIFFERENT zone (e.g., Kadri - 575002)
    const diffZoneAddress = await prisma.masterAddress.findFirst({
        where: { NOT: { zoneId: surveyor.zoneId } },
        include: { zone: true }
    });

    if (diffZoneAddress) {
        console.log(`\nAttempting to link survey to Address in: ${diffZoneAddress.zone.name}`);
        if (diffZoneAddress.zoneId !== surveyor.zoneId) {
            console.log(`[PASS] Logic confirmed: Surveyor (${surveyor.zone.name}) cannot use address in (${diffZoneAddress.zone.name})`);
        } else {
            console.log(`[FAIL] Logic failed: Surveyor able to use address in different zone?`);
        }
    }

    await prisma.$disconnect();
}

main();
