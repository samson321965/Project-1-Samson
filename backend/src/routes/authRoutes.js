const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login - Verify credentials
router.post('/login', authController.login);

// POST /api/auth/register - Register new patient
router.post('/register', authController.register);

// POST /api/auth/reset-password - Request verification code
router.post('/request-reset-code', authController.requestResetCode);

// POST /api/auth/verify-code - Verify the code sent to email
router.post('/verify-code', authController.verifyCode);

// POST /api/auth/reset-password - Reset patient password
router.post('/reset-password', authController.resetPassword);

module.exports = router;
