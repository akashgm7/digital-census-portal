const prisma = require('../prismaClient');
const { v4: uuidv4 } = require('uuid');

// GET /addresses/
const listAddresses = async (req, res) => {
    try {
        const { zone_id, search, status, pincode } = req.query;

        // Security: If user is SURVEYOR, force their zone_id
        let targetZoneId = zone_id;
        if (req.user && req.user.role === 'SURVEYOR') {
            targetZoneId = req.user.zone_id;
        }

        const where = {};
        if (targetZoneId) where.zoneId = targetZoneId;
        if (status) where.status = status;
        if (pincode) where.pincode = pincode;

        if (search) {
            where.OR = [
                { addressLine1: { contains: search, mode: 'insensitive' } },
                { buildingNumber: { startsWith: search, mode: 'insensitive' } }
            ];
        }

        const addresses = await prisma.masterAddress.findMany({
            where,
            include: {
                zone: true,
                surveys: {
                    where: {
                        status: { in: ['DRAFT', 'SUBMITTED', 'VERIFIED', 'FLAGGED'] }
                    },
                    select: {
                        status: true,
                        surveyor: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { buildingNumber: 'asc' }
        });

        const mappedAddresses = addresses.map(a => {
            const activeSurvey = a.surveys && a.surveys.length > 0 ? a.surveys[0] : null;
            return {
                id: a.id,
                pincode: a.pincode,
                address_line1: a.addressLine1,
                zone_id: a.zoneId, // Added for filtering
                zone_name: a.zone ? a.zone.name : null,
                landmark: a.landmark || '',
                building_number: a.buildingNumber || '',
                status: a.status,
                is_taken: !!activeSurvey,
                survey_status: activeSurvey ? activeSurvey.status : null,
                surveyor_name: activeSurvey?.surveyor?.fullName || null
            };
        });

        res.json(mappedAddresses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
};

// GET /addresses/:id/
const getAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const address = await prisma.masterAddress.findUnique({
            where: { id },
            include: { zone: true }
        });
        if (!address) return res.status(404).json({ error: 'Address not found' });
        res.json(address);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch address' });
    }
};
// POST /addresses/
const createAddress = async (req, res) => {
    try {
        const data = req.body;
        const { pincode, address_line1, building_number, landmark, latitude, longitude } = data;
        const zone_id = data.zone_id || data.zone;

        // Enforcement: Must start with Door No.
        if (!address_line1 || !address_line1.trim().toLowerCase().startsWith('door no.')) {
            return res.status(400).json({ error: 'Address must start with "Door No."' });
        }

        if (!zone_id) {
            return res.status(400).json({ error: 'Zone is required.' });
        }

        const address = await prisma.masterAddress.create({
            data: {
                id: uuidv4(),
                pincode,
                addressLine1: address_line1,
                buildingNumber: building_number,
                landmark: landmark,
                zoneId: zone_id,
                latitude: latitude || null,
                longitude: longitude || null,
                status: 'NEW'
            }
        });
        res.status(201).json(address);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create address' });
    }
};

// PATCH /addresses/:id/
const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (data.address_line1 && !data.address_line1.trim().toLowerCase().startsWith('door no.')) {
            return res.status(400).json({ error: 'Address must start with "Door No."' });
        }

        const address = await prisma.masterAddress.update({
            where: { id },
            data: {
                pincode: data.pincode,
                addressLine1: data.address_line1,
                buildingNumber: data.building_number,
                zoneId: data.zone_id,
                latitude: data.latitude,
                longitude: data.longitude,
                status: data.status
            }
        });
        res.json(address);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update address' });
    }
};
// GET /addresses/validate_pincode/
const validatePincode = async (req, res) => {
    try {
        const { pincode } = req.query;
        const user = req.user;

        if (!pincode || pincode.length !== 6) {
            return res.json({ valid: false, error: 'Invalid pincode format' });
        }

        // Determine the actual zone to use
        let zone;
        if (user.role === 'SURVEYOR') {
            zone = await prisma.zone.findUnique({
                where: { id: user.zone_id }
            });
            // If the code doesn't match, we already handled it or we should double check here for robustness
            if (!zone || zone.code !== pincode) {
                return res.json({ valid: false, error: 'Pincode does not match your assigned zone' });
            }
        } else {
            zone = await prisma.zone.findFirst({
                where: { code: pincode, isActive: true }
            });
        }

        const addresses = zone ? await prisma.masterAddress.findMany({
            where: { pincode, zoneId: zone.id, status: 'ACTIVE' },
            include: {
                surveys: {
                    where: {
                        status: { in: ['DRAFT', 'SUBMITTED', 'VERIFIED', 'FLAGGED'] }
                    },
                    select: {
                        status: true,
                        surveyor: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { buildingNumber: 'asc' }
        }) : [];

        const mappedAddresses = addresses.map(a => {
            const activeSurvey = a.surveys && a.surveys.length > 0 ? a.surveys[0] : null;
            return {
                id: a.id,
                pincode: a.pincode,
                address_line1: a.addressLine1,
                landmark: a.landmark || '',
                building_number: a.buildingNumber || '',
                status: a.status,
                is_taken: !!activeSurvey,
                survey_status: activeSurvey ? activeSurvey.status : null,
                surveyor_name: activeSurvey?.surveyor?.fullName || null
            };
        });

        res.json({
            valid: !!zone,
            zone_name: zone ? zone.name : null,
            addresses: mappedAddresses
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Validation failed' });
    }
};

// POST /addresses/:id/mark_status/
const markStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // ACTIVE or DEMOLISHED

        const address = await prisma.masterAddress.update({
            where: { id },
            data: { status }
        });
        res.json(address);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
};

// DELETE /addresses/:id/
const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.masterAddress.delete({
            where: { id }
        });
        res.status(204).send();
    } catch (error) {
        // Handle foreign key constraint (if address has surveys)
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete address with existing surveys.' });
        }
        res.status(500).json({ error: 'Failed to delete address' });
    }
};

module.exports = {
    listAddresses,
    getAddress,
    createAddress,
    updateAddress,
    deleteAddress,
    validatePincode,
    markStatus
};
