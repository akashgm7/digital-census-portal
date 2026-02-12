const prisma = require('../prismaClient');

// Mock Auth Middleware
module.exports = async (req, res, next) => {
    try {
        let user = null;

        // 1. Check for Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            // Try do decode as Dev Token (JSON)
            try {
                const decoded = JSON.parse(atob(token));
                if (decoded.phone_number) {
                    // Find user by phone
                    user = await prisma.user.findUnique({
                        where: { phoneNumber: decoded.phone_number }
                    });
                }
            } catch (e) {
                // Not a JSON token, might be a real Firebase ID token or just a string
                // If it's a string, maybe it's the hardcoded 'mock-jwt-token' from login?
            }
        }

        // 2. Check body (for login request)
        if (!user && req.body && req.body.firebase_token) {
            const token = req.body.firebase_token;
            try {
                // Check if it's our dev token
                const decoded = JSON.parse(atob(token));
                if (decoded.phone_number) {
                    user = await prisma.user.findUnique({
                        where: { phoneNumber: decoded.phone_number }
                    });
                }
            } catch (e) { }
        }

        // 3. Fallback to Hardcoded Admin (if no specific user found)
        // Only if we REALLY want to force login. 
        // But for "I cannot login as Admin", we want to support that specific user.
        // If we found a user above, use it.

        if (user) {
            req.user = {
                id: user.id, // Database UUID
                uid: user.firebaseUid,
                role: user.role,
                email: 'mock@example.com',
                phone_number: user.phoneNumber,
                zone_id: user.zoneId
            };
            console.log(`[MockAuth] Logged in as: ${user.phoneNumber} (${user.role})`);
        } else {
            // Default Mock Admin (The one from Seed)
            // This is useful for initial setup or if login fails but we want to allow access?
            // Actually, if login fails, we should probably fail?
            // But existing logic was "Skip Firebase verification".
            // Let's keep the fallback but log it.

            req.user = {
                id: 'mock-admin-uuid', // Default mock id
                uid: 'mock-admin-uid',
                role: 'ADMIN',
                email: 'admin@example.com',
                phone_number: '+919999999999',
                zone_id: null
            };
            console.log('[MockAuth] Using Default Mock Admin');
        }

        next();
    } catch (error) {
        console.error('Mock Auth Error:', error);
        next();
    }
};
