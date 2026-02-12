
/**
 * Middleware to check user roles for API access.
 */
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!roles.includes(req.user.role)) {
            console.warn(`[RBAC] Access Denied: User ${req.user.phone_number} (Role: ${req.user.role}) tried to access a ${roles.join('/')} route.`);
            return res.status(403).json({ error: 'Access Denied: Insufficient permissions.' });
        }

        next();
    };
};

module.exports = checkRole;
