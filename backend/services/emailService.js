/**
 * REMAKE ELECTRONICS - Secure Email Service
 * Sends OTP emails via Nodemailer (SMTP or Dev Mailbox fallback)
 */

const nodemailer = require('nodemailer');

const devMailbox = [];

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    console.log(`[EMAIL] Initializing SMTP Transport via ${host}:${port}`);
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }

  // Fallback dev mode
  return null;
}

const transporter = createTransporter();

/**
 * Generate responsive HTML email template for REMAKE ELECTRONICS
 */
function buildOtpEmailTemplate(otp, recipientName) {
  const nameGreeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REMAKE ELECTRONICS - Your Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; margin: 0; padding: 0; color: #111827; }
    .container { max-width: 520px; margin: 30px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; }
    .header { padding: 24px; border-bottom: 1px solid #f3f4f6; text-align: center; }
    .logo-text { font-size: 18px; font-weight: 800; letter-spacing: 1.5px; color: #000000; text-transform: uppercase; margin: 0; }
    .tagline { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .content { padding: 32px 28px; }
    .heading { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px; }
    .paragraph { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 20px; }
    .otp-box { background: #f3f4f6; border: 2px dashed #000000; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #000000; font-family: 'Courier New', Courier, monospace; display: inline-block; margin-left: 10px; }
    .expiry-note { font-size: 13px; color: #ef4444; font-weight: 600; margin-top: 10px; }
    .security-notice { background: #f9fafb; border-left: 3px solid #000000; padding: 12px; font-size: 12px; color: #6b7280; margin-top: 24px; border-radius: 0 4px 4px 0; }
    .footer { padding: 20px; background: #fafafa; border-top: 1px solid #f3f4f6; text-align: center; font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">⚡ REMAKE ELECTRONICS</h1>
      <div class="tagline">Discover what your unused electronics can become.</div>
    </div>
    <div class="content">
      <h2 class="heading">Verify Your Email Address</h2>
      <p class="paragraph">${nameGreeting}</p>
      <p class="paragraph">Use the following 6-digit verification code to sign in to your REMAKE ELECTRONICS account. This one-time password confirms your identity.</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏳ Expires in 5 minutes</div>
      </div>

      <p class="paragraph">Do not share this verification code with anyone. REMAKE ELECTRONICS will never ask for your code outside this login screen.</p>

      <div class="security-notice">
        If you did not request this verification code, please ignore this email or reach out to security support.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} REMAKE ELECTRONICS • Hackathon PS3: SECONDLIFE Reuse Platform
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Dispatch OTP email to user
 * @param {string} email 
 * @param {string} otp 
 * @param {string} [recipientName]
 */
async function sendOtpEmail(email, otp, recipientName) {
  const fromAddress = process.env.EMAIL_FROM || 'REMAKE ELECTRONICS <auth@remake-electronics.org>';
  const subject = `${otp} is your REMAKE ELECTRONICS verification code`;
  const text = `Your REMAKE ELECTRONICS 6-digit verification code is: ${otp}\n\nThis code expires in 5 minutes.\nDo not share this code with anyone.`;
  const html = buildOtpEmailTemplate(otp, recipientName);

  const mailRecord = {
    id: `mail_${Date.now()}`,
    to: email,
    subject,
    otp,
    text,
    html,
    timestamp: new Date().toISOString()
  };

  // Keep last 20 emails in dev mailbox
  devMailbox.unshift(mailRecord);
  if (devMailbox.length > 20) devMailbox.pop();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        text,
        html
      });
      console.log(`[EMAIL] Dispatched real SMTP email to ${email}. MessageId: ${info.messageId}`);
      return { success: true, mode: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`[EMAIL] SMTP send error:`, err.message);
      // Fallback logged for safety
      console.log(`[EMAIL DEV FALLBACK] Code generated for ${email}: ${otp}`);
      return { success: true, mode: 'dev-fallback', error: err.message };
    }
  } else {
    // Dev simulated mailbox
    console.log(`=======================================================`);
    console.log(`[EMAIL SERVICE] To: ${email}`);
    console.log(`[EMAIL SERVICE] Subject: ${subject}`);
    console.log(`[EMAIL SERVICE] 6-Digit OTP: ${otp} (Valid for 5 mins)`);
    console.log(`=======================================================`);
    return { success: true, mode: 'dev-mailbox' };
  }
}

function getDevMailbox() {
  return devMailbox;
}

function getLatestOtpForEmail(email) {
  if (!email) return null;
  const match = devMailbox.find((m) => m.to.toLowerCase() === email.toLowerCase().trim());
  return match ? { otp: match.otp, timestamp: match.timestamp, subject: match.subject } : null;
}

module.exports = {
  sendOtpEmail,
  getDevMailbox,
  getLatestOtpForEmail
};
