const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/rbacMiddleware');

// Apply auth to all analytics routes
router.use(authMiddleware);

router.get('/admin', checkRole(['ADMIN']), analyticsController.getAdminDashboard);
router.get('/supervisor', checkRole(['ADMIN', 'SUPERVISOR']), analyticsController.getSupervisorDashboard);
router.get('/surveyor', checkRole(['ADMIN', 'SUPERVISOR', 'SURVEYOR']), analyticsController.getSurveyorDashboard);
router.get('/leaderboard', checkRole(['ADMIN', 'SUPERVISOR']), analyticsController.getLeaderboardData);

module.exports = router;
