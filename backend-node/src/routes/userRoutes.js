const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/rbacMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authMiddleware);

// Supervisors can list users (Surveyors) in their zone
router.get('/', checkRole(['ADMIN', 'SUPERVISOR']), userController.listUsers);

// Admin-only routes
router.use(checkRole(['ADMIN']));

router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.post('/:id/block', userController.blockUser);
router.post('/:id/unblock', userController.unblockUser);
router.post('/:id/reassign_zone', userController.reassignZone);

router.post('/bulk_upload', upload.single('file'), userController.bulkUpload);

module.exports = router;
