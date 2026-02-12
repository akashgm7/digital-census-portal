const prisma = require('../prismaClient');
const { v4: uuidv4 } = require('uuid');

// GET /users/zones/
const listZones = async (req, res) => {
    try {
        const zones = await prisma.zone.findMany({
            where: { isActive: true },
            include: {
                _count: {
                    select: {
                        users: true,
                        masterAddresses: true,
                        surveys: true
                    }
                }
            }
        });

        // Transform to match frontend expected format if needed
        // Frontend likely just displays them.
        res.json(zones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch zones' });
    }
};

// POST /users/zones/
const createZone = async (req, res) => {
    try {
        const { name, code, center_latitude, center_longitude, radius_meters } = req.body;

        const zone = await prisma.zone.create({
            data: {
                id: uuidv4(),
                name,
                code,
                centerLatitude: center_latitude,
                centerLongitude: center_longitude,
                radiusMeters: radius_meters,
                isActive: true
            }
        });
        res.status(201).json(zone);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create zone' });
    }
};

// PATCH /users/zones/:id/
const updateZone = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const zone = await prisma.zone.update({
            where: { id },
            data: {
                name: data.name,
                code: data.code,
                centerLatitude: data.center_latitude,
                centerLongitude: data.center_longitude,
                radiusMeters: data.radius_meters,
                isActive: data.is_active
            }
        });
        res.json(zone);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update zone' });
    }
};

module.exports = {
    listZones,
    createZone,
    updateZone
};
