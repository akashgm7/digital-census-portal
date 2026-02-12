const prisma = require('../prismaClient');

// Helper to get date ranges
const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// GET /analytics/admin
const getAdminDashboard = async (req, res) => {
    try {
        const { start, end } = getTodayRange();
        const days = parseInt(req.query.days) || 7;
        const { zone_id, supervisor_id } = req.query;

        // Build Filters
        const filters = {};
        if (zone_id) filters.zoneId = zone_id;
        if (supervisor_id) filters.surveyorId = supervisor_id; // Frontend sends 'supervisor_id' but it maps to surveyorId in SurveyResponse if filtering by surveyor/supervisor? 
        // Wait, 'supervisor_id' in frontend filter usually means "Filter by Surveyor" if it lists supervisors? 
        // Let's check AdminAnalytics.jsx. It lists "Supervisors" but maybe it means Surveyors? 
        // AdminAnalytics.jsx uses `userAPI.list({ role: 'SUPERVISOR' })`. So it filters by Supervisor.
        // But SurveyResponse has `surveyorId`. It does NOT have `supervisorId`.
        // If we filter by Supervisor, we need to find all Surveyors under that Supervisor (if logic exists) or maybe the user meant "Filter by Surveyor"?
        // In AdminAnalytics.jsx: 
        // <label>Supervisor</label> <select ... {supervisors.map...}
        // So it is selecting a Supervisor. 
        // SurveyResponse schema: does it link to Supervisor? 
        // Usually Survey -> Surveyor -> Zone. Supervisor -> Zone. 
        // So filtering by Supervisor might mean filtering by the Zone managed by that Supervisor? 
        // OR finding all surveyors in that Supervisor's zone?
        // Let's assume for now filters.zoneId is primary. 
        // If supervisor_id is passed, maybe we want surveys VERIFIED by that supervisor?
        // Or submitted by surveyors in their zone?
        // Let's look at `getSupervisorDashboard`. It filters by `zoneId`.
        // If the user selects a Supervisor, they probably expect to see data relevant to that Supervisor's zone.
        // But the dropdown allows selecting both Zone and Supervisor.
        // If I select Zone A, I see Zone A stats.
        // If I select Supervisor X (who is in Zone A), it might be redundant or specific actions.
        // Let's check if the user meant "Surveyor". The dropdown says "Supervisor".
        // Let's stick to Zone Filter for now effectively, or if Supervisor is selected, filter by their Zone?
        // Actually, let's look at the "Supervisor" logic in the app. 
        // Supervisors are assigned to a Zone. 
        // So checking `supervisor_id` -> fetch supervisor -> get their zone -> filter by that zone.
        // If `zone_id` is ALSO provided, they should match.

        // HOWEVER, looking at the code `userAPI.list({ role: 'SUPERVISOR' })` fetches supervisors.
        // If I select a supervisor, I expect to see their performance?
        // But `SurveyResponse` doesn't strictly link to a supervisor, only via Zone.
        // Let's check if I can filter `where: { zone: { users: { some: { id: supervisor_id, role: 'SUPERVISOR' } } } }`?
        // That effectively filters by the Zone where this Supervisor exists.

        // Let's simplify: If `supervisor_id` is passed, get that user's zoneId and add it to filters.
        if (supervisor_id) {
            const supervisor = await prisma.user.findUnique({ where: { id: supervisor_id } });
            if (supervisor && supervisor.zoneId) {
                filters.zoneId = supervisor.zoneId;
            }
        }

        // 1. Total Counts (Apply filters)
        // Note: For User counts, if filtering by Zone, we should filter users in that zone.
        const userWhere = {};
        if (filters.zoneId) userWhere.zoneId = filters.zoneId;

        const totalSurveys = await prisma.surveyResponse.count({ where: filters });

        // Zone count is 1 if filtered, else total
        const totalZones = filters.zoneId ? 1 : await prisma.zone.count(); // Approximate or count matching zones

        const totalSurveyors = await prisma.user.count({ where: { ...userWhere, role: 'SURVEYOR' } });
        const totalSupervisors = await prisma.user.count({ where: { ...userWhere, role: 'SUPERVISOR' } });

        // 2. Today's Progress
        const surveysToday = await prisma.surveyResponse.count({
            where: {
                ...filters,
                createdAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        // 3. Status Breakdown
        const statusCounts = await prisma.surveyResponse.groupBy({
            by: ['status'],
            where: filters,
            _count: { status: true }
        });

        const statusMap = statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count.status;
            return acc;
        }, {});

        // 4. Verification Stats
        const flagged = statusMap['FLAGGED'] || 0;
        const verified = statusMap['VERIFIED'] || 0;
        const submitted = statusMap['SUBMITTED'] || 0;

        // 5. Global Alert Counts (Things needing attention regardless of timeframe)
        // We use similar logic to Supervisor Dashboard for consistency
        const activeSurveysForAlerts = await prisma.surveyResponse.findMany({
            where: {
                ...filters,
                status: { in: ['SUBMITTED', 'FLAGGED'] }
            },
            select: { auditTrail: true }
        });

        const locationWarningsCount = activeSurveysForAlerts.filter(s =>
            Array.isArray(s.auditTrail) && s.auditTrail.some(a => a.warning)
        ).length;

        // New Houses (Address status 'NEW')
        const addressFiltersForAlerts = {};
        if (filters.zoneId) addressFiltersForAlerts.zoneId = filters.zoneId;

        const totalNewHouses = await prisma.masterAddress.count({
            where: { ...addressFiltersForAlerts, status: 'NEW' }
        });

        // 6. Zone Stats (List all active zones with submission/verification counts)
        const zoneWhere = { isActive: true };
        if (filters.zoneId) zoneWhere.id = filters.zoneId;

        const zonesList = await prisma.zone.findMany({
            where: zoneWhere,
            include: {
                _count: {
                    select: {
                        users: { where: { role: 'SURVEYOR' } },
                        surveys: true
                    }
                }
            }
        });

        const verifiedByZone = await prisma.surveyResponse.groupBy({
            by: ['zoneId'],
            where: { ...filters, status: 'VERIFIED' },
            _count: { id: true }
        });

        const zonesWithStats = zonesList.map(z => {
            const vCount = verifiedByZone.find(v => v.zoneId === z.id)?._count.id || 0;
            return {
                id: z.id,
                name: z.name,
                code: z.code,
                surveyor_count: z._count.users,
                survey_count: z._count.surveys,
                verified_count: vCount
            };
        });

        // 7. User Stats (Filtered by role)
        const userStats = { total: 0, active: 0, admins: 0, supervisors: 0, surveyors: 0 };
        const usersListFiltered = await prisma.user.findMany({
            where: { ...userWhere, isActive: true },
            select: { role: true }
        });

        usersListFiltered.forEach(u => {
            userStats.total++;
            userStats.active++;
            if (u.role === 'ADMIN') userStats.admins++;
            if (u.role === 'SUPERVISOR') userStats.supervisors++;
            if (u.role === 'SURVEYOR') userStats.surveyors++;
        });
        res.json({
            overview: {
                total_surveys: totalSurveys,
                todays_surveys: surveysToday,
                active_surveyors: totalSurveyors,
                total_zones: totalZones,
                submitted: submitted,
                verified: verified,
                flagged: flagged,
                new_houses: totalNewHouses,
                drafts: statusMap['DRAFT'] || 0,
                location_warnings: locationWarningsCount
            },
            status_breakdown: statusMap,
            verification_stats: {
                pending: submitted,
                flagged: flagged,
                verified: verified
            },
            zones: zonesWithStats,
            users: userStats,
            recent_activity: await prisma.auditLog.findMany({
                where: filters.zoneId ? { user: { zoneId: filters.zoneId } } : {},
                take: 5,
                orderBy: { timestamp: 'desc' },
                include: { user: { select: { fullName: true } } }
            }),
            leaderboard: await getLeaderboard(start, end, filters),
            velocity: await getVelocity(filters, days)
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

// Helper for Velocity
async function getVelocity(filters = {}, days = 7) {
    const today = new Date();
    const velocity = [];

    // Loop backwards from (days-1) down to 0
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const nextDay = new Date(d);
        nextDay.setDate(d.getDate() + 1);

        const dayStats = await prisma.surveyResponse.groupBy({
            by: ['status'],
            where: {
                ...filters,
                createdAt: {
                    gte: d,
                    lt: nextDay
                }
            },
            _count: { status: true }
        });

        const stats = dayStats.reduce((acc, curr) => {
            acc[curr.status.toLowerCase()] = curr._count.status;
            return acc;
        }, { submitted: 0, verified: 0, flagged: 0 });

        velocity.push({
            date: d.toISOString().split('T')[0],
            submitted: stats.submitted || 0,
            verified: stats.verified || 0,
            flagged: stats.flagged || 0
        });
    }
    return velocity;
}

// Helper for Date Range based on timeframe
const getDateRange = (timeframe) => {
    const now = new Date();
    const end = new Date(now); // Clone now
    const start = new Date(now);

    switch (timeframe) {
        case 'week':
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            break;
        case 'month':
            start.setDate(now.getDate() - 30);
            start.setHours(0, 0, 0, 0);
            break;
        case 'today':
            start.setHours(0, 0, 0, 0);
            break;
        case 'overall':
            return {
                start: new Date(0), // Epoch
                end: end
            };
        default:
            start.setHours(0, 0, 0, 0); // Default to today
    }
    return { start, end };
};

// Helper for Leaderboard
async function getLeaderboard(start, end, filters = {}, type = 'surveyor') {
    if (type === 'supervisor') {
        const supervisors = await prisma.user.findMany({
            where: {
                role: 'SUPERVISOR',
                isActive: true,
                ...(filters.zoneId ? { zoneId: filters.zoneId } : {})
            },
            include: { zone: true }
        });

        const leaderboard = [];

        for (const supervisor of supervisors) {
            const verifiedCount = await prisma.surveyResponse.count({
                where: {
                    zoneId: supervisor.zoneId,
                    status: 'VERIFIED',
                    updatedAt: { gte: start, lte: end }
                }
            });

            const submittedCount = await prisma.surveyResponse.count({
                where: {
                    zoneId: supervisor.zoneId,
                    status: 'SUBMITTED',
                    createdAt: { gte: start, lte: end }
                }
            });

            leaderboard.push({
                id: supervisor.id,
                name: supervisor.fullName,
                zone_name: supervisor.zone ? supervisor.zone.name : 'N/A',
                verified: verifiedCount,
                submitted: submittedCount,
                score: verifiedCount
            });
        }
        return leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
    }

    // Default: Surveyor Logic
    const performance = await prisma.surveyResponse.groupBy({
        by: ['surveyorId'],
        where: {
            ...filters,
            createdAt: { gte: start, lte: end }
        },
        _count: { id: true }
    });

    const surveyorIds = performance.map(p => p.surveyorId);
    if (surveyorIds.length === 0) return [];

    const surveyors = await prisma.user.findMany({
        where: { id: { in: surveyorIds } },
        include: { zone: true }
    });

    const leaderboard = surveyors.map(s => {
        const stat = performance.find(p => p.surveyorId === s.id);
        const completed = stat ? stat._count.id : 0;
        const target = s.dailyTarget || 1;
        return {
            id: s.id,
            surveyor_name: s.fullName,
            zone_name: s.zone ? s.zone.name : 'N/A',
            completed: completed,
            target: s.dailyTarget,
            percentage: Math.round((completed / target) * 100)
        };
    });

    return leaderboard.sort((a, b) => b.completed - a.completed).slice(0, 10);
}

const getLeaderboardData = async (req, res) => {
    try {
        const { type, timeframe, zone_id } = req.query;
        const { start, end } = getDateRange(timeframe || 'today');

        const filters = {};
        if (zone_id) filters.zoneId = zone_id;

        const data = await getLeaderboard(start, end, filters, type || 'surveyor');
        res.json(data);
    } catch (error) {
        console.error('Leaderboard Error:', error);
        res.status(500).json({ error: 'Failed' });
    }
};



const getSupervisorDashboard = async (req, res) => {
    try {
        const { zone_id, timeframe = 'today' } = req.query;

        console.log('[Analytics] Supervisor Dashboard Request:', {
            user_id: req.user?.uid,
            role: req.user?.role,
            user_zone_id: req.user?.zoneId,
            query_zone_id: zone_id,
            timeframe
        });

        // Use req.user.id (UUID) for querying
        const targetZoneId = zone_id || req.user.zone_id;

        // Fallback for Admin testing: If no zone assigned, pick the first active zone
        if (!targetZoneId && req.user.role === 'ADMIN') {
            const firstZone = await prisma.zone.findFirst({ where: { isActive: true } });
            if (firstZone) {
                targetZoneId = firstZone.id;
            }
        }

        if (!targetZoneId) {
            return res.status(400).json({ error: 'Zone ID is required' });
        }

        const { start, end } = getDateRange(timeframe);
        const days = timeframe === 'month' ? 30 : 7;

        // Fetch Zone Details
        const zone = await prisma.zone.findUnique({
            where: { id: targetZoneId },
            include: {
                users: {
                    where: { role: 'SURVEYOR' },
                    select: { id: true, fullName: true, dailyTarget: true }
                }
            }
        });

        if (!zone) return res.status(404).json({ error: 'Zone not found' });

        // Status Counts
        const zoneStats = await prisma.surveyResponse.groupBy({
            by: ['status'],
            where: {
                zoneId: targetZoneId,
                createdAt: { gte: start, lte: end }
            },
            _count: { status: true }
        });

        const statusMap = zoneStats.reduce((acc, curr) => {
            acc[curr.status] = curr._count.status;
            return acc;
        }, {});

        const totalSurveys = await prisma.surveyResponse.count({
            where: {
                zoneId: targetZoneId,
                createdAt: { gte: start, lte: end }
            }
        });

        // New Houses (Count surveys that created a new address in this timeframe)
        const newHouses = await prisma.surveyResponse.count({
            where: {
                zoneId: targetZoneId,
                createdAt: { gte: start, lte: end },
                masterAddress: { status: 'NEW' }
            }
        });

        // Surveyor performance in this zone for the selected timeframe
        const surveyors = await prisma.user.findMany({
            where: { zoneId: targetZoneId, role: 'SURVEYOR' },
            select: { id: true, fullName: true, dailyTarget: true }
        });

        const performanceDuringPeriod = await prisma.surveyResponse.groupBy({
            by: ['surveyorId'],
            where: {
                zoneId: targetZoneId,
                createdAt: { gte: start, lte: end }
            },
            _count: { id: true }
        });

        const activeSurveyors = surveyors.map(s => {
            const stat = performanceDuringPeriod.find(p => p.surveyorId === s.id);
            return {
                id: s.id,
                full_name: s.fullName,
                survey_count: stat ? stat._count.id : 0,
                daily_target: s.dailyTarget
            };
        });

        // Global Alert Counts (Things needing attention regardless of timeframe)
        const [globalNewHouses] = await Promise.all([
            prisma.surveyResponse.count({
                where: {
                    zoneId: targetZoneId,
                    status: { in: ['SUBMITTED', 'FLAGGED'] },
                    masterAddress: { status: 'NEW' }
                }
            })
        ]);

        // Global Location Warnings & Pending Verification (Fetch active surveys and check audit trail in JS for robustness)
        const activeSurveysWithTrail = await prisma.surveyResponse.findMany({
            where: {
                zoneId: targetZoneId,
                status: { in: ['SUBMITTED', 'FLAGGED'] }
            },
            select: { status: true, auditTrail: true }
        });

        const globalLocationWarnings = activeSurveysWithTrail.filter(s =>
            Array.isArray(s.auditTrail) && s.auditTrail.some(a => a.warning)
        ).length;

        const globalPendingCount = activeSurveysWithTrail.filter(s => {
            if (s.status === 'SUBMITTED') return true;
            if (s.status === 'FLAGGED') {
                // System flag if the last action in the relevant set was NOT manual flagging
                const lastMainAction = Array.isArray(s.auditTrail)
                    ? s.auditTrail.slice().reverse().find(a => ['FLAG', 'SUBMIT', 'VERIFY'].includes(a.action))?.action
                    : null;
                return lastMainAction !== 'FLAG';
            }
            return false;
        }).length;

        res.json({
            zone: {
                name: zone.name,
                code: zone.code
            },
            overview: {
                total: totalSurveys,
                pending_verification: globalPendingCount,
                verified: statusMap['VERIFIED'] || 0,
                flagged: statusMap['FLAGGED'] || 0,
                drafts: statusMap['DRAFT'] || 0,
                location_warnings: globalLocationWarnings,
                new_houses: globalNewHouses
            },
            surveyors: activeSurveyors,
            leaderboard: await getLeaderboard(start, end, { zoneId: targetZoneId }),
            velocity: await getVelocity({ zoneId: targetZoneId }, days)
        });

    } catch (error) {
        console.error('Supervisor Analytics Error:', error);
        res.status(500).json({ error: 'Failed' });
    }
};

const getSurveyorDashboard = async (req, res) => {
    try {
        const userId = req.user.id; // Correctly populated by middleware
        const { start, end } = getTodayRange();

        // Get user for daily target and zone info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { zone: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const totalCompleted = await prisma.surveyResponse.count({ where: { surveyorId: userId } });
        const todayCompleted = await prisma.surveyResponse.count({
            where: {
                surveyorId: userId,
                createdAt: { gte: start, lte: end }
            }
        });

        const statusCounts = await prisma.surveyResponse.groupBy({
            by: ['status'],
            where: { surveyorId: userId },
            _count: { status: true }
        });

        const statusMap = statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count.status;
            return acc;
        }, {});

        // Calculate Location Warnings (surveys submitted with location_warning flag)
        // Note: location_warning isn't a direct field on SurveyResponse in schema, it's derived from AuditTrail or logic.
        // But for dashboard speed, we might need a count. 
        // Let's check if we can count based on auditTrail? Too slow.
        // For now, let's look at recent surveys and see if any have warnings. 
        // OR better, if we added a `locationWarning` boolean to the schema earlier? 
        // Checking schema... Schema has invalidLocation boolean? Or header info?
        // User view of schema didn't show it. 
        // Let's assume 0 for now or try to count if possible.
        // Actually, previous history mapping used: s.auditTrail.some(a => a.warning)
        // Let's return 0 for now to avoid perf hit, or implement a proper counter later.

        // Calculate Location Warnings by checking auditTrail of flagged surveys
        const flaggedSurveys = await prisma.surveyResponse.findMany({
            where: {
                surveyorId: userId,
                status: 'FLAGGED'
            },
            select: { auditTrail: true }
        });

        const locationWarningsCount = flaggedSurveys.filter(s =>
            Array.isArray(s.auditTrail) &&
            s.auditTrail.some(a => a.warning && a.details && a.details.includes('Location Warning'))
        ).length;

        // New Houses count (Scoped to Surveyor)
        const newHousesCount = await prisma.surveyResponse.count({
            where: {
                surveyorId: userId,
                masterAddress: {
                    status: 'NEW'
                }
            }
        });

        // Calculate counts
        const draftsCount = statusMap['DRAFT'] || 0;
        const newFoundCount = statusMap['NEW_FOUND'] || 0; // Should be 0 now
        const gpsMismatchCount = statusMap['GPS_MISMATCH'] || 0; // Should be 0 now
        const flaggedCount = statusMap['FLAGGED'] || 0;

        // Total flagged is just the flagged count now since we reverted other statuses
        const totalFlagged = flaggedCount;

        res.json({
            // Frontend expects 'user' object with name and zone
            user: {
                name: user.fullName,
                zone: user.zone ? `${user.zone.name} - ${user.zone.code}` : 'N/A'
            },
            // Frontend expects 'today' object
            today: {
                completed: todayCompleted,
                target: user.dailyTarget || 0,
                percentage: user.dailyTarget ? Math.round((todayCompleted / user.dailyTarget) * 100) : 0,
                target_met: user.dailyTarget && todayCompleted >= user.dailyTarget
            },
            // Frontend expects 'stats' object
            stats: {
                total: totalCompleted,
                flagged: totalFlagged,
                verified: statusMap['VERIFIED'] || 0,
                drafts: draftsCount,
                new_houses: newHousesCount,
                location_warnings: locationWarningsCount
            },
            recent_surveys: (await prisma.surveyResponse.findMany({
                where: { surveyorId: userId },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                include: { masterAddress: true }
            })).map(s => ({
                id: s.id,
                head_name: s.headName || 'N/A',
                head_phone: s.familyMembers?.head_phone || '',
                address_line: s.masterAddress?.addressLine1 || 'N/A',
                pincode: s.masterAddress?.pincode || '',
                status: s.status,
                submitted_at: s.createdAt,
                location_warning: Array.isArray(s.auditTrail) ? s.auditTrail.some(a => a.warning) : false,
                is_new_house: s.masterAddress?.status === 'NEW',
                editable: s.status !== 'VERIFIED'
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

module.exports = {
    getAdminDashboard,
    getSupervisorDashboard,
    getSurveyorDashboard,
    getLeaderboardData
};
