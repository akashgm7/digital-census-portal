const prisma = require('../prismaClient');
const { validateUser } = require('../services/validationService');

// GET /users/
const listUsers = async (req, res) => {
    try {
        const { role, zone_id, search } = req.query;

        const where = {};
        if (role) where.role = role;
        if (zone_id) where.zoneId = zone_id;
        if (search) {
            where.fullName = { contains: search, mode: 'insensitive' };
        }

        const users = await prisma.user.findMany({
            where,
            include: { zone: true },
            orderBy: { fullName: 'asc' }
        });

        // Map to snake_case for frontend
        const mappedUsers = users.map(u => ({
            id: u.id,
            full_name: u.fullName,
            phone_number: u.phoneNumber,
            role: u.role,
            zone: u.zoneId,
            zone_name: u.zone ? u.zone.name : null,
            daily_target: u.dailyTarget,
            is_active: u.isActive
        }));

        res.json(mappedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// POST /users/
const createUser = async (req, res) => {
    try {
        const data = req.body;

        // Validation - Basic check
        if (!data.phone_number && !data.phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Map inputs (snake_case or camelCase)
        let phone = data.phoneNumber || data.phone_number;
        const fullName = data.fullName || data.full_name;
        const role = data.role;
        const zoneId = data.zoneId || data.zone || data.zone_id;
        const dailyTarget = parseInt(data.dailyTarget || data.daily_target || 0);
        let firebaseUid = data.firebaseUid || data.firebase_uid;

        // Validation logic
        // PASS zoneId explicitly so validationService sees it
        const validation = validateUser({
            ...data,
            phoneNumber: phone,
            fullName,
            role,
            zoneId: zoneId
        });
        if (!validation.isValid) {
            return res.status(400).json({ errors: validation.errors });
        }

        // Transformation: Force +91
        phone = phone.replace('+91', '').trim();
        phone = `+91${phone}`;

        // Auto-generate firebaseUid if missing (for manual creation)
        if (!firebaseUid) {
            // Using phone as base for uniqueness in mock setup
            firebaseUid = `uid_${phone.replace('+', '')}`;
        }

        const user = await prisma.user.create({
            data: {
                phoneNumber: phone,
                fullName: fullName,
                role: role,
                firebaseUid: firebaseUid,
                zoneId: zoneId || null,
                dailyTarget: dailyTarget
            }
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Create User Error:', error);
        if (error.code === 'P2002') { // Prisma unique constraint violation
            return res.status(400).json({ error: 'User with this phone or firebase_uid already exists.' });
        }
        res.status(500).json({ error: 'Failed to create user: ' + error.message });
    }
};

// PATCH /users/:id/
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const user = await prisma.user.update({
            where: { id },
            data: {
                fullName: data.fullName,
                role: data.role,
                dailyTarget: data.dailyTarget,
                zoneId: data.zoneId
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
};

// POST /users/:id/block/
const blockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.update({
            where: { id },
            data: { isActive: false }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Block failed' });
    }
};

// POST /users/:id/unblock/
const unblockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.update({
            where: { id },
            data: { isActive: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Unblock failed' });
    }
};

// POST /users/:id/reassign_zone/
const reassignZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { zone_id } = req.body;
        const user = await prisma.user.update({
            where: { id },
            data: { zoneId: zone_id }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Reassign failed' });
    }
};

const fs = require('fs');
const csv = require('csv-parser');

// ... existing code ...

// POST /users/bulk_upload/
const bulkUpload = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    const errors = [];
    let successCount = 0;
    let failureCount = 0;

    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            // Process each row
            for (let i = 0; i < results.length; i++) {
                const row = results[i];
                const rowNum = i + 1; // 1-based index for user feedback

                try {
                    // Normalize keys (handle case sensitivity)
                    const normalizedRow = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[key.trim().toLowerCase()] = row[key].trim();
                    });

                    // Extract fields
                    // Mappings: "Full Name" -> full_name, "Phone Number" -> phone_number
                    const fullName = normalizedRow['full name'] || normalizedRow['fullname'];
                    let phone = normalizedRow['phone number'] || normalizedRow['phonenumber'] || normalizedRow['phone'];
                    const role = (normalizedRow['role'] || 'SURVEYOR').toUpperCase();
                    // Zone Code is expected in CSV vs Zone ID? 
                    // Prompt says "Zone Code". We need to lookup Zone Code -> Zone ID.
                    const zoneCode = normalizedRow['zone code'] || normalizedRow['zone'] || normalizedRow['zonecode'];
                    const dailyTarget = parseInt(normalizedRow['daily target'] || normalizedRow['dailytarget'] || 0);

                    // Basic Validation
                    if (!phone) throw new Error('Phone number is missing');
                    if (!fullName) throw new Error('Full name is missing');

                    // Validate Phone
                    phone = phone.replace('+91', '').replace(/\D/g, ''); // Remove non-digits
                    if (phone.length !== 10) throw new Error('Phone number must be 10 digits');
                    phone = `+91${phone}`;

                    // Look up Zone ID if provided
                    let zoneId = null;
                    if (zoneCode) {
                        const zone = await prisma.zone.findFirst({
                            where: { code: zoneCode }
                        });
                        if (!zone) {
                            // Try finding by name?
                            const zoneByName = await prisma.zone.findFirst({
                                where: { name: { contains: zoneCode, mode: 'insensitive' } }
                            });
                            if (zoneByName) zoneId = zoneByName.id;
                            else throw new Error(`Zone not found with code: ${zoneCode}`);
                        } else {
                            zoneId = zone.id;
                        }
                    }

                    // Role validation
                    if (['SUPERVISOR', 'SURVEYOR'].includes(role) && !zoneId) {
                        throw new Error(`${role} requires a valid Zone Code`);
                    }

                    // Generate Firebase UID
                    const firebaseUid = `uid_${phone.replace('+', '')}`;

                    // Create User
                    await prisma.user.create({
                        data: {
                            phoneNumber: phone,
                            fullName: fullName,
                            role: role, // Ensure it's a valid enum value
                            firebaseUid: firebaseUid,
                            zoneId: zoneId,
                            dailyTarget: dailyTarget
                        }
                    });

                    successCount++;

                } catch (err) {
                    failureCount++;
                    errors.push({
                        row: rowNum,
                        data: row,
                        errors: [err.message] // Array format for frontend
                    });
                }
            }

            // Clean up file
            fs.unlinkSync(filePath);

            res.json({
                total_rows: results.length,
                successful: successCount,
                failed: failureCount,
                errors: errors
            });
        })
        .on('error', (err) => {
            res.status(500).json({ error: 'Failed to process CSV file' });
        });
};

module.exports = {
    listUsers,
    createUser,
    updateUser,
    blockUser,
    unblockUser,
    reassignZone,
    bulkUpload
};
