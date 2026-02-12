const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public or Mock-Auth protected?
// /auth/login usually exchanges a token. 
// With Mock Middleware, we might need a dummy endpoint that just returns success or consumes the mock user.
// But typically login *validates* credentials.
// In our mock setup, we'll apply middleware to /me but maybe not /login if it receives a token?
// Actually, for simplicity in Migration, let's apply mock middleware to ALL routes in index.js for now, 
// OR apply it specifically here.

// If we apply it globally, req.user is always set.
// If we apply it here:

router.post('/login', authMiddleware, authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/me', authMiddleware, authController.updateProfile);

module.exports = router;
