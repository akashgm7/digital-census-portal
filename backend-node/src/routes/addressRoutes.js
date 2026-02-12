const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/rbacMiddleware');

router.use(authMiddleware);

router.get('/validate_pincode', checkRole(['ADMIN', 'SUPERVISOR', 'SURVEYOR']), addressController.validatePincode);
router.get('/', checkRole(['ADMIN', 'SUPERVISOR', 'SURVEYOR']), addressController.listAddresses);
router.post('/', checkRole(['ADMIN']), addressController.createAddress);
router.get('/:id', checkRole(['ADMIN', 'SUPERVISOR', 'SURVEYOR']), addressController.getAddress);
router.patch('/:id', checkRole(['ADMIN']), addressController.updateAddress);
router.delete('/:id', checkRole(['ADMIN']), addressController.deleteAddress);
router.post('/:id/mark_status', checkRole(['ADMIN', 'SUPERVISOR']), addressController.markStatus);

module.exports = router;
