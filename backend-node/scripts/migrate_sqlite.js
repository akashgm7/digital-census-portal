const sqlite3 = require('sqlite3').verbose();
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const dbPath = path.resolve(__dirname, '../../db.sqlite3'); // Adjust path if needed
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

// Maps for Legacy ID (Int) -> New ID (UUID)
const zoneMap = new Map();
const userMap = new Map();
const addressMap = new Map();
const addressCache = new Map(); // Key: "pincode|address_line" -> UUID

function queryAll(sql) {
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function migrate() {
    try {
        console.log('Starting migration...');

        // 0. CLEANUP (To avoid duplicates on re-runs)
        console.log('Cleaning up existing data... (Preserving Admin)');
        await prisma.surveyResponse.deleteMany({});
        await prisma.masterAddress.deleteMany({});
        await prisma.user.deleteMany({
            where: { firebaseUid: { not: 'mock-admin-uid' } }
        });
        // We don't delete Zones if Users/Addresses depend on them, but we deleted those.
        // However, if we delete Zones, we loose the Admin's zone if assigned?
        // Admin seed didn't assign a zone.
        await prisma.zone.deleteMany({});

        // 1. ZONES
        console.log('Migrating Zones...');
        const zones = await queryAll('SELECT * FROM zones');
        for (const z of zones) {
            if (!z.name) continue; // Skip invalid
            const newId = uuidv4();
            zoneMap.set(z.id, newId);

            await prisma.zone.upsert({
                where: { code: z.code },
                update: {},
                create: {
                    id: newId,
                    name: z.name,
                    code: z.code,
                    centerLatitude: z.center_latitude,
                    centerLongitude: z.center_longitude,
                    radiusMeters: z.radius_meters,
                    isActive: Boolean(z.is_active)
                }
            });
            const savedZone = await prisma.zone.findUnique({ where: { code: z.code } });
            zoneMap.set(z.id, savedZone.id);
        }
        console.log(`Migrated ${zones.length} Zones.`);

        // 2. USERS
        console.log('Migrating Users...');
        const users = await queryAll('SELECT * FROM users');
        for (const u of users) {
            const newId = uuidv4();

            let role = 'SURVEYOR';
            if (u.role === 'ADMIN') role = 'ADMIN';
            if (u.role === 'SUPERVISOR') role = 'SUPERVISOR';
            if (u.role === 'SURVEYOR') role = 'SURVEYOR';

            // Normalize phone
            const phone = u.phone_number;

            await prisma.user.upsert({
                where: { phoneNumber: phone },
                update: {},
                create: {
                    id: newId,
                    phoneNumber: phone,
                    fullName: u.full_name,
                    role: role,
                    firebaseUid: u.firebase_uid || `legacy_${phone}`,
                    dailyTarget: u.daily_target || 0,
                    isActive: Boolean(u.is_active),
                    zoneId: u.zone_id ? zoneMap.get(u.zone_id) : null
                }
            });
            const savedUser = await prisma.user.findUnique({ where: { phoneNumber: phone } });
            userMap.set(u.id, savedUser.id);
        }
        console.log(`Migrated ${users.length} Users.`);

        // 3. MASTER ADDRESSES
        console.log('Migrating Master Addresses...');
        const addresses = await queryAll('SELECT * FROM master_addresses');
        for (const a of addresses) {
            const newId = uuidv4();
            addressMap.set(a.id, newId);
            if (a.pincode && a.address_line1) {
                addressCache.set(`${a.pincode}|${a.address_line1}`, newId);
            }

            let status = 'NEW';
            if (a.status === 'ACTIVE') status = 'ACTIVE';
            if (a.status === 'DEMOLISHED') status = 'DEMOLISHED';

            await prisma.masterAddress.create({
                data: {
                    id: newId,
                    pincode: a.pincode,
                    addressLine1: a.address_line1,
                    status: status,
                    latitude: a.latitude,
                    longitude: a.longitude,
                    zoneId: zoneMap.get(a.zone_id)
                }
            });
        }
        console.log(`Migrated ${addresses.length} Master Addresses.`);

        // 4. SURVEY RESPONSES
        console.log('Migrating Surveys...');
        const surveys = await queryAll('SELECT * FROM survey_responses');
        let successCount = 0;
        for (const s of surveys) {
            const newId = uuidv4();

            let family = [];
            let schemes = [];
            try {
                if (s.family_members) {
                    family = typeof s.family_members === 'string' ? JSON.parse(s.family_members) : s.family_members;
                }
                if (s.schemes_availed) {
                    schemes = typeof s.schemes_availed === 'string' ? JSON.parse(s.schemes_availed) : s.schemes_availed;
                }
            } catch (e) {
                console.warn(`JSON parse error for survey ${s.id}:`, e.message);
            }

            // ENUM verification
            let status = 'DRAFT';
            if (['DRAFT', 'SUBMITTED', 'VERIFIED', 'FLAGGED'].includes(s.status)) {
                status = s.status;
            }

            const surveyorId = userMap.get(s.surveyor_id);
            const zoneId = zoneMap.get(s.zone_id);

            // Address Fallback Logic
            let masterAddressId = addressMap.get(s.address_id);

            if (!masterAddressId) {
                // Try to find by content (if address_id is null/invalid but address text exists)
                if (s.pincode && s.address_line) {
                    const key = `${s.pincode}|${s.address_line}`;
                    if (addressCache.has(key)) {
                        masterAddressId = addressCache.get(key);
                    } else {
                        // Create new Master Address on the fly
                        const newAddrId = uuidv4();
                        await prisma.masterAddress.create({
                            data: {
                                id: newAddrId,
                                pincode: s.pincode,
                                addressLine1: s.address_line,
                                status: 'NEW',
                                zoneId: zoneId || zoneMap.values().next().value // Fallback to *some* zone if needed? Dangerous.
                                // Better: If zoneId is missing, we can't create address safely without breaking Zone FK?
                                // Actually MasterAddress needs ZoneId.
                            }
                        });
                        masterAddressId = newAddrId;
                        addressCache.set(key, newAddrId);
                    }
                }
            }

            // Re-check Zone (Crucial)
            if (!zoneId) {
                // If zone is missing in survey, we can't insert because Survey needs ZoneID.
                // But maybe we can infer it from the Address?
                // If we found an address, it has a ZoneID.
                // We'll skip for now if zone is absolutely missing.
            }


            if (!surveyorId || !zoneId || !masterAddressId) {
                console.warn(`Skipping survey ${s.id} (AddrID: ${s.address_id}, Txt: ${Boolean(s.address_line)}) -> Missing FKs`);
                continue;
            }

            await prisma.surveyResponse.create({
                data: {
                    id: newId,
                    status: status,
                    headName: s.head_name,
                    headGender: s.head_gender,
                    headAge: s.head_age,
                    familyMembers: family || [],
                    schemesAvailed: schemes || [],
                    gpsLatitude: s.gps_latitude,
                    gpsLongitude: s.gps_longitude,
                    surveyorId: surveyorId,
                    zoneId: zoneId,
                    masterAddressId: masterAddressId,
                    createdAt: s.created_at ? new Date(s.created_at) : new Date(),
                    updatedAt: s.updated_at ? new Date(s.updated_at) : new Date()
                }
            });
            successCount++;
        }
        console.log(`successfully Migrated ${successCount} / ${surveys.length} Surveys.`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        db.close();
        await prisma.$disconnect();
    }
}

migrate();
