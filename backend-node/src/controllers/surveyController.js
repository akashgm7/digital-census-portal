const prisma = require('../prismaClient');
const { validateSurveyResponse } = require('../services/validationService');
const { calculateDistance } = require('../utils/geoUtils');

const createSurvey = async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        const userZoneId = req.user.zone_id;

        let masterAddressId = data.masterAddressId || data.master_address_id || data.address_id;
        let address;

        if (masterAddressId) {
            address = await prisma.masterAddress.findUnique({
                where: { id: masterAddressId },
                include: { zone: true }
            });

            if (!address) {
                return res.status(404).json({ error: 'Address not found' });
            }

            if (userRole === 'SURVEYOR' && address.zoneId !== userZoneId) {
                return res.status(403).json({
                    error: `Access Denied: This address belongs to ${address.zone.name}, but you are assigned to ${req.user.zone_name || 'a different zone'}.`
                });
            }
        } else {
            // Handle "New House" scenario
            if (!data.address_line || !data.pincode) {
                return res.status(400).json({ error: 'Master Address or full address details (Line & Pincode) are required.' });
            }

            // Verify pincode matches zone
            if (userRole === 'SURVEYOR') {
                const zone = await prisma.zone.findUnique({ where: { id: userZoneId } });
                if (!zone || zone.code !== data.pincode) {
                    return res.status(400).json({ error: 'Pincode does not match your assigned zone.' });
                }
            } else {
                // If not surveyor, find zone by pincode
                const zone = await prisma.zone.findFirst({ where: { code: data.pincode, isActive: true } });
                if (!zone) return res.status(400).json({ error: 'Invalid Pincode: No active zone found.' });
                // If admin, we use the found zone. If surveyor, we already checked.
            }

            // Create new MasterAddress
            // We need to fetch zoneId again to be sure
            const zone = await prisma.zone.findFirst({ where: { code: data.pincode } });

            address = await prisma.masterAddress.create({
                data: {
                    addressLine1: data.address_line,
                    pincode: data.pincode,
                    landmark: data.landmark,
                    status: 'NEW',
                    zoneId: zone.id
                },
                include: { zone: true }
            });
            masterAddressId = address.id;
        }

        // Construct familyMembers JSON if not provided explicitly
        const familyMembers = data.members || {
            total_members: data.total_members,
            male_members: data.male_members,
            female_members: data.female_members,
            other_members: data.other_members,
            children_under_5: data.children_under_5,
            children_5_to_18: data.children_5_to_18,
            senior_citizens: data.senior_citizens,
            annual_income: data.annual_income,
            ownership_type: data.ownership_type,
            has_water_connection: data.has_water_connection,
            has_toilet: data.has_toilet,
            has_lpg: data.has_lpg,
            has_electricity: data.has_electricity,
            head_phone: data.head_phone,
            head_education: data.head_education,
            head_occupation: data.head_occupation
        };

        const survey = await prisma.surveyResponse.create({
            data: {
                status: data.status || 'DRAFT',
                headName: data.head_name,
                headGender: data.head_gender, // Note: Frontend sends head_gender, Prisma expects headGender
                headAge: parseInt(data.head_age) || null,
                familyMembers: familyMembers,
                gpsLatitude: data.gps_latitude,
                gpsLongitude: data.gps_longitude,
                surveyorId: userId,
                zoneId: address.zoneId,
                masterAddressId: address.id,
                auditTrail: [{ action: 'CREATE', timestamp: new Date(), user: userId }]
            }
        });

        res.status(201).json(survey);
    } catch (error) {
        console.error('Create Survey Error:', error);
        res.status(500).json({ error: 'Failed to create survey' });
    }
};

