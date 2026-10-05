/**
 * REMAKE ELECTRONICS - Authentication Middleware
 * Checks cookie or Authorization header for session token
 */

const db = require('../services/db');

function requireAuth(req, res, next) {
  // Check authorization header first, then cookie
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.remake_session) {
    token = req.cookies.remake_session;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.'
    });
  }

  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid. Please log in again.'
    });
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'User account not found.'
    });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

/**
 * Optional auth: attaches req.user if session valid, but does not block
 */
function optionalAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.remake_session) {
    token = req.cookies.remake_session;
  }

  if (token) {
    const session = db.getSession(token);
    if (session) {
      const user = db.getUserById(session.userId);
      if (user) {
        req.user = user;
        req.sessionToken = token;
      }
    }
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
