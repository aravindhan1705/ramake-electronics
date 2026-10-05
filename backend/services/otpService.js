/**
 * REMAKE ELECTRONICS - Secure OTP Service
 * Cryptographically random 6-digit OTP generation, SHA-256 hashing,
 * 5-minute expiry, rate limiting, and brute-force protection
 */

const crypto = require('crypto');
const db = require('./db');
const emailService = require('./emailService');

const OTP_SECRET = process.env.OTP_SECRET || 'remake_electronics_otp_secret_key_2026';
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes exactly
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_REQUESTS_15_MIN = 4; // Max 4 OTP requests per 15 minutes
const MAX_VERIFICATION_ATTEMPTS = 5; // Max 5 wrong attempts before code invalidation

/**
 * Hash OTP with salt and email for secure persistence
 */
function hashOtp(otp, email) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${otp}:${email.toLowerCase().trim()}`)
    .digest('hex');
}

/**
 * Generate cryptographically secure random 6-digit OTP
 */
function generateRandom6DigitCode() {
  // Generates integer in range [100000, 999999]
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

/**
 * Request & dispatch a new OTP to an email
 */
async function requestOtp(email, fullName = null) {
  const cleanEmail = email.toLowerCase().trim();

  // 1. Check Rate Limiting (15-minute window)
  const rateInfo = db.getRateLimit(cleanEmail);
  const now = Date.now();
  const fifteenMinutesAgo = now - 15 * 60 * 1000;
  const recentRequests = (rateInfo.requestTimestamps || []).filter((ts) => ts > fifteenMinutesAgo);

  if (recentRequests.length >= MAX_REQUESTS_15_MIN) {
    const oldest = recentRequests[0];
    const minutesRemaining = Math.ceil((oldest + 15 * 60 * 1000 - now) / 60000);
    const error = new Error(`Too many OTP requests. Please wait ${minutesRemaining} minute(s) before trying again.`);
    error.status = 429;
    throw error;
  }

  // 2. Check 30s Cooldown
  const existingRecord = db.getOtpRecord(cleanEmail);
  if (existingRecord && existingRecord.createdAt) {
    const elapsed = now - existingRecord.createdAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      const error = new Error(`Please wait ${waitSeconds} seconds before requesting a new OTP.`);
      error.status = 429;
      error.retryAfter = waitSeconds;
      throw error;
    }
  }

  // 3. Generate secure 6-digit OTP
  const rawOtp = generateRandom6DigitCode();
  const hashedOtp = hashOtp(rawOtp, cleanEmail);
  const expiresAt = now + OTP_TTL_MS;

  // 4. Save to secure store
  db.setOtpRecord(cleanEmail, {
    email: cleanEmail,
    hashedOtp,
    expiresAt,
    createdAt: now,
    attempts: 0,
    fullName: fullName || (existingRecord ? existingRecord.fullName : null)
  });

  // Record rate limit counter
  db.recordRateLimitRequest(cleanEmail);

  // 5. Dispatch email
  await emailService.sendOtpEmail(cleanEmail, rawOtp, fullName);

  return {
    success: true,
    message: 'OTP sent to your email.',
    cooldownSeconds: 30,
    expiresInSeconds: 300
    // Notice: rawOtp is NEVER returned in response!
  };
}

/**
 * Verify submitted OTP against backend record
 */
function verifyOtp(email, submittedOtp) {
  const cleanEmail = email.toLowerCase().trim();
  const record = db.getOtpRecord(cleanEmail);

  if (!record) {
    const error = new Error('No active OTP request found for this email. Please request a new OTP.');
    error.status = 400;
    throw error;
  }

  const now = Date.now();

  // 1. Check expiration
  if (now > record.expiresAt) {
    db.deleteOtpRecord(cleanEmail);
    const error = new Error('Your OTP has expired. Please request a new OTP.');
    error.status = 400;
    throw error;
  }

  // 2. Check brute force attempts
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    db.deleteOtpRecord(cleanEmail);
    const error = new Error('Too many verification attempts. Please request a new OTP.');
    error.status = 429;
    throw error;
  }

  // 3. Validate code length & digits
  const cleanSubmitted = String(submittedOtp || '').trim();
  if (!/^\d{6}$/.test(cleanSubmitted)) {
    record.attempts += 1;
    db.setOtpRecord(cleanEmail, record);
    const error = new Error('Incorrect OTP. Please enter a valid 6-digit code.');
    error.status = 400;
    throw error;
  }

  // 4. Compare hash securely
  const submittedHash = hashOtp(cleanSubmitted, cleanEmail);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(submittedHash, 'utf-8'),
    Buffer.from(record.hashedOtp, 'utf-8')
  );

  if (!isMatch) {
    record.attempts += 1;
    const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - record.attempts;
    db.setOtpRecord(cleanEmail, record);

    if (remainingAttempts <= 0) {
      db.deleteOtpRecord(cleanEmail);
      const error = new Error('Too many verification attempts. Please request a new OTP.');
      error.status = 429;
      throw error;
    }

    const error = new Error(`Incorrect OTP. Please try again. (${remainingAttempts} attempts remaining)`);
    error.status = 400;
    throw error;
  }

  // 5. Successful verification -> Invalidate OTP immediately!
  const fullName = record.fullName;
  db.deleteOtpRecord(cleanEmail);

  return {
    verified: true,
    email: cleanEmail,
    fullName
  };
}

module.exports = {
  requestOtp,
  verifyOtp,
  hashOtp,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS
};
