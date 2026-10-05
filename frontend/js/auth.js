/**
 * REMAKE ELECTRONICS - Authentication Module
 */

const Auth = {
  currentUser: null,
  activeEmail: '',
  activeFullName: '',
  isSignupMode: false,
  cooldownTimer: null,
  cooldownSecondsLeft: 0,

  init() {
    this.bindEvents();
    this.checkSession();
  },

  bindEvents() {
    // Auth modal open/close
    const btnOpenLogin = document.getElementById('btn-open-login');
    const btnHeroLogin = document.getElementById('btn-hero-login');
    const btnCloseAuth = document.getElementById('btn-close-auth-modal');
    const authOverlay = document.getElementById('auth-modal-overlay');

    if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => this.openAuthModal(false));
    if (btnHeroLogin) btnHeroLogin.addEventListener('click', () => this.openAuthModal(false));
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', () => this.closeAuthModal());

    if (authOverlay) {
      authOverlay.addEventListener('click', (e) => {
        if (e.target === authOverlay) this.closeAuthModal();
      });
    }

    // Tabs toggle
    const tabLogin = document.getElementById('tab-btn-login');
    const tabSignup = document.getElementById('tab-btn-signup');

    if (tabLogin) tabLogin.addEventListener('click', () => this.switchMode(false));
    if (tabSignup) tabSignup.addEventListener('click', () => this.switchMode(true));

    // Request OTP button
    const btnSendOtp = document.getElementById('btn-send-otp');
    if (btnSendOtp) btnSendOtp.addEventListener('click', () => this.handleSendOtp());

    // Verify OTP button
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    if (btnVerifyOtp) btnVerifyOtp.addEventListener('click', () => this.handleVerifyOtp());

    // Resend OTP button
    const btnResendOtp = document.getElementById('btn-resend-otp');
    if (btnResendOtp) btnResendOtp.addEventListener('click', () => this.handleResendOtp());

    // Back to Email input
    const btnBackToEmail = document.getElementById('btn-back-to-email');
    if (btnBackToEmail) btnBackToEmail.addEventListener('click', () => this.showEmailStep());

    // Setup 6-digit OTP inputs
    this.setupOtpInputBoxes();

    // Dev Mailbox preview toggle
    const btnFetchDevOtp = document.getElementById('btn-fetch-dev-otp');
    if (btnFetchDevOtp) btnFetchDevOtp.addEventListener('click', () => this.fetchDevOtp());
  },

  validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim();
    if (clean.length > 254) return false;
    if (clean.startsWith('@') || clean.endsWith('@')) return false;
    if (clean.indexOf('@') !== clean.lastIndexOf('@')) return false;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailRegex.test(clean);
  },

  openAuthModal(isSignup = false) {
    this.isSignupMode = isSignup;
    this.switchMode(isSignup);
    this.showEmailStep();
    this.clearAlerts();

    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) overlay.classList.add('active');
  },

  closeAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    this.clearAlerts();
  },

  switchMode(isSignup) {
    this.isSignupMode = isSignup;
    const tabLogin = document.getElementById('tab-btn-login');
    const tabSignup = document.getElementById('tab-btn-signup');
    const nameFieldWrapper = document.getElementById('signup-name-group');

    if (tabLogin && tabSignup) {
      if (isSignup) {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        if (nameFieldWrapper) nameFieldWrapper.style.display = 'block';
      } else {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        if (nameFieldWrapper) nameFieldWrapper.style.display = 'none';
      }
    }
    this.clearAlerts();
  },

  showEmailStep() {
    const emailStep = document.getElementById('auth-step-email');
    const otpStep = document.getElementById('auth-step-otp');
    if (emailStep) emailStep.style.display = 'block';
    if (otpStep) otpStep.style.display = 'none';
    this.clearAlerts();
  },

  showOtpStep() {
    const emailStep = document.getElementById('auth-step-email');
    const otpStep = document.getElementById('auth-step-otp');
    if (emailStep) emailStep.style.display = 'none';
    if (otpStep) otpStep.style.display = 'block';

    const sentEmailSpan = document.getElementById('otp-sent-to-email');
    if (sentEmailSpan) sentEmailSpan.textContent = this.activeEmail;

    // Reset OTP boxes
    const boxes = document.querySelectorAll('.otp-digit-input');
    boxes.forEach((b) => (b.value = ''));
    if (boxes[0]) boxes[0].focus();

    // Start 30s resend cooldown
    this.startResendCooldown(30);

    // Auto-fetch dev preview if on dev
    this.fetchDevOtp(true);
  },

  showAlert(message, type = 'error') {
    const alertBox = document.getElementById('auth-alert-message');
    if (alertBox) {
      alertBox.textContent = message;
      alertBox.className = `alert-box ${type}`;
      alertBox.style.display = 'flex';
    }
  },

  clearAlerts() {
    const alertBox = document.getElementById('auth-alert-message');
    if (alertBox) {
      alertBox.textContent = '';
      alertBox.style.display = 'none';
    }
  },

  async handleSendOtp() {
    this.clearAlerts();
    const emailInput = document.getElementById('auth-email-input');
    const nameInput = document.getElementById('auth-name-input');
    const btnSendOtp = document.getElementById('btn-send-otp');

    const email = emailInput ? emailInput.value.trim() : '';
    const fullName = nameInput ? nameInput.value.trim() : '';

    // Validation (Prompt Section 5 & 6)
    if (!this.validateEmail(email)) {
      this.showAlert('Please enter a valid email address.', 'error');
      return;
    }

    if (this.isSignupMode && fullName.length < 2) {
      this.showAlert('Please enter your full name.', 'error');
      return;
    }

    this.activeEmail = email;
    this.activeFullName = fullName;

    // Loading State (Prompt Section 48)
    const originalText = btnSendOtp ? btnSendOtp.textContent : 'SEND OTP';
    if (btnSendOtp) {
      btnSendOtp.disabled = true;
      btnSendOtp.textContent = 'Sending OTP...';
    }

    try {
      const response = await API.sendOtp(email, fullName, this.isSignupMode);
      this.showOtpStep();
      this.showAlert(response.message || 'OTP sent to your email.', 'success');
    } catch (err) {
      this.showAlert(err.message || 'Failed to send OTP. Please try again.', 'error');
    } finally {
      if (btnSendOtp) {
        btnSendOtp.disabled = false;
        btnSendOtp.textContent = originalText;
      }
    }
  },

  async handleResendOtp() {
    if (this.cooldownSecondsLeft > 0) return;
    this.clearAlerts();
    const btnResend = document.getElementById('btn-resend-otp');
    if (btnResend) {
      btnResend.disabled = true;
      btnResend.textContent = 'Sending...';
    }

    try {
      const response = await API.sendOtp(this.activeEmail, this.activeFullName, this.isSignupMode);
      this.showAlert('A new OTP has been sent to your email.', 'success');
      this.startResendCooldown(response.cooldownSeconds || 30);
      this.fetchDevOtp(true);
    } catch (err) {
      this.showAlert(err.message || 'Failed to resend OTP.', 'error');
      if (err.data && err.data.retryAfter) {
        this.startResendCooldown(err.data.retryAfter);
      }
    }
  },

  startResendCooldown(seconds = 30) {
    clearInterval(this.cooldownTimer);
    this.cooldownSecondsLeft = seconds;
    const btnResend = document.getElementById('btn-resend-otp');

    const updateDisplay = () => {
      if (this.cooldownSecondsLeft <= 0) {
        clearInterval(this.cooldownTimer);
        if (btnResend) {
          btnResend.disabled = false;
          btnResend.textContent = 'Resend OTP';
        }
      } else {
        if (btnResend) {
          btnResend.disabled = true;
          btnResend.textContent = `Resend OTP in ${this.cooldownSecondsLeft}s`;
        }
        this.cooldownSecondsLeft--;
      }
    };

    updateDisplay();
    this.cooldownTimer = setInterval(updateDisplay, 1000);
  },

  setupOtpInputBoxes() {
    const boxes = document.querySelectorAll('.otp-digit-input');
    boxes.forEach((box, idx) => {
      box.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[0] : '';
        if (val && idx < boxes.length - 1) {
          boxes[idx + 1].focus();
        }
      });

      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) {
          boxes[idx - 1].focus();
        } else if (e.key === 'Enter') {
          this.handleVerifyOtp();
        }
      });

      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (pasted) {
          for (let i = 0; i < boxes.length; i++) {
            boxes[i].value = pasted[i] || '';
          }
          const nextIndex = Math.min(pasted.length, boxes.length - 1);
          boxes[nextIndex].focus();
        }
      });
    });
  },

  getEnteredOtp() {
    const boxes = document.querySelectorAll('.otp-digit-input');
    let code = '';
    boxes.forEach((b) => (code += b.value));
    return code;
  },

  async handleVerifyOtp() {
    this.clearAlerts();
    const otp = this.getEnteredOtp();
    const btnVerify = document.getElementById('btn-verify-otp');

    if (otp.length !== 6) {
      this.showAlert('Please enter the complete 6-digit OTP.', 'error');
      return;
    }

    // Loading state (Prompt Section 48: "Verifying...")
    const originalText = btnVerify ? btnVerify.textContent : 'VERIFY OTP';
    if (btnVerify) {
      btnVerify.disabled = true;
      btnVerify.textContent = 'Verifying...';
    }

    try {
      const response = await API.verifyOtp(this.activeEmail, otp, this.activeFullName);
      localStorage.setItem('remake_session_token', response.token);
      this.currentUser = response.user;
      this.updateUserInterface(response.user);
      this.closeAuthModal();

      // Navigate to Home / Dashboard
      if (window.App) {
        window.App.navigateTo('dashboard');
        window.App.loadDashboardData();
      }
    } catch (err) {
      this.showAlert(err.message || 'Incorrect OTP. Please try again.', 'error');
    } finally {
      if (btnVerify) {
        btnVerify.disabled = false;
        btnVerify.textContent = originalText;
      }
    }
  },

  async fetchDevOtp(silent = false) {
    try {
      const res = await API.getDevMailbox(this.activeEmail);
      if (res && res.latest && res.latest.otp) {
        const previewContainer = document.getElementById('dev-otp-code-display');
        if (previewContainer) {
          previewContainer.textContent = res.latest.otp;
        }
        const previewDrawer = document.getElementById('dev-mailbox-drawer');
        if (previewDrawer) previewDrawer.style.display = 'block';

        if (!silent) {
          // Auto-fill OTP for tester convenience
          const boxes = document.querySelectorAll('.otp-digit-input');
          const codeStr = String(res.latest.otp);
          boxes.forEach((b, i) => {
            b.value = codeStr[i] || '';
          });
          this.showAlert('Dev Mailbox: OTP auto-filled for instant testing!', 'info');
        }
      }
    } catch (err) {
      // Dev mailbox disabled or error
    }
  },

  async checkSession() {
    const token = localStorage.getItem('remake_session_token');
    if (!token) {
      this.updateUserInterface(null);
      return;
    }

    try {
      const response = await API.getMe();
      if (response && response.user) {
        this.currentUser = response.user;
        this.updateUserInterface(response.user);
        if (window.App && window.App.currentView === 'landing') {
          window.App.navigateTo('dashboard');
          window.App.loadDashboardData();
        }
      } else {
        this.updateUserInterface(null);
      }
    } catch (err) {
      localStorage.removeItem('remake_session_token');
      this.updateUserInterface(null);
    }
  },

  async logout() {
    try {
      await API.logout();
    } catch (err) {
      // Ignore
    }
    localStorage.removeItem('remake_session_token');
    this.currentUser = null;
    this.updateUserInterface(null);
    if (window.App) {
      window.App.navigateTo('landing');
    }
  },

  updateUserInterface(user) {
    const unauthNav = document.getElementById('nav-unauth-actions');
    const authNav = document.getElementById('nav-auth-actions');
    const userNameSpan = document.getElementById('header-user-name');

    if (user) {
      if (unauthNav) unauthNav.style.display = 'none';
      if (authNav) authNav.style.display = 'flex';
      if (userNameSpan) userNameSpan.textContent = user.name || 'Maker';
    } else {
      if (unauthNav) unauthNav.style.display = 'flex';
      if (authNav) authNav.style.display = 'none';
      if (userNameSpan) userNameSpan.textContent = '';
    }
  }
};

window.Auth = Auth;
