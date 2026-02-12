const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/rbacMiddleware');

router.use(authMiddleware);

router.get('/', checkRole(['ADMIN', 'SUPERVISOR', 'SURVEYOR']), zoneController.listZones);
router.post('/', checkRole(['ADMIN']), zoneController.createZone);
router.patch('/:id', checkRole(['ADMIN']), zoneController.updateZone);

module.exports = router;
