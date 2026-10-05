/**
 * REMAKE ELECTRONICS - Auth Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const emailService = require('../services/emailService');

// POST /api/auth/send-otp
router.post('/send-otp', authController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', authController.verifyOtp);

// GET /api/auth/me
router.get('/me', requireAuth, authController.getMe);

// POST /api/auth/logout
router.post('/logout', optionalAuth, authController.logout);

// Dev Mailbox inspector (only enabled for local hackathon demo when SMTP is not configured)
router.get('/dev-mailbox', (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_MAILBOX !== 'true') {
    return res.status(403).json({ success: false, message: 'Dev mailbox disabled in production.' });
  }
  const email = req.query.email;
  if (email) {
    const latest = emailService.getLatestOtpForEmail(email);
    return res.status(200).json({ success: true, email, latest });
  }
  return res.status(200).json({ success: true, mailbox: emailService.getDevMailbox() });
});

module.exports = router;
