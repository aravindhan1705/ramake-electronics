/**
 * REMAKE ELECTRONICS - Main Application Controller & Router
 */

const App = {
  currentView: 'landing',

  async init() {
    console.log('[APP] Initializing REMAKE ELECTRONICS...');
    
    // Initialize submodules
    if (window.Auth) window.Auth.init();
    if (window.Components) await window.Components.init();
    if (window.Projects) await window.Projects.init();

    this.bindNavigationEvents();
    this.setupDropdownMenu();

    // Check if session exists to select initial view
    if (window.Auth && window.Auth.currentUser) {
      this.navigateTo('dashboard');
      this.loadDashboardData();
    } else {
      this.navigateTo('landing');
    }
  },

  bindNavigationEvents() {
    // Brand Link click -> Home / Landing
    const brandLink = document.getElementById('brand-home-link');
    if (brandLink) {
      brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.Auth && window.Auth.currentUser) {
          this.navigateTo('dashboard');
        } else {
          this.navigateTo('landing');
        }
      });
    }

    // Major Dashboard Actions
    const btnActionHave = document.getElementById('btn-action-have-components');
    const btnActionBuild = document.getElementById('btn-action-want-to-build');

    if (btnActionHave) {
      btnActionHave.addEventListener('click', () => {
        this.navigateTo('have-components');
      });
    }

    if (btnActionBuild) {
      btnActionBuild.addEventListener('click', () => {
        this.navigateTo('want-to-build');
      });
    }

    // Landing "Get Started" buttons
    const btnGetStarted = document.getElementById('btn-landing-get-started');
    if (btnGetStarted) {
      btnGetStarted.addEventListener('click', () => {
        if (window.Auth && window.Auth.currentUser) {
          this.navigateTo('dashboard');
        } else {
          window.Auth.openAuthModal(true); // Open in signup mode
        }
      });
    }

    // Discover projects buttons from empty states
    document.querySelectorAll('.btn-discover-projects').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.navigateTo('have-components');
      });
    });
  },

  setupDropdownMenu() {
    const btnThreeDot = document.getElementById('btn-three-dot-menu');
    const dropdown = document.getElementById('three-dot-dropdown-menu');
    const itemHome = document.getElementById('menu-item-home');
    const itemMyProjects = document.getElementById('menu-item-my-projects');
    const itemLogout = document.getElementById('menu-item-logout');

    if (btnThreeDot && dropdown) {
      btnThreeDot.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== btnThreeDot) {
          dropdown.classList.remove('active');
        }
      });
    }

    if (itemHome) {
      itemHome.addEventListener('click', () => {
        if (dropdown) dropdown.classList.remove('active');
        this.navigateTo('dashboard');
      });
    }

    if (itemMyProjects) {
      itemMyProjects.addEventListener('click', () => {
        if (dropdown) dropdown.classList.remove('active');
        this.navigateTo('my-projects');
        if (window.Projects) window.Projects.refreshSavedProjects();
      });
    }

    if (itemLogout) {
      itemLogout.addEventListener('click', () => {
        if (dropdown) dropdown.classList.remove('active');
        if (window.Auth) window.Auth.logout();
      });
    }
  },

  navigateTo(viewName) {
    // Route protection check (Prompt Section 52)
    const protectedViews = ['dashboard', 'have-components', 'want-to-build', 'my-projects'];
    if (protectedViews.includes(viewName) && (!window.Auth || !window.Auth.currentUser)) {
      if (window.Auth) window.Auth.openAuthModal(false);
      return;
    }

    this.currentView = viewName;

    // Hide all view sections
    const views = document.querySelectorAll('.view-section');
    views.forEach((v) => v.classList.remove('active'));

    // Show target view
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Refresh view specific data
    if (viewName === 'dashboard') {
      this.loadDashboardData();
    } else if (viewName === 'my-projects') {
      if (window.Projects) window.Projects.refreshSavedProjects();
    }
  },

  async loadDashboardData() {
    if (!window.Auth || !window.Auth.currentUser) return;
    try {
      const res = await API.getUserImpact();
      if (res && res.impact) {
        const imp = res.impact;
        const elReused = document.getElementById('stat-components-reused');
        const elSaved = document.getElementById('stat-projects-saved');
        const elEnabled = document.getElementById('stat-projects-enabled');
        const elWaste = document.getElementById('stat-waste-avoided');

        if (elReused) elReused.textContent = imp.componentsReused;
        if (elSaved) elSaved.textContent = imp.projectsSaved;
        if (elEnabled) elEnabled.textContent = imp.projectsEnabled;
        if (elWaste) elWaste.textContent = `${imp.estimatedWasteAvoidedKg} kg`;
      }
    } catch (err) {
      console.warn('Could not load user impact stats:', err);
    }
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
