
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Get the target zone (Hampankatta or first active)
    const zone = await prisma.zone.findFirst({ where: { isActive: true } });
    if (!zone) {
        console.log("No active zone found.");
        return;
    }
    console.log(`Seeding data for Zone: ${zone.name} (${zone.id})`);

    // 2. Get a Surveyor (or create one)
    let surveyor = await prisma.user.findFirst({ where: { role: 'SURVEYOR', zoneId: zone.id } });
    if (!surveyor) {
        console.log("Creating mock surveyor...");
        surveyor = await prisma.user.create({
            data: {
                phoneNumber: '+919876543299',
                fullName: 'Demo Surveyor',
                role: 'SURVEYOR',
                firebaseUid: 'demo-surveyor-uid',
                zoneId: zone.id,
                dailyTarget: 10
            }
        });
    }

    // 3. Get a Master Address (or create one)
    let address = await prisma.masterAddress.findFirst({ where: { zoneId: zone.id } });
    if (!address) {
        address = await prisma.masterAddress.create({
            data: {
                pincode: '575001',
                addressLine1: 'Demo House #1',
                status: 'ACTIVE',
                zoneId: zone.id
            }
        });
    }

    // 4. Create Surveys (States: SUBMITTED, VERIFIED, FLAGGED)
    console.log("Creating surveys...");

    // SUBMITTED (Pending Verification)
    await prisma.surveyResponse.create({
        data: {
            status: 'SUBMITTED',
            headName: 'John Doe',
            surveyorId: surveyor.id,
            zoneId: zone.id,
            masterAddressId: address.id,
            gpsLatitude: 12.9141,
            gpsLongitude: 74.8560
        }
    });

    // VERIFIED
    await prisma.surveyResponse.create({
        data: {
            status: 'VERIFIED',
            headName: 'Jane Smith',
            surveyorId: surveyor.id,
            zoneId: zone.id,
            masterAddressId: address.id,
            gpsLatitude: 12.9142,
            gpsLongitude: 74.8561
        }
    });

    // FLAGGED
    await prisma.surveyResponse.create({
        data: {
            status: 'FLAGGED',
            headName: 'Bob Invalid',
            surveyorId: surveyor.id,
            zoneId: zone.id,
            masterAddressId: address.id,
            gpsLatitude: 12.9143,
            gpsLongitude: 74.8562
        }
    });

    console.log("Seeding complete! 3 surveys added.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
