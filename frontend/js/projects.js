/**
 * REMAKE ELECTRONICS - Projects, Recommendations & "I WANT TO BUILD" Workflow
 */

const Projects = {
  allProjects: [],
  currentRecommendations: [],
  savedProjectIds: new Set(),
  activeDetailProject: null,

  async init() {
    await this.fetchAllProjects();
    this.bindEvents();
    if (window.Auth && window.Auth.currentUser) {
      await this.refreshSavedProjects();
    }
  },

  async fetchAllProjects() {
    try {
      const res = await API.getProjects();
      this.allProjects = res.projects || [];
      this.populateProjectPicker();
    } catch (err) {
      console.error('Failed to fetch projects list:', err);
    }
  },

  bindEvents() {
    // Project details modal close button
    const btnCloseModal = document.getElementById('btn-close-project-modal');
    const overlay = document.getElementById('project-modal-overlay');

    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => this.closeProjectModal());
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeProjectModal();
      });
    }

    // Modal save button
    const btnModalSave = document.getElementById('btn-modal-save-project');
    if (btnModalSave) {
      btnModalSave.addEventListener('click', () => {
        if (this.activeDetailProject) {
          this.toggleSaveProject(this.activeDetailProject.projectId || this.activeDetailProject.id);
        }
      });
    }

    // "I WANT TO BUILD" check button
    const btnCheckTarget = document.getElementById('btn-check-target-project');
    if (btnCheckTarget) {
      btnCheckTarget.addEventListener('click', () => {
        this.handleCheckTargetProject();
      });
    }
  },

  populateProjectPicker() {
    const selectEl = document.getElementById('select-target-project');
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="">-- Select a project you want to build --</option>';
    this.allProjects.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.difficulty} • ${p.category})`;
      selectEl.appendChild(opt);
    });
  },

  async refreshSavedProjects() {
    if (!window.Auth || !window.Auth.currentUser) return;
    try {
      const res = await API.getSavedProjects();
      const list = res.savedProjects || [];
      this.savedProjectIds = new Set(list.map((p) => p.id));
      this.renderSavedProjectsView(list);
    } catch (err) {
      console.warn('Could not refresh saved projects:', err);
    }
  },

  renderRecommendations(recommendations, stats, userComponents) {
    this.currentRecommendations = recommendations || [];
    const container = document.getElementById('project-cards-container');
    const countBanner = document.getElementById('results-count-display');
    const subtitleBanner = document.getElementById('results-subtitle-display');

    if (countBanner) {
      countBanner.textContent = `Found ${recommendations.length} Project Matches`;
    }
    if (subtitleBanner) {
      subtitleBanner.textContent = `Ranked by feasibility percentage based on your ${userComponents.length} listed component types.`;
    }

    if (!container) return;

    if (!recommendations || recommendations.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">No matching projects found</div>
          <div class="empty-state-desc">Try adding more components to your inventory to unlock project recommendations.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = recommendations
      .map((proj) => this.buildProjectCardHtml(proj))
      .join('');

    // Attach card event listeners
    this.attachCardEventListeners(container);
  },

  buildProjectCardHtml(proj) {
    const isSaved = this.savedProjectIds.has(proj.projectId || proj.id);
    const projId = proj.projectId || proj.id;
    const feasibility = proj.feasibility || 0;

    let statusClass = 'low';
    if (proj.status === 'READY TO BUILD') statusClass = 'ready';
    else if (proj.status === 'PARTIALLY READY') statusClass = 'partial';

    // Format missing components text
    let missingDisplay = 'None';
    if (proj.missingComponents && proj.missingComponents.length > 0) {
      missingDisplay = proj.missingComponents
        .map((m) => `${this.escapeHtml(m.name)} ×${m.quantity || m.shortage}`)
        .join(', ');
    }

    // Format quantity shortage text if present
    let shortageDisplay = '';
    if (proj.quantityShortages && proj.quantityShortages.length > 0) {
      shortageDisplay = proj.quantityShortages
        .map((s) => `${this.escapeHtml(s.name)} (Have ${s.availableQuantity}, Need ${s.requiredQuantity})`)
        .join(', ');
    }

    return `
      <div class="project-card" data-project-id="${projId}">
        <div>
          <div class="project-card-header">
            <h3 class="project-card-title">${this.escapeHtml(proj.name)}</h3>
            <span class="difficulty-badge">${proj.difficulty}</span>
          </div>
          
          <p class="project-desc-clamp">${this.escapeHtml(proj.description)}</p>

          <div class="feasibility-box">
            <div class="feasibility-top-row">
              <span class="feasibility-text">FEASIBILITY</span>
              <span class="feasibility-percent">${feasibility}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${statusClass}" style="width: ${feasibility}%;"></div>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <span class="status-pill ${statusClass}">
              ● ${proj.statusLabel || proj.status}
            </span>
          </div>

          <div class="card-details-list">
            <div class="card-detail-item">
              <span class="card-detail-label">Available:</span>
              <span>${proj.availableRequiredTypes || 0} / ${proj.totalRequiredTypes || 0} component types</span>
            </div>
            <div class="card-detail-item">
              <span class="card-detail-label">Missing:</span>
              <span class="${proj.missingComponents && proj.missingComponents.length > 0 ? 'missing-list' : ''}">
                ${missingDisplay}
              </span>
            </div>
            ${
              shortageDisplay
                ? `
            <div class="card-detail-item">
              <span class="card-detail-label">Shortages:</span>
              <span style="color: #d97706; font-size: 12px;">${shortageDisplay}</span>
            </div>`
                : ''
            }
            <div class="card-detail-item">
              <span class="card-detail-label">Reuse Impact:</span>
              <span class="reused-badge">
                ${proj.componentsReused || 0} components • ${proj.estimatedWasteAvoided || 0}g diverted
              </span>
            </div>
          </div>
        </div>

        <div class="project-card-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-view-project" data-id="${projId}" style="flex: 1;">
            VIEW PROJECT
          </button>
          <button type="button" class="btn ${isSaved ? 'btn-primary' : 'btn-outline-dark'} btn-sm btn-save-project" data-id="${projId}">
            ${isSaved ? 'SAVED ✓' : 'SAVE PROJECT'}
          </button>
        </div>
      </div>
    `;
  },

  attachCardEventListeners(parentEl) {
    // View project button
    parentEl.querySelectorAll('.btn-view-project').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.openProjectDetails(id);
      });
    });

    // Save project button
    parentEl.querySelectorAll('.btn-save-project').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.toggleSaveProject(id, btn);
      });
    });
  },

  async openProjectDetails(projectId) {
    let proj = this.currentRecommendations.find((p) => (p.projectId || p.id) === projectId);

    if (!proj) {
      try {
        const res = await API.getProjectById(projectId);
        proj = res.matchInfo || res.project;
      } catch (err) {
        console.error('Could not load project details:', err);
        return;
      }
    }

    if (!proj) return;
    this.activeDetailProject = proj;

    // Populate modal elements
    const modalTitle = document.getElementById('modal-project-title');
    const modalDiff = document.getElementById('modal-project-difficulty');
    const modalCategory = document.getElementById('modal-project-category');
    const modalDesc = document.getElementById('modal-project-desc');
    const modalOverview = document.getElementById('modal-project-overview');
    const modalFeasibility = document.getElementById('modal-project-feasibility');
    const modalBar = document.getElementById('modal-feasibility-bar');
    const modalStatus = document.getElementById('modal-project-status');
    const modalComponentsList = document.getElementById('modal-project-components-list');
    const modalStepsList = document.getElementById('modal-project-steps-list');
    const modalWaste = document.getElementById('modal-project-waste');
    const btnSave = document.getElementById('btn-modal-save-project');

    if (modalTitle) modalTitle.textContent = proj.name;
    if (modalDiff) modalDiff.textContent = proj.difficulty;
    if (modalCategory) modalCategory.textContent = proj.category;
    if (modalDesc) modalDesc.textContent = proj.description;
    if (modalOverview) modalOverview.textContent = proj.overview || proj.description;

    const feasibility = proj.feasibility !== undefined ? proj.feasibility : 100;
    if (modalFeasibility) modalFeasibility.textContent = `${feasibility}%`;

    let statusClass = 'low';
    if (proj.status === 'READY TO BUILD') statusClass = 'ready';
    else if (proj.status === 'PARTIALLY READY') statusClass = 'partial';

    if (modalBar) {
      modalBar.className = `progress-bar-fill ${statusClass}`;
      modalBar.style.width = `${feasibility}%`;
    }

    if (modalStatus) {
      modalStatus.className = `status-pill ${statusClass}`;
      modalStatus.textContent = `● ${proj.statusLabel || proj.status || 'Active'}`;
    }

    if (modalWaste) {
      modalWaste.textContent = `${proj.estimatedWasteAvoided || 150} g e-waste diverted`;
    }

    // Components checklist
    if (modalComponentsList) {
      const breakdown = proj.componentBreakdown || (proj.components || []).map((c) => ({
        name: c.name,
        requiredQuantity: c.quantity,
        availableQuantity: c.quantity,
        status: 'AVAILABLE'
      }));

      modalComponentsList.innerHTML = breakdown
        .map((c) => {
          let badge = '<span style="color: #10b981; font-weight: 700;">✓ Available</span>';
          if (c.status === 'MISSING') {
            badge = '<span style="color: #ef4444; font-weight: 700;">✗ Missing</span>';
          } else if (c.status === 'INSUFFICIENT_QTY') {
            badge = `<span style="color: #f59e0b; font-weight: 700;">⚠ Shortage (Need ${c.shortage} more)</span>`;
          }
          return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #fafafa; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e4e4e7;">
            <div>
              <strong>${this.escapeHtml(c.name)}</strong> 
              <span style="color: #71717a; margin-left: 6px;">×${c.requiredQuantity}</span>
            </div>
            <div>${badge}</div>
          </div>
        `;
        })
        .join('');
    }

    // Step-by-step instructions
    if (modalStepsList) {
      const steps = proj.buildSteps || [
        'Gather the listed electronic components from your inventory.',
        'Review circuit wiring pin connections.',
        'Flash the corresponding Arduino firmware code to the microcontroller.',
        'Connect external sensors and test responsiveness.'
      ];

      modalStepsList.innerHTML = steps
        .map((s, idx) => `
          <li style="margin-bottom: 10px; padding-left: 6px; color: #374151; font-size: 14px;">
            <strong>Step ${idx + 1}:</strong> ${this.escapeHtml(s)}
          </li>
        `)
        .join('');
    }

    // Modal save button state
    const isSaved = this.savedProjectIds.has(projectId);
    if (btnSave) {
      btnSave.textContent = isSaved ? 'SAVED ✓' : 'SAVE PROJECT';
      btnSave.className = `btn ${isSaved ? 'btn-primary' : 'btn-outline-dark'}`;
    }

    // Show modal
    const overlay = document.getElementById('project-modal-overlay');
    if (overlay) overlay.classList.add('active');
  },

  closeProjectModal() {
    const overlay = document.getElementById('project-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    this.activeDetailProject = null;
  },

  async toggleSaveProject(projectId, targetBtn = null) {
    if (!window.Auth || !window.Auth.currentUser) {
      if (window.Auth) window.Auth.openAuthModal(false);
      return;
    }

    const isCurrentlySaved = this.savedProjectIds.has(projectId);

    try {
      if (isCurrentlySaved) {
        await API.removeSavedProject(projectId);
        this.savedProjectIds.delete(projectId);
      } else {
        await API.addSavedProject(projectId);
        this.savedProjectIds.add(projectId);
      }

      // Update button text
      const newSavedState = !isCurrentlySaved;
      if (targetBtn) {
        targetBtn.textContent = newSavedState ? 'SAVED ✓' : 'SAVE PROJECT';
        targetBtn.className = `btn ${newSavedState ? 'btn-primary' : 'btn-outline-dark'} btn-sm btn-save-project`;
      }

      const modalBtn = document.getElementById('btn-modal-save-project');
      if (modalBtn && this.activeDetailProject && (this.activeDetailProject.projectId || this.activeDetailProject.id) === projectId) {
        modalBtn.textContent = newSavedState ? 'SAVED ✓' : 'SAVE PROJECT';
        modalBtn.className = `btn ${newSavedState ? 'btn-primary' : 'btn-outline-dark'}`;
      }

      await this.refreshSavedProjects();
      if (window.App) window.App.loadDashboardData();
    } catch (err) {
      alert(err.message || 'Could not update saved project status.');
    }
  },

  renderSavedProjectsView(savedList) {
    const container = document.getElementById('saved-projects-list');
    const emptyState = document.getElementById('saved-projects-empty');

    if (!container) return;

    if (!savedList || savedList.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      container.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = savedList
      .map(
        (proj) => `
      <div class="project-card" style="margin-bottom: 20px;">
        <div class="project-card-header">
          <div>
            <h3 class="project-card-title">${this.escapeHtml(proj.name)}</h3>
            <span style="font-size: 12px; color: #71717a;">Saved on ${proj.savedDate || 'Recent'} • ${proj.category}</span>
          </div>
          <span class="difficulty-badge">${proj.difficulty}</span>
        </div>

        <p class="project-desc-clamp">${this.escapeHtml(proj.description)}</p>

        <div style="display: flex; gap: 12px; align-items: center; margin: 12px 0;">
          <span class="feasibility-percent" style="font-size: 16px;">${proj.feasibility || 0}% FEASIBILITY</span>
          <span class="status-pill ${proj.status === 'READY TO BUILD' ? 'ready' : 'partial'}">
            ● ${proj.statusLabel || proj.status}
          </span>
        </div>

        <div class="project-card-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="Projects.openProjectDetails('${proj.id}')">
            VIEW PROJECT
          </button>
          <button type="button" class="btn btn-sm" style="color: #dc2626; border-color: #fecaca; background: #fff5f5;" onclick="Projects.toggleSaveProject('${proj.id}')">
            REMOVE
          </button>
        </div>
      </div>
    `
      )
      .join('');
  },

  // "I WANT TO BUILD" reverse workflow handler
  async handleCheckTargetProject() {
    const selectEl = document.getElementById('select-target-project');
    const projectId = selectEl ? selectEl.value : '';
    const alertBox = document.getElementById('target-project-alert');
    const resultContainer = document.getElementById('target-project-result-container');

    if (!projectId) {
      if (alertBox) {
        alertBox.textContent = 'Please select a project from the list.';
        alertBox.style.display = 'block';
      }
      return;
    }

    if (alertBox) alertBox.style.display = 'none';

    const btnCheck = document.getElementById('btn-check-target-project');
    const originalText = btnCheck ? btnCheck.textContent : 'CHECK MY COMPONENTS';
    if (btnCheck) {
      btnCheck.disabled = true;
      btnCheck.textContent = 'Checking Requirements...';
    }

    try {
      // Gather user's current components
      const userComps = window.Components ? window.Components.getValidComponents() : [];
      const res = await API.checkTargetProject(projectId, userComps);
      const target = res.targetProject;
      const alternatives = res.alternatives || [];

      if (!resultContainer) return;
      resultContainer.style.display = 'block';

      let statusClass = 'low';
      if (target.status === 'READY TO BUILD') statusClass = 'ready';
      else if (target.status === 'PARTIALLY READY') statusClass = 'partial';

      // Build checklist
      const checklistHtml = target.componentBreakdown
        .map((c) => {
          let badge = '<span style="color: #10b981; font-weight: 700;">✓ Available</span>';
          if (!c.isAvailable) {
            badge = `<span style="color: #ef4444; font-weight: 700;">✗ Missing (Need ${c.requiredQuantity})</span>`;
          } else if (!c.isSufficient) {
            badge = `<span style="color: #f59e0b; font-weight: 700;">⚠ Shortage (Have ${c.availableQuantity}, Need ${c.requiredQuantity})</span>`;
          }
          return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e4e4e7;">
            <div><strong>${this.escapeHtml(c.name)}</strong> ×${c.requiredQuantity}</div>
            <div>${badge}</div>
          </div>
        `;
        })
        .join('');

      // Build alternatives section if needed (Prompt Section 39)
      let alternativesHtml = '';
      if (alternatives.length > 0 && target.feasibility < 100) {
        alternativesHtml = `
          <div class="alternatives-container">
            <h4 class="alternatives-title">You may also be able to build with your components:</h4>
            <div class="project-recommendations-grid">
              ${alternatives.map((alt) => this.buildProjectCardHtml(alt)).join('')}
            </div>
          </div>
        `;
      }

      resultContainer.innerHTML = `
        <div class="comparison-result-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div>
              <span class="badge-tag" style="margin-bottom: 8px;">TARGET PROJECT</span>
              <h2 style="font-size: 26px; font-weight: 800; text-transform: uppercase;">${this.escapeHtml(target.name)}</h2>
              <p style="color: #52525b; margin-top: 4px;">${this.escapeHtml(target.description)}</p>
            </div>
            <span class="status-pill ${statusClass}" style="font-size: 13px; padding: 6px 14px;">
              ● ${target.statusLabel}
            </span>
          </div>

          <div class="feasibility-box" style="margin: 20px 0;">
            <div class="feasibility-top-row">
              <span class="feasibility-text">FEASIBILITY SCORE</span>
              <span class="feasibility-percent">${target.feasibility}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${statusClass}" style="width: ${target.feasibility}%;"></div>
            </div>
          </div>

          <div class="alert-box ${target.status === 'READY TO BUILD' ? 'success' : 'info'}" style="margin: 20px 0; font-size: 14px;">
            ${target.matchMessage}
          </div>

          <div style="margin: 24px 0;">
            <h4 style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #09090b;">
              Component Checklist & Inventory Status
            </h4>
            ${checklistHtml}
          </div>

          <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button type="button" class="btn btn-primary" onclick="Projects.openProjectDetails('${target.projectId}')">
              VIEW FULL BUILD DETAILS
            </button>
            <button type="button" class="btn btn-outline-dark" onclick="Projects.toggleSaveProject('${target.projectId}', this)">
              ${this.savedProjectIds.has(target.projectId) ? 'SAVED ✓' : 'SAVE PROJECT'}
            </button>
          </div>
        </div>

        ${alternativesHtml}
      `;

      // Attach card listeners for alternative cards
      this.attachCardEventListeners(resultContainer);
      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Failed to check project.';
        alertBox.style.display = 'block';
      }
    } finally {
      if (btnCheck) {
        btnCheck.disabled = false;
        btnCheck.textContent = originalText;
      }
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.Projects = Projects;
