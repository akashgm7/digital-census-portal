
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const zonesData = [
    { name: 'Hampankatta', code: '575001', centerLatitude: 12.8700, centerLongitude: 74.8425, radiusMeters: 1000 },
    { name: 'Bunder', code: '575001', centerLatitude: 12.8650, centerLongitude: 74.8390, radiusMeters: 1000 },
    { name: 'Gandhinagar', code: '575003', centerLatitude: 12.8780, centerLongitude: 74.8350, radiusMeters: 1000 },
    { name: 'Lalbagh', code: '575003', centerLatitude: 12.8730, centerLongitude: 74.8380, radiusMeters: 1000 },
    { name: 'Kodialbail', code: '575003', centerLatitude: 12.8750, centerLongitude: 74.8400, radiusMeters: 1000 },
    { name: 'Bejai', code: '575004', centerLatitude: 12.8850, centerLongitude: 74.8450, radiusMeters: 3000 },
    { name: 'Kadri', code: '575002', centerLatitude: 12.8800, centerLongitude: 74.8500, radiusMeters: 1000 },
    { name: 'Kankanady', code: '575002', centerLatitude: 12.8680, centerLongitude: 74.8550, radiusMeters: 1000 },
    { name: 'Valencia', code: '575002', centerLatitude: 12.8600, centerLongitude: 74.8550, radiusMeters: 1000 },
    { name: 'Jeppu', code: '575002', centerLatitude: 12.8550, centerLongitude: 74.8400, radiusMeters: 1000 },
    { name: 'Falnir', code: '575002', centerLatitude: 12.8650, centerLongitude: 74.8450, radiusMeters: 1000 },
    { name: 'Attavar', code: '575001', centerLatitude: 12.8600, centerLongitude: 74.8450, radiusMeters: 1000 },
    { name: 'Pandeshwar', code: '575001', centerLatitude: 12.8600, centerLongitude: 74.8400, radiusMeters: 1000 },
    { name: 'Hoige Bazar', code: '575001', centerLatitude: 12.8550, centerLongitude: 74.8350, radiusMeters: 1000 },
    { name: 'Mangaladevi', code: '575001', centerLatitude: 12.8500, centerLongitude: 74.8400, radiusMeters: 1000 },
];

