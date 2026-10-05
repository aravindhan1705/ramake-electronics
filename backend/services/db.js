/**
 * REMAKE ELECTRONICS - Local File-backed Persistence Store
 */

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'store.json');

// Default initial state
const defaultState = {
  users: [
    {
      id: "usr_demo_101",
      name: "Aravindhan R",
      email: "aravindhan@example.com",
      createdAt: new Date().toISOString(),
      savedProjects: ["PROJ_AUTO_DUSTBIN", "PROJ_AUTO_NIGHT_LAMP"]
    }
  ],
  userInventories: {
    "usr_demo_101": [
      { "componentId": "ARDUINO_UNO", "name": "Arduino Uno", "quantity": 1 },
      { "componentId": "SERVO_MOTOR", "name": "Servo Motor", "quantity": 2 },
      { "componentId": "ULTRASONIC_SENSOR", "name": "Ultrasonic Sensor", "quantity": 1 },
      { "componentId": "LED", "name": "LED", "quantity": 5 },
      { "componentId": "LDR", "name": "LDR", "quantity": 2 }
    ]
  },
  sessions: {},
  otpStore: {},
  rateLimits: {}
};

let memoryStore = { ...defaultState };

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryStore = {
        ...defaultState,
        ...parsed,
        users: parsed.users || defaultState.users,
        userInventories: parsed.userInventories || defaultState.userInventories,
        sessions: parsed.sessions || {},
        otpStore: parsed.otpStore || {},
        rateLimits: parsed.rateLimits || {}
      };
    } else {
      saveStore();
    }
  } catch (err) {
    console.error('[DB] Failed to load store.json, using defaults:', err.message);
    memoryStore = { ...defaultState };
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Failed to persist store.json:', err.message);
  }
}

// Initialize on module load
loadStore();

module.exports = {
  // Users
  getUserByEmail(email) {
    if (!email) return null;
    const lower = email.toLowerCase().trim();
    return memoryStore.users.find((u) => u.email.toLowerCase() === lower) || null;
  },

  getUserById(id) {
    return memoryStore.users.find((u) => u.id === id) || null;
  },

  createUser(name, email) {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const user = {
      id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      createdAt: new Date().toISOString(),
      savedProjects: []
    };
    memoryStore.users.push(user);
    // Initialize empty inventory
    memoryStore.userInventories[id] = [];
    saveStore();
    return user;
  },

  updateUserName(id, name) {
    const user = memoryStore.users.find((u) => u.id === id);
    if (user) {
      user.name = name.trim();
      saveStore();
    }
    return user;
  },

  // User Inventories
  getUserInventory(userId) {
    return memoryStore.userInventories[userId] || [];
  },

  setUserInventory(userId, components) {
    memoryStore.userInventories[userId] = components || [];
    saveStore();
    return memoryStore.userInventories[userId];
  },

  // Saved Projects
  getSavedProjects(userId) {
    const user = this.getUserById(userId);
    return user ? user.savedProjects || [] : [];
  },

  addSavedProject(userId, projectId) {
    const user = this.getUserById(userId);
    if (!user) return false;
    if (!user.savedProjects) user.savedProjects = [];
    if (!user.savedProjects.includes(projectId)) {
      user.savedProjects.push(projectId);
      saveStore();
    }
    return true;
  },

  removeSavedProject(userId, projectId) {
    const user = this.getUserById(userId);
    if (!user) return false;
    if (!user.savedProjects) return false;
    user.savedProjects = user.savedProjects.filter((id) => id !== projectId);
    saveStore();
    return true;
  },

  // Sessions
  createSession(token, userId, email, ttlSeconds = 86400 * 7) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    memoryStore.sessions[token] = { token, userId, email, expiresAt };
    saveStore();
    return memoryStore.sessions[token];
  },

  getSession(token) {
    if (!token) return null;
    const session = memoryStore.sessions[token];
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      delete memoryStore.sessions[token];
      saveStore();
      return null;
    }
    return session;
  },

  destroySession(token) {
    if (token && memoryStore.sessions[token]) {
      delete memoryStore.sessions[token];
      saveStore();
    }
  },

  // Raw OTP store accessor
  getOtpRecord(email) {
    const key = email.toLowerCase().trim();
    return memoryStore.otpStore[key] || null;
  },

  setOtpRecord(email, record) {
    const key = email.toLowerCase().trim();
    memoryStore.otpStore[key] = record;
    saveStore();
  },

  deleteOtpRecord(email) {
    const key = email.toLowerCase().trim();
    if (memoryStore.otpStore[key]) {
      delete memoryStore.otpStore[key];
      saveStore();
    }
  },

  // Rate Limiting store
  getRateLimit(email) {
    const key = email.toLowerCase().trim();
    return memoryStore.rateLimits[key] || { requestTimestamps: [] };
  },

  recordRateLimitRequest(email) {
    const key = email.toLowerCase().trim();
    const current = memoryStore.rateLimits[key] || { requestTimestamps: [] };
    const now = Date.now();
    // Keep requests within last 15 minutes
    const fifteenMinutesAgo = now - 15 * 60 * 1000;
    const filtered = current.requestTimestamps.filter((ts) => ts > fifteenMinutesAgo);
    filtered.push(now);
    memoryStore.rateLimits[key] = { requestTimestamps: filtered, lastRequest: now };
    saveStore();
    return memoryStore.rateLimits[key];
  }
};