const updateSurvey = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const userRole = req.user.role;
    const userZoneId = req.user.zone_id;

    try {
        const existing = await prisma.surveyResponse.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Survey not found' });

        if (existing.status === 'VERIFIED') {
            return res.status(403).json({ error: 'Cannot update verified survey' });
        }

        // Handle Master Address Update / Creation if needed
        let masterAddressId = data.masterAddressId || data.master_address_id || data.address_id || existing.masterAddressId;
        let address;

        // If address_id is explicit or if we have address_line (New House update)
        if (data.address_id || (data.address_id === null && data.address_line)) {
            if (data.address_id) {
                // specific existing address
                address = await prisma.masterAddress.findUnique({ where: { id: data.address_id }, include: { zone: true } });
                if (address) masterAddressId = address.id;
            } else if (data.address_line && data.pincode) {
                // New address creation on update
                const zone = await prisma.zone.findFirst({ where: { code: data.pincode } });
                if (zone) {
                    if (userRole === 'SURVEYOR' && zone.id !== userZoneId) {
                        return res.status(403).json({ error: 'Cannot create address outside assigned zone' });
                    }
                    address = await prisma.masterAddress.create({
                        data: {
                            addressLine1: data.address_line,
                            pincode: data.pincode,
                            landmark: data.landmark,
                            status: 'NEW',
                            zoneId: zone.id
                        },
                        include: { zone: true }
                    });
                    masterAddressId = address.id;
                }
            }
        }

        // Ensure zone matches if address changed
        if (!address && masterAddressId !== existing.masterAddressId) {
            address = await prisma.masterAddress.findUnique({ where: { id: masterAddressId }, include: { zone: true } });
        }

        const zoneId = address ? address.zoneId : existing.zoneId;

        const auditTrail = Array.isArray(existing.auditTrail) ? existing.auditTrail : [];
        const newTrail = [...auditTrail, { action: 'UPDATE', timestamp: new Date(), user: req.user.id }];

        // Construct familyMembers
        const existingMembers = typeof existing.familyMembers === 'object' ? existing.familyMembers : {};
        const incomingMembers = data.members || {};

        // Merge flat fields if present, else use members object, else keep existing
        const familyMembers = {
            ...existingMembers,
            ...incomingMembers,
            total_members: data.total_members ?? existingMembers?.total_members,
            male_members: data.male_members ?? existingMembers?.male_members,
            female_members: data.female_members ?? existingMembers?.female_members,
            other_members: data.other_members ?? existingMembers?.other_members,
            children_under_5: data.children_under_5 ?? existingMembers?.children_under_5,
            children_5_to_18: data.children_5_to_18 ?? existingMembers?.children_5_to_18,
            senior_citizens: data.senior_citizens ?? existingMembers?.senior_citizens,
            annual_income: data.annual_income ?? existingMembers?.annual_income,
            ownership_type: data.ownership_type ?? existingMembers?.ownership_type,
            has_water_connection: data.has_water_connection ?? existingMembers?.has_water_connection,
            has_toilet: data.has_toilet ?? existingMembers?.has_toilet,
            has_lpg: data.has_lpg ?? existingMembers?.has_lpg,
            has_electricity: data.has_electricity ?? existingMembers?.has_electricity,
            head_phone: data.head_phone ?? existingMembers?.head_phone,
            head_education: data.head_education ?? existingMembers?.head_education,
            head_occupation: data.head_occupation ?? existingMembers?.head_occupation
        };

        const updated = await prisma.surveyResponse.update({
            where: { id },
            data: {
                headName: data.head_name || data.headName || undefined,
                headGender: data.head_gender || data.headGender || undefined,
                headAge: data.head_age ? parseInt(data.head_age) : undefined,
                status: data.status || undefined,
                familyMembers: familyMembers,
                masterAddressId: masterAddressId,
                zoneId: zoneId,
                auditTrail: newTrail
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update Survey Error:', error);
        res.status(500).json({ error: 'Update failed: ' + error.message });
    }
};

const submitSurvey = async (req, res) => {
    const { id } = req.params;
    // Map snake_case from frontend or camelCase fallback
    const gpsLatitude = req.body.gps_latitude || req.body.gpsLatitude;
    const gpsLongitude = req.body.gps_longitude || req.body.gpsLongitude;

    try {
        const survey = await prisma.surveyResponse.findUnique({
            where: { id },
            include: {
                masterAddress: { include: { zone: true } },
                zone: true
            }
        });

        if (!survey) return res.status(404).json({ error: 'Survey not found' });

        if (survey.status === 'VERIFIED') {
            return res.status(400).json({ error: 'Cannot submit a verified survey' });
        }

        const auditTrail = Array.isArray(survey.auditTrail) ? survey.auditTrail : [];
        let status = 'SUBMITTED';
        const warnings = [];

        // 1. Check New Address Status
        if (survey.masterAddress && survey.masterAddress.status === 'NEW') {
            status = 'FLAGGED';
            warnings.push('New Address Warning: Address was manually added');
        }

        // 2. Check GPS Radius
        // Ensure we have zone coordinates and survey GPS
        if (survey.zone && survey.zone.centerLatitude && survey.zone.centerLongitude && gpsLatitude && gpsLongitude) {
            const distance = calculateDistance(
                parseFloat(gpsLatitude),
                parseFloat(gpsLongitude),
                parseFloat(survey.zone.centerLatitude),
                parseFloat(survey.zone.centerLongitude)
            );

            // Use safe default if radiusMeters is missing or 0 (e.g., 2000m)
            const maxRadius = survey.zone.radiusMeters || 2000;

            console.log(`[GPS Check] Survey ID: ${id}, Dist: ${distance.toFixed(2)}m, Max: ${maxRadius}m`);

            if (distance > maxRadius) {
                status = 'FLAGGED';
                warnings.push(`Location Warning: Survey location is ${Math.round(distance)}m from zone center (Limit: ${maxRadius}m)`);
            }
        } else {
            // If GPS is missing but required? For now, just log warning
            // warnings.push('GPS data missing or Zone coordinates missing');
            console.warn(`[GPS Check Skipped] Missing coordinates. Survey GPS: ${gpsLatitude},${gpsLongitude}. Zone: ${survey.zone?.name}`);
        }

        if (warnings.length > 0) {
            auditTrail.push({
                action: 'system_flag',
                timestamp: new Date(),
                details: warnings.join('; '),
                warning: true
            });
        }

        auditTrail.push({ action: 'SUBMIT', timestamp: new Date(), user: req.user.id });

        let updated;
        try {
            updated = await prisma.surveyResponse.update({
                where: { id },
                data: {
                    status: status,
                    gpsLatitude: gpsLatitude ? parseFloat(gpsLatitude) : survey.gpsLatitude,
                    gpsLongitude: gpsLongitude ? parseFloat(gpsLongitude) : survey.gpsLongitude,
                    auditTrail: auditTrail
                }
            });
        } catch (dbError) {
            console.error('Prisma Update Failed:', dbError);
            return res.status(500).json({ error: 'Database update failed: ' + dbError.message });
        }

        const locationWarning = warnings.some(w => w.includes('Location Warning'));
        // Return location_warning boolean for frontend to display warning message.
        // Also map to snake_case if frontend expects snake_case response? 
        // Frontend uses response.data.location_warning
        res.json({ ...updated, location_warning: locationWarning });

    } catch (error) {
        console.error('Submit Survey Error:', error);
        res.status(500).json({ error: 'Submission failed: ' + error.message });
    }
};

const verifySurvey = async (req, res) => {
    const { id } = req.params;
    try {
        const survey = await prisma.surveyResponse.findUnique({ where: { id } });
        if (!survey) return res.status(404).json({ error: 'Survey not found' });

        // Enforce Zone Scoping for Supervisors
        if (req.user.role === 'SUPERVISOR' && survey.zoneId !== req.user.zone_id) {
            return res.status(403).json({ error: 'Access Denied: This survey belongs to a different zone.' });
        }

        const auditTrail = Array.isArray(survey.auditTrail) ? survey.auditTrail : [];
        const newTrail = [...auditTrail, { action: 'VERIFY', timestamp: new Date(), user: req.user.id }];

        const updated = await prisma.surveyResponse.update({
            where: { id },
            data: {
                status: 'VERIFIED',
                verifierId: req.user.id,
                auditTrail: newTrail
            }
        });
        res.json(updated);
    } catch (error) {
        console.error('Verify Survey Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
};

const listSurveys = async (req, res) => {
    try {
        const { status, zone_id, surveyor_id, date, is_new } = req.query;

        const where = {};
        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            if (statuses.length > 1) {
                where.status = { in: statuses };
            } else {
                where.status = statuses[0];
            }
        }
        if (zone_id) where.zoneId = zone_id;

        // Enforce Zone Scoping for Supervisors
        if (req.user.role === 'SUPERVISOR') {
            where.zoneId = req.user.zone_id;
        }
        if (surveyor_id) where.surveyorId = surveyor_id;
        if (is_new === 'true') {
            where.masterAddress = { status: 'NEW' };
        }

        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
            where.createdAt = { gte: start, lt: end };
        }

        const surveys = await prisma.surveyResponse.findMany({
            where,
            include: {
                surveyor: { select: { fullName: true } },
                zone: true,
                masterAddress: true
            },
            orderBy: { updatedAt: 'desc' },
            take: 100
        });

        const mappedSurveys = surveys.map(s => ({
            id: s.id,
            surveyor_name: s.surveyor ? s.surveyor.fullName : 'Unknown',
            zone_name: s.zone ? s.zone.name : null,
            head_name: s.headName,
            head_phone: s.familyMembers?.head_phone || '-',
            // Also map total_members
            total_members: s.familyMembers?.total_members || 1,
            address_line: s.masterAddress ? s.masterAddress.addressLine1 : 'Unknown',
            pincode: s.masterAddress ? s.masterAddress.pincode : '',
            status: s.status,
            submitted_at: s.createdAt,
            location_warning: Array.isArray(s.auditTrail) ? s.auditTrail.some(a => a.warning) : false,
            is_new_house: s.masterAddress && s.masterAddress.status === 'NEW',
            // New fields for Flagging Logic
            flag_reason: Array.isArray(s.auditTrail)
                ? s.auditTrail.slice().reverse().find(a => a.action === 'FLAG')?.reason || null
                : null,
            is_manual_flag: s.status === 'FLAGGED' && Array.isArray(s.auditTrail) &&
                s.auditTrail.slice().reverse().find(a => ['FLAG', 'SUBMIT', 'VERIFY'].includes(a.action))?.action === 'FLAG',
            last_action_date: Array.isArray(s.auditTrail) && s.auditTrail.length > 0
                ? s.auditTrail[s.auditTrail.length - 1].timestamp
                : s.createdAt
        }));

        res.json(mappedSurveys);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch surveys' });
    }
};

const getSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        const survey = await prisma.surveyResponse.findUnique({
            where: { id },
            include: {
                surveyor: { select: { fullName: true, phoneNumber: true } },
                zone: true,
                masterAddress: true
            }
        });
        if (!survey) return res.status(404).json({ error: 'Survey not found' });

        // Enforce Zone Scoping for Supervisors
        if (req.user.role === 'SUPERVISOR' && survey.zoneId !== req.user.zone_id) {
            return res.status(403).json({ error: 'Access Denied: This survey belongs to a different zone.' });
        }

        // Map to structure for frontend consistency (Robust mapping for supervisor view)
        const responseData = {
            ...survey,
            surveyor_name: survey.surveyor ? survey.surveyor.fullName : 'Unknown',
            surveyor_phone: survey.surveyor ? survey.surveyor.phoneNumber : '-',
            zone_name: survey.zone ? survey.zone.name : null,

            // Basic details (Map from both model and JSON fallback)
            head_name: survey.headName || survey.familyMembers?.head_name || '',
            head_phone: survey.familyMembers?.head_phone || '',
            head_age: survey.headAge || survey.familyMembers?.head_age || '',
            head_gender: survey.headGender || survey.familyMembers?.head_gender || '',
            head_occupation: survey.familyMembers?.head_occupation || '',

            // Stats
            total_members: survey.familyMembers?.total_members || 0,
            male_members: survey.familyMembers?.male_members || 0,
            female_members: survey.familyMembers?.female_members || 0,
            other_members: survey.familyMembers?.other_members || 0,

            // Economic & Housing
            annual_income: survey.familyMembers?.annual_income || '',
            ownership_type: survey.familyMembers?.ownership_type || '',
            address_line: survey.masterAddress?.addressLine1 || survey.familyMembers?.address_line || '',
            pincode: survey.masterAddress?.pincode || '',
            has_water_connection: !!survey.familyMembers?.has_water_connection,
            has_toilet: !!survey.familyMembers?.has_toilet,
            has_lpg: !!survey.familyMembers?.has_lpg,
            has_electricity: !!survey.familyMembers?.has_electricity,
            remarks: survey.familyMembers?.remarks || '',

            // Audit & Status
            submitted_at: survey.createdAt,
            location_warning: Array.isArray(survey.auditTrail) ? survey.auditTrail.some(a => a.warning) : false,
            flag_reason: Array.isArray(survey.auditTrail)
                ? survey.auditTrail.slice().reverse().find(a => a.action === 'FLAG')?.reason || null
                : null,
            is_new_house: survey.masterAddress && survey.masterAddress.status === 'NEW'
        };

        res.json(responseData);
    } catch (error) {
        console.error('Get Survey Error:', error);
        res.status(500).json({ error: 'Failed to fetch survey' });
    }
};

const deleteSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.surveyResponse.delete({ where: { id } });
        res.json({ message: 'Survey deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
};

const flagSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const survey = await prisma.surveyResponse.findUnique({ where: { id } });
        if (!survey) return res.status(404).json({ error: 'Survey not found' });

        // Enforce Zone Scoping for Supervisors
        if (req.user.role === 'SUPERVISOR' && survey.zoneId !== req.user.zone_id) {
            return res.status(403).json({ error: 'Access Denied: This survey belongs to a different zone.' });
        }

        const auditTrail = Array.isArray(survey.auditTrail) ? survey.auditTrail : [];
        const newTrail = [...auditTrail, { action: 'FLAG', reason: reason, timestamp: new Date(), user: req.user.id }];

        const updated = await prisma.surveyResponse.update({
            where: { id },
            data: {
                status: 'FLAGGED',
                auditTrail: newTrail
            }
        });

        // Create Notification for Surveyor
        try {
            await prisma.notification.create({
                data: {
                    userId: survey.surveyorId,
                    type: 'FLAG',
                    title: 'Survey Flagged',
                    message: reason || 'Survey requires review.',
                    surveyId: id
                }
            });
        } catch (notifError) {
            console.error('Failed to create notification:', notifError);
            // Don't fail the whole request if notification fails
        }

        res.json(updated);
    } catch (error) {
        console.error('Flag Survey Error:', error);
        res.status(500).json({ error: 'Flagging failed' });
    }
};