const zoneStreets = {
    'Hampankatta': [
        ['Hampankatta Main Road', 'Near Hampankatta Circle'],
        ['KS Rao Road', 'Near Corporation Bank'],
        ['Balmatta Road', 'Near Clock Tower'],
        ['Lighthouse Hill Road', 'Near Lighthouse Hill'],
        ['Masjid Road, Hampankatta', 'Near Juma Masjid'],
        ['PVS Circle Road', 'Near PVS Circle'],
        ['Bunts Hostel Road', 'Near Bunts Hostel'],
        ['Forum Mall Road', 'Near Forum Fiza Mall'],
        ['AB Shetty Circle Road', 'Near AB Shetty Circle'],
        ['MG Road, Hampankatta', 'Near City Centre'],
    ],
    'Bunder': [
        ['Old Port Road, Bunder', 'Near Old Port'],
        ['Fish Market Road, Bunder', 'Near Fish Market'],
        ['Bunder Main Road', 'Near Bunder Junction'],
        ['Sultan Bathery Road', 'Near Sultan Bathery'],
        ['Boat Jetty Road, Bunder', 'Near Boat Jetty'],
        ['Dock Yard Road, Bunder', 'Near Dock Yard'],
        ['Custom House Road', 'Near Custom House'],
        ['Ferry Road, Bunder', 'Near Ferry Terminal'],
        ['Warehouse Lane, Bunder', 'Near Central Warehouse'],
        ['Harbour View Road', 'Near Harbour View Park'],
    ],
    'Gandhinagar': [
        ['Gandhinagar Main Road', 'Near Gandhinagar Bus Stop'],
        ['1st Cross, Gandhinagar', 'Near Corporation School'],
        ['2nd Cross, Gandhinagar', 'Near Ration Shop'],
        ['3rd Cross, Gandhinagar', 'Near Gandhinagar Park'],
        ['4th Cross, Gandhinagar', 'Near Community Hall'],
        ['Temple Road, Gandhinagar', 'Near Ganapathi Temple'],
        ['Market Lane, Gandhinagar', 'Near Vegetable Market'],
        ['School Road, Gandhinagar', 'Near Govt. High School'],
        ['Tank Bund Road, Gandhinagar', 'Near Water Tank'],
        ['Library Road, Gandhinagar', 'Near Public Library'],
    ],
    'Lalbagh': [
        ['Lalbagh Main Road', 'Near Lalbagh Gate'],
        ['1st Cross, Lalbagh', 'Near Lalbagh Garden'],
        ['2nd Cross, Lalbagh', 'Near Lalbagh Masjid'],
        ['Rose Garden Lane, Lalbagh', 'Near Rose Garden'],
        ['Flower Market Road, Lalbagh', 'Near Flower Market'],
        ['Lalbagh Tank Road', 'Near Lalbagh Tank'],
        ['East Gate Road, Lalbagh', 'Near East Gate'],
        ['Nursery Lane, Lalbagh', 'Near Govt. Nursery'],
        ['Fountain Road, Lalbagh', 'Near Glass House'],
        ['Bandstand Road, Lalbagh', 'Near Bandstand'],
    ],
    'Kodialbail': [
        ['Kodialbail Main Road', 'Near Kodialbail Junction'],
        ['1st Cross, Kodialbail', 'Near Kodialbail Police Station'],
        ['2nd Cross, Kodialbail', 'Near Fire Station'],
        ['Jail Road, Kodialbail', 'Near District Jail'],
        ['Court Road, Kodialbail', 'Near District Court'],
        ['Hospital Road, Kodialbail', 'Near Wenlock Hospital'],
        ['Museum Road, Kodialbail', 'Near Shreemanthi Bai Museum'],
        ['Car Street, Kodialbail', 'Near Car Street Temple'],
        ['Bank Road, Kodialbail', 'Near Syndicate Bank'],
        ['Circle Road, Kodialbail', 'Near Kodialbail Circle'],
    ],
    'Bejai': [
        ['Bejai Main Road', 'Near Bejai Junction'],
        ['Bejai New Road', 'Near Bejai Church'],
        ['Kapikad Road, Bejai', 'Near Kapikad'],
        ['Bejai Kapikad Road', 'Near Jyothi Circle'],
        ['Palm Grove Road, Bejai', 'Near Palm Grove'],
        ['Marigold Lane, Bejai', 'Near Marigold Apartments'],
        ['Hill Top Road, Bejai', 'Near Hill Top Colony'],
        ['Temple Lane, Bejai', 'Near Bejai Temple'],
        ['Ashok Nagar, Bejai', 'Near Ashok Nagar Park'],
        ['School Road, Bejai', 'Near Bejai School'],
    ],
    'Kadri': [
        ['Kadri Main Road', 'Near Kadri Temple'],
        ['Kadri Hills Road', 'Near Kadri Park'],
        ['Kadri Kambla Road', 'Near Kambla Grounds'],
        ['Padavu Road, Kadri', 'Near Padavu Junction'],
        ['Shivabagh Road, Kadri', 'Near Shivabagh'],
        ['Nanthoor Road, Kadri', 'Near Nanthoor Circle'],
        ['Temple View Road, Kadri', 'Near Manjunath Temple'],
        ['Lake Side Road, Kadri', 'Near Kadri Lake'],
        ['Garden Lane, Kadri', 'Near Pilikula Garden'],
        ['Mallikatte Road, Kadri', 'Near Mallikatte'],
    ],
    'Kankanady': [
        ['Kankanady Main Road', 'Near Kankanady Junction'],
        ['Pumpwell Circle Road', 'Near Pumpwell Circle'],
        ['Bikarnakatte Road', 'Near Bikarnakatte'],
        ['KPT Road, Kankanady', 'Near KPT Junction'],
        ['Maroli Road, Kankanady', 'Near Maroli'],
        ['Ajjarakad Road, Kankanady', 'Near Ajjarakad'],
        ['Father Muller Road', 'Near Father Muller Hospital'],
        ['Bendoor Well Road', 'Near Bendoor Well'],
        ['Market Road, Kankanady', 'Near Kankanady Market'],
        ['School Lane, Kankanady', 'Near St. Agnes School'],
    ],
    'Valencia': [
        ['Valencia Main Road', 'Near Valencia Church'],
        ['1st Cross, Valencia', 'Near Valencia Ground'],
        ['2nd Cross, Valencia', 'Near Valencia Junction'],
        ['Hill View Road, Valencia', 'Near Valencia Hill'],
        ['Church Lane, Valencia', 'Near St. Mary Church'],
        ['Garden Street, Valencia', 'Near Public Garden'],
        ['Station Road, Valencia', 'Near Valencia Station'],
        ['College Road, Valencia', 'Near St. Aloysius College'],
        ['Beach Road, Valencia', 'Near Panambur Beach'],
        ['Industrial Area, Valencia', 'Near KIOSK Factory'],
    ],
    'Jeppu': [
        ['Jeppu Main Road', 'Near Jeppu Junction'],
        ['Jeppu Bappal Road', 'Near Jeppu Bappal'],
        ['Jeppu Market Road', 'Near Jeppu Market'],
        ['Morgan Gate Road, Jeppu', 'Near Morgan Gate'],
        ['Rosario Road, Jeppu', 'Near Rosario Church'],
        ['Seminary Road, Jeppu', 'Near Seminary'],
        ['Jeppu Cross Road', 'Near Jeppu Cross'],
        ['Milagres Road, Jeppu', 'Near Milagres Church'],
        ['Port Road, Jeppu', 'Near Jeppu Port'],
        ['Beach Lane, Jeppu', 'Near Jeppu Beach'],
    ],
    'Falnir': [
        ['Falnir Main Road', 'Near Falnir Junction'],
        ['Falnir Cross Road', 'Near Falnir Church'],
        ['Falnir Padil Road', 'Near Padil Junction'],
        ['Falnir Well Road', 'Near Falnir Well'],
        ['Matadakani Road, Falnir', 'Near Matadakani'],
        ['Light House Road, Falnir', 'Near Light House'],
        ['Tagore Park Road, Falnir', 'Near Tagore Park'],
        ['Palm Beach Road, Falnir', 'Near Palm Beach'],
        ['Nethravathi Road, Falnir', 'Near River View'],
        ['Heritage Lane, Falnir', 'Near Heritage Building'],
    ],
    'Attavar': [
        ['Attavar Main Road', 'Near Attavar Junction'],
        ['1st Cross, Attavar', 'Near City Hospital'],
        ['2nd Cross, Attavar', 'Near Attavar Bus Stop'],
        ['Temple Street, Attavar', 'Near Sri Krishna Temple'],
        ['Market Road, Attavar', 'Near Attavar Market'],
        ['School Lane, Attavar', 'Near Govt. School'],
        ['Park Avenue, Attavar', 'Near Children Park'],
        ['Gandhi Nagar, Attavar', 'Near Post Office'],
        ['Nehru Street, Attavar', 'Near Nehru Circle'],
        ['Lake View Road, Attavar', 'Near Kadri Lake'],
    ],
    'Pandeshwar': [
        ['Pandeshwar Main Road', 'Near Pandeshwar Temple'],
        ['Pandeshwar Cross Road', 'Near Pandeshwar Junction'],
        ['Town Hall Road, Pandeshwar', 'Near Town Hall'],
        ['Treasury Road, Pandeshwar', 'Near Treasury Office'],
        ['DC Office Road, Pandeshwar', 'Near DC Office'],
        ['Maidan Road, Pandeshwar', 'Near Nehru Maidan'],
        ['Karavali Road, Pandeshwar', 'Near Karavali Utsav'],
        ['Tagore Road, Pandeshwar', 'Near Tagore Park'],
        ['Central Market Road', 'Near Central Market'],
        ['Bank Lane, Pandeshwar', 'Near SBI Main Branch'],
    ],
    'Hoige Bazar': [
        ['Hoige Bazar Main Road', 'Near Hoige Bazar Market'],
        ['1st Cross, Hoige Bazar', 'Near Fish Market'],
        ['2nd Cross, Hoige Bazar', 'Near Boat Building Yard'],
        ['Old Harbour Road, Hoige Bazar', 'Near Old Harbour'],
        ['Masjid Road, Hoige Bazar', 'Near Hoige Bazar Masjid'],
        ['School Road, Hoige Bazar', 'Near Urdu School'],
        ['Well Lane, Hoige Bazar', 'Near Community Well'],
        ['Shore Road, Hoige Bazar', 'Near Shore Temple'],
        ['Market Lane, Hoige Bazar', 'Near Spice Market'],
        ['Trader Street, Hoige Bazar', 'Near Traders Association'],
    ],
    'Mangaladevi': [
        ['Mangaladevi Main Road', 'Near Mangaladevi Temple'],
        ['Mangaladevi Temple Road', 'Near Temple Gate'],
        ['Boloor Road, Mangaladevi', 'Near Boloor Junction'],
        ['Tank Lane, Mangaladevi', 'Near Temple Tank'],
        ['Flower Garden Road, Mangaladevi', 'Near Flower Garden'],
        ['Heritage Road, Mangaladevi', 'Near Heritage Museum'],
        ['Pilgrim Lane, Mangaladevi', 'Near Pilgrim Rest'],
        ['Festival Road, Mangaladevi', 'Near Festival Ground'],
        ['Old Temple Road, Mangaladevi', 'Near Old Temple'],
        ['Prasad Lane, Mangaladevi', 'Near Prasad Hall'],
    ],
};

