const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/rbacMiddleware');

router.use(authMiddleware);

router.get('/history', checkRole(['ADMIN', 'SUPERVISOR', 'SURVEYOR']), surveyController.getHistory);
router.get('/daily_progress', checkRole(['ADMIN', 'SUPERVISOR', 'SURVEYOR']), surveyController.getDailyProgress);

router.get('/', checkRole(['ADMIN', 'SUPERVISOR', 'SURVEYOR']), surveyController.listSurveys);
router.post('/', checkRole(['SURVEYOR', 'ADMIN']), surveyController.createSurvey);

router.get('/:id', checkRole(['ADMIN', 'SUPERVISOR', 'SURVEYOR']), surveyController.getSurvey);
router.patch('/:id', checkRole(['SURVEYOR', 'ADMIN']), surveyController.updateSurvey);
router.delete('/:id', checkRole(['ADMIN', 'SURVEYOR']), surveyController.deleteSurvey);
router.post('/:id/submit', checkRole(['SURVEYOR', 'ADMIN']), surveyController.submitSurvey);
router.post('/:id/verify', checkRole(['SUPERVISOR', 'ADMIN']), surveyController.verifySurvey);
router.post('/:id/flag', checkRole(['SUPERVISOR', 'ADMIN']), surveyController.flagSurvey);

module.exports = router;