const getHistory = async (req, res) => {
    try {
        const history = await prisma.surveyResponse.findMany({
            where: { surveyorId: req.user.id },
            orderBy: { updatedAt: 'desc' },
            take: 20,
            include: { masterAddress: true }
        });

        const mappedHistory = history.map(s => ({
            id: s.id,
            head_name: s.headName,
            head_phone: s.familyMembers?.head_phone || '', // Assuming phone is in familyMembers? Or just not in schema?
            // Wait, schema has headName, headGender, headAge. Phone is NOT in schema.
            // It must be in familyMembers or not saved?
            // In SurveyForm, head_phone is collected.
            // The SurveyForm saves it to formData.head_phone.
            // My previous createSurvey saved familyMembers as a JSON.
            // So head_phone is likely in familyMembers (if I saved it there) OR lost if I didn't map it.
            // In my createSurvey fix: passing data.members || constructed object.
            // constructed object does NOT include head_phone.
            // I should verify where head_phone goes.
            // For now, let's map what we have.

            address_line: s.masterAddress ? s.masterAddress.addressLine1 : '',
            pincode: s.masterAddress ? s.masterAddress.pincode : '',
            status: s.status,
            submitted_at: s.createdAt,
            location_warning: Array.isArray(s.auditTrail) ? s.auditTrail.some(a => a.warning) : false,
            is_new_house: s.masterAddress?.status === 'NEW'
        }));

        res.json(mappedHistory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

const getDailyProgress = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await prisma.surveyResponse.count({
            where: {
                surveyorId: req.user.id,
                createdAt: { gte: today }
            }
        });

        // We need user's daily target. req.user has it? 
        // Mock auth doesn't currently attach daily_target.
        // Let's fetch it.
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        res.json({
            completed: count,
            target: user ? user.dailyTarget : 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
};

module.exports = {
    createSurvey,
    updateSurvey,
    submitSurvey,
    verifySurvey,
    listSurveys,
    getSurvey,
    deleteSurvey,
    flagSurvey,
    getHistory,
    getDailyProgress
};
