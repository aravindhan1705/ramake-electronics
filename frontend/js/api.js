/**
 * REMAKE ELECTRONICS - API Client
 */

const API = {
  baseUrl: '',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('remake_session_token');

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include'
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.warn(`[API ERROR] ${endpoint}:`, err.message);
      throw err;
    }
  },

  // Auth Endpoints
  sendOtp(email, fullName, isSignup) {
    return this.request('/api/auth/send-otp', {
      method: 'POST',
      body: { email, fullName, isSignup }
    });
  },

  verifyOtp(email, otp, fullName) {
    return this.request('/api/auth/verify-otp', {
      method: 'POST',
      body: { email, otp, fullName }
    });
  },

  getMe() {
    return this.request('/api/auth/me', { method: 'GET' });
  },

  logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  },

  getDevMailbox(email) {
    const q = email ? `?email=${encodeURIComponent(email)}` : '';
    return this.request(`/api/auth/dev-mailbox${q}`, { method: 'GET' });
  },

  // Catalog & Projects
  getCatalog() {
    return this.request('/api/components/catalog', { method: 'GET' });
  },

  getProjects(query = {}) {
    const params = new URLSearchParams(query).toString();
    return this.request(`/api/projects${params ? '?' + params : ''}`, { method: 'GET' });
  },

  getProjectById(id) {
    return this.request(`/api/projects/${id}`, { method: 'GET' });
  },

  // Matching Engine
  findProjects(components) {
    return this.request('/api/match/find-projects', {
      method: 'POST',
      body: { components }
    });
  },

  checkTargetProject(projectId, components) {
    return this.request('/api/match/check-project', {
      method: 'POST',
      body: { projectId, components }
    });
  },

  // User Data
  getUserInventory() {
    return this.request('/api/user/inventory', { method: 'GET' });
  },

  setUserInventory(components) {
    return this.request('/api/user/inventory', {
      method: 'POST',
      body: { components }
    });
  },

  getSavedProjects() {
    return this.request('/api/user/saved-projects', { method: 'GET' });
  },

  addSavedProject(projectId) {
    return this.request('/api/user/saved-projects', {
      method: 'POST',
      body: { projectId }
    });
  },

  removeSavedProject(projectId) {
    return this.request(`/api/user/saved-projects/${projectId}`, {
      method: 'DELETE'
    });
  },

  getUserImpact() {
    return this.request('/api/user/impact', { method: 'GET' });
  }
};

window.API = API;