async function main() {
    console.log('🚀 Starting Comprehensive Seeding...');

    // 1. Clear existing data to avoid conflicts (Child to Parent order)
    console.log('Clearing old data...');
    await prisma.surveyResponse.deleteMany({});
    await prisma.dailyProgress.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.masterAddress.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.zone.deleteMany({});

    // 2. Create Zones
    console.log('Creating Zones...');
    const zones = [];
    for (const z of zonesData) {
        const zone = await prisma.zone.create({ data: z });
        zones.push(zone);
    }
    console.log(`✅ Created ${zones.length} Zones.`);

    // 3. Create Addresses
    console.log('Creating Master Addresses...');
    let doorCounter = 1;
    let addressCount = 0;
    for (const zone of zones) {
        const streets = zoneStreets[zone.name] || [];
        for (const [street, landmark] of streets) {
            await prisma.masterAddress.create({
                data: {
                    zoneId: zone.id,
                    pincode: zone.code,
                    addressLine1: `Door No. ${doorCounter}, ${street}`,
                    buildingNumber: `${doorCounter}`,
                    landmark: landmark,
                    status: 'ACTIVE'
                }
            });
            doorCounter++;
            addressCount++;
        }
    }
    console.log(`✅ Created ${addressCount} Addresses.`);

    // 4. Create Users
    console.log('Creating Users...');

    // Admin
    await prisma.user.create({
        data: {
            phoneNumber: '+919876543210',
            fullName: 'Main Admin',
            role: 'ADMIN',
            firebaseUid: 'mock-admin-uid-1',
            isActive: true
        }
    });

    let basePhone = 9876500000;

    for (const zone of zones) {
        // 1 Supervisor per zone
        const supPhone = `+91${basePhone++}`;
        await prisma.user.create({
            data: {
                phoneNumber: supPhone,
                fullName: `Supervisor - ${zone.name}`,
                role: 'SUPERVISOR',
                firebaseUid: `uid-sup-${zone.name.toLowerCase()}`,
                zoneId: zone.id,
                isActive: true
            }
        });

        // 3 Surveyors per zone
        for (let i = 1; i <= 3; i++) {
            const survPhone = `+91${basePhone++}`;
            await prisma.user.create({
                data: {
                    phoneNumber: survPhone,
                    fullName: `Surveyor ${i} - ${zone.name}`,
                    role: 'SURVEYOR',
                    firebaseUid: `uid-surv-${i}-${zone.name.toLowerCase()}`,
                    zoneId: zone.id,
                    dailyTarget: 10,
                    isActive: true
                }
            });
        }
    }

    console.log('✅ Created ~61 Users.');
    console.log('🏁 Seeding finished successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
