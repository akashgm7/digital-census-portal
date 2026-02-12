const prisma = require('../prismaClient');

// POST /auth/login
const login = async (req, res) => {
    try {
        // In production, we assume AuthMiddleware has already verified the Firebase Token
        // and attached the decoded token to req.user (or implemented as such).
        // For now, with MockAuthMiddleware, req.user is the mock user object.

        // However, the prompt says "Verify Firebase Token, check if user exists in DB".
        // So the controller should usually look up the user using the UID from the token.

        const uid = req.user.uid;

        if (!uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check DB
        const user = await prisma.user.findUnique({
            where: { firebaseUid: uid },
            include: { zone: true }
        });

        if (!user) {
            // If mock mode, we might want to return a fake user if DB is down? 
            // But prompt requested real code. 
            // If DB is empty, this will return 404. 
            return res.status(404).json({ error: 'User not found in system.' });
        }

        if (!user.isActive) {
            return res.status(401).json({ error: 'Your account has been blocked. Please contact the administrator.' });
        }

        const redirect_url = user.role === 'ADMIN' ? '/admin/dashboard' :
            user.role === 'SUPERVISOR' ? '/supervisor/dashboard' : '/surveyor/dashboard';

        res.json({
            success: true,
            token: 'mock-jwt-token',
            user_id: user.id,
            phone_number: user.phoneNumber,
            full_name: user.fullName,
            role: user.role,
            zone_id: user.zoneId,
            zone_name: user.zone ? user.zone.name : null,
            daily_target: user.dailyTarget,
            redirect_url: redirect_url
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// GET /auth/me
const getMe = async (req, res) => {
    try {
        const uid = req.user.uid;
        const user = await prisma.user.findUnique({
            where: { firebaseUid: uid },
            include: { zone: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.isActive) {
            return res.status(401).json({ error: 'Your account has been blocked.' });
        }

        const redirect_url = user.role === 'ADMIN' ? '/admin/dashboard' :
            user.role === 'SUPERVISOR' ? '/supervisor/dashboard' : '/surveyor/dashboard';

        res.json({
            ...user,
            redirect_url
        });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// PATCH /auth/me
const updateProfile = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { full_name } = req.body;

        if (!full_name) {
            return res.status(400).json({ error: 'Full name is required' });
        }

        const user = await prisma.user.update({
            where: { firebaseUid: uid },
            data: { fullName: full_name },
            include: { zone: true }
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                phone_number: user.phoneNumber,
                full_name: user.fullName,
                role: user.role,
                zone_id: user.zoneId,
                zone_name: user.zone ? user.zone.name : null,
                daily_target: user.dailyTarget,
                created_at: user.createdAt
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

module.exports = {
    login,
    getMe,
    updateProfile
};
