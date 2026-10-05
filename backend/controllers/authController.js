/**
 * REMAKE ELECTRONICS - Authentication Controller
 */

const crypto = require('crypto');
const db = require('../services/db');
const otpService = require('../services/otpService');

// Strict email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // Specific checks for problematic patterns
  if (trimmed.startsWith('@') || trimmed.endsWith('@')) return false;
  if (trimmed.indexOf('@') !== trimmed.lastIndexOf('@')) return false;
  return EMAIL_REGEX.test(trimmed);
}

async function sendOtp(req, res) {
  try {
    const { email, fullName, isSignup } = req.body;

    // Email validation (Prompt Section 6)
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Signup specific validation: Full name required
    if (isSignup) {
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Please enter your full name.'
        });
      }
    }

    // Call secure OTP generator and dispatcher
    const result = await otpService.requestOtp(cleanEmail, fullName ? fullName.trim() : null);

    return res.status(200).json({
      success: true,
      message: result.message,
      email: cleanEmail,
      cooldownSeconds: result.cooldownSeconds
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Something went wrong. Please try again.',
      retryAfter: err.retryAfter
    });
  }
}

async function verifyOtp(req, res) {
  try {
    const { email, otp, fullName } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please enter the 6-digit OTP code.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify OTP through OTP service
    const verifyResult = otpService.verifyOtp(cleanEmail, otp);

    // Find or create user
    let user = db.getUserByEmail(cleanEmail);
    const resolvedName = (fullName && fullName.trim()) || verifyResult.fullName;

    if (!user) {
      if (!resolvedName) {
        // Fallback friendly name if not provided
        user = db.createUser('Electronics Maker', cleanEmail);
      } else {
        user = db.createUser(resolvedName, cleanEmail);
      }
    } else if (resolvedName && user.name !== resolvedName) {
      // Update name if updated during signup/login
      user = db.updateUserName(user.id, resolvedName);
    }

    // Create secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    db.createSession(sessionToken, user.id, user.email);

    // Set cookie
    res.cookie('remake_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    const status = err.status || 400;
    return res.status(status).json({
      success: false,
      message: err.message || 'Verification failed. Please try again.'
    });
  }
}

function getMe(req, res) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated.'
    });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt
    }
  });
}

function logout(req, res) {
  if (req.sessionToken) {
    db.destroySession(req.sessionToken);
  }
  res.clearCookie('remake_session');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

module.exports = {
  sendOtp,
  verifyOtp,
  getMe,
  logout,
  isValidEmail
};
