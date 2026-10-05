/**
 * REMAKE ELECTRONICS - Component Management & "I HAVE COMPONENTS" Workflow
 */

const Components = {
  catalog: [],
  userComponents: [], // [{ id, componentId, name, quantity, category, isValid }]
  nextRowId: 1,

  async init() {
    await this.fetchCatalog();
    this.bindEvents();
  },

  async fetchCatalog() {
    try {
      const res = await API.getCatalog();
      this.catalog = res.catalog || [];
    } catch (err) {
      console.error('Failed to load component catalog:', err);
    }
  },

  bindEvents() {
    // Number of components prompt
    const btnContinueCount = document.getElementById('btn-continue-component-count');
    const inputCount = document.getElementById('input-component-count');

    if (btnContinueCount) {
      btnContinueCount.addEventListener('click', () => {
        const count = parseInt(inputCount.value, 10);
        const validCount = Number.isInteger(count) && count > 0 ? Math.min(count, 30) : 5;
        this.initializeRows(validCount);
      });
    }

    // Add row button
    const btnAddRow = document.getElementById('btn-add-component-row');
    if (btnAddRow) {
      btnAddRow.addEventListener('click', () => {
        this.addRow('', 1);
      });
    }

    // Load demo preset button
    const btnLoadPreset = document.getElementById('btn-load-demo-preset');
    if (btnLoadPreset) {
      btnLoadPreset.addEventListener('click', () => {
        this.loadDemoPreset();
      });
    }

    // Clear all components button
    const btnClearAll = document.getElementById('btn-clear-components');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', () => {
        this.clearAll();
      });
    }

    // Find Projects button
    const btnFindProjects = document.getElementById('btn-find-projects');
    if (btnFindProjects) {
      btnFindProjects.addEventListener('click', () => {
        this.handleFindProjects();
      });
    }
  },

  initializeRows(count) {
    const container = document.getElementById('components-input-list');
    if (!container) return;
    container.innerHTML = '';
    this.userComponents = [];
    this.nextRowId = 1;

    for (let i = 0; i < count; i++) {
      this.addRow('', 1);
    }

    const stepRowsSection = document.getElementById('component-rows-section');
    if (stepRowsSection) {
      stepRowsSection.style.display = 'block';
      stepRowsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.updateReviewTable();
  },

  addRow(defaultName = '', defaultQty = 1) {
    const container = document.getElementById('components-input-list');
    if (!container) return;

    const rowId = this.nextRowId++;
    const matched = defaultName ? this.findCatalogMatch(defaultName) : null;

    const entry = {
      id: rowId,
      componentId: matched ? matched.id : '',
      name: defaultName,
      quantity: defaultQty > 0 ? defaultQty : 1,
      category: matched ? matched.category : '',
      isValid: !!matched
    };

    this.userComponents.push(entry);

    const rowEl = document.createElement('div');
    rowEl.className = 'component-input-row';
    rowEl.id = `comp-row-${rowId}`;
    rowEl.innerHTML = `
      <div class="row-index">${this.userComponents.length}</div>
      <div class="autocomplete-wrapper">
        <input 
          type="text" 
          class="text-input component-name-input" 
          placeholder="Type component name (e.g. Arduino Uno, Servo Motor)..." 
          value="${this.escapeHtml(defaultName)}" 
          autocomplete="off"
        />
        <div class="autocomplete-dropdown"></div>
      </div>
      <div>
        <input 
          type="number" 
          class="qty-input" 
          min="1" 
          max="999" 
          value="${defaultQty}" 
          title="Quantity" 
        />
      </div>
      <div>
        <button type="button" class="btn-remove-row" title="Remove component">✕</button>
      </div>
      <div class="component-row-warning" style="display: ${defaultName && !matched ? 'flex' : 'none'};">
        ⚠ Component not recognized. Please select a valid component from the catalog.
      </div>
    `;

    container.appendChild(rowEl);
    this.attachRowEvents(rowEl, entry);
    this.updateRowIndices();
    this.updateReviewTable();
  },

  attachRowEvents(rowEl, entry) {
    const nameInput = rowEl.querySelector('.component-name-input');
    const dropdown = rowEl.querySelector('.autocomplete-dropdown');
    const qtyInput = rowEl.querySelector('.qty-input');
    const removeBtn = rowEl.querySelector('.btn-remove-row');
    const warningEl = rowEl.querySelector('.component-row-warning');

    // Autocomplete input
    nameInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      entry.name = query;

      if (!query) {
        dropdown.classList.remove('active');
        warningEl.style.display = 'none';
        entry.componentId = '';
        entry.isValid = false;
        this.updateReviewTable();
        return;
      }

      const matches = this.searchCatalog(query);
      if (matches.length > 0) {
        dropdown.innerHTML = matches
          .map(
            (m) => `
          <div class="autocomplete-item" data-id="${m.id}" data-name="${m.name}">
            <span><strong>${this.escapeHtml(m.name)}</strong></span>
            <span class="autocomplete-category">${m.category}</span>
          </div>
        `
          )
          .join('');
        dropdown.classList.add('active');
      } else {
        dropdown.classList.remove('active');
      }

      // Check if current text is valid
      const exactMatch = this.findCatalogMatch(query);
      if (exactMatch) {
        entry.componentId = exactMatch.id;
        entry.name = exactMatch.name;
        entry.category = exactMatch.category;
        entry.isValid = true;
        warningEl.style.display = 'none';
      } else {
        entry.componentId = '';
        entry.isValid = false;
        if (query.length > 2) {
          warningEl.style.display = 'flex';
        } else {
          warningEl.style.display = 'none';
        }
      }
      this.updateReviewTable();
    });

    // Select from autocomplete
    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (!item) return;

      const id = item.dataset.id;
      const name = item.dataset.name;
      const matched = this.catalog.find((c) => c.id === id);

      if (matched) {
        nameInput.value = matched.name;
        entry.componentId = matched.id;
        entry.name = matched.name;
        entry.category = matched.category;
        entry.isValid = true;
        warningEl.style.display = 'none';
      }

      dropdown.classList.remove('active');
      this.updateReviewTable();
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (!rowEl.contains(e.target)) {
        dropdown.classList.remove('active');
        // Validate on blur
        if (entry.name && !entry.isValid) {
          warningEl.style.display = 'flex';
        }
      }
    });

    // Quantity change
    qtyInput.addEventListener('input', (e) => {
      let qty = parseInt(e.target.value, 10);
      if (isNaN(qty) || qty < 1) {
        qty = 1;
      }
      entry.quantity = qty;
      this.updateReviewTable();
    });

    qtyInput.addEventListener('blur', (e) => {
      let qty = parseInt(e.target.value, 10);
      if (isNaN(qty) || qty < 1) {
        e.target.value = 1;
        entry.quantity = 1;
        this.updateReviewTable();
      }
    });

    // Remove row button (Prompt Section 19: remove without reloading)
    removeBtn.addEventListener('click', () => {
      this.removeRow(entry.id);
    });
  },

  removeRow(rowId) {
    const idx = this.userComponents.findIndex((c) => c.id === rowId);
    if (idx !== -1) {
      this.userComponents.splice(idx, 1);
    }
    const rowEl = document.getElementById(`comp-row-${rowId}`);
    if (rowEl) {
      rowEl.remove();
    }
    this.updateRowIndices();
    this.updateReviewTable();
  },

  updateRowIndices() {
    const rows = document.querySelectorAll('.component-input-row');
    rows.forEach((row, i) => {
      const indexEl = row.querySelector('.row-index');
      if (indexEl) indexEl.textContent = i + 1;
    });
  },

  clearAll() {
    const container = document.getElementById('components-input-list');
    if (container) container.innerHTML = '';
    this.userComponents = [];
    this.nextRowId = 1;
    this.addRow('', 1);
    this.updateReviewTable();
  },

  searchCatalog(query) {
    const q = query.toLowerCase().trim();
    return this.catalog
      .filter((item) => {
        if (item.name.toLowerCase().includes(q)) return true;
        if (item.aliases && item.aliases.some((a) => a.toLowerCase().includes(q))) return true;
        return false;
      })
      .slice(0, 8);
  },

  findCatalogMatch(nameOrId) {
    if (!nameOrId) return null;
    const lower = nameOrId.toLowerCase().trim();
    // Direct ID
    const byId = this.catalog.find((c) => c.id === nameOrId.toUpperCase().trim());
    if (byId) return byId;

    // Direct name
    const byName = this.catalog.find((c) => c.name.toLowerCase() === lower);
    if (byName) return byName;

    // Alias
    const byAlias = this.catalog.find(
      (c) => c.aliases && c.aliases.some((a) => a.toLowerCase() === lower)
    );
    if (byAlias) return byAlias;

    return null;
  },

  loadDemoPreset() {
    // Hacker kit from Problem Statement (Section 25 & 26)
    const demoItems = [
      { name: 'Arduino Uno', quantity: 1 },
      { name: 'Servo Motor', quantity: 2 },
      { name: 'Ultrasonic Sensor', quantity: 1 },
      { name: 'LED', quantity: 5 },
      { name: 'LDR', quantity: 2 }
    ];

    const container = document.getElementById('components-input-list');
    if (!container) return;
    container.innerHTML = '';
    this.userComponents = [];
    this.nextRowId = 1;

    demoItems.forEach((item) => {
      this.addRow(item.name, item.quantity);
    });

    const stepRowsSection = document.getElementById('component-rows-section');
    if (stepRowsSection) {
      stepRowsSection.style.display = 'block';
    }

    this.updateReviewTable();
  },

  getValidComponents() {
    return this.userComponents
      .filter((c) => c.isValid && c.name && c.quantity > 0)
      .map((c) => ({
        componentId: c.componentId,
        name: c.name,
        quantity: c.quantity,
        category: c.category
      }));
  },

  updateReviewTable() {
    const valid = this.getValidComponents();
    const tableBody = document.getElementById('review-table-body');
    const emptyState = document.getElementById('review-table-empty');
    const tableContainer = document.getElementById('review-table-wrapper');
    const btnFind = document.getElementById('btn-find-projects');
    const countBadge = document.getElementById('review-components-count');

    if (countBadge) {
      countBadge.textContent = `${valid.length} component${valid.length === 1 ? '' : 's'}`;
    }

    if (!valid || valid.length === 0) {
      if (tableBody) tableBody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (tableContainer) tableContainer.style.display = 'none';
      if (btnFind) btnFind.disabled = true;
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
    if (btnFind) btnFind.disabled = false;

    if (tableBody) {
      tableBody.innerHTML = valid
        .map(
          (c) => `
        <tr>
          <td><strong>${this.escapeHtml(c.name)}</strong></td>
          <td><span class="component-chip">${c.category || 'General'}</span></td>
          <td><strong>× ${c.quantity}</strong></td>
        </tr>
      `
        )
        .join('');
    }
  },

  async handleFindProjects() {
    const valid = this.getValidComponents();
    const errorAlert = document.getElementById('find-projects-alert');

    // Section 93: Error handling if empty
    if (valid.length === 0) {
      if (errorAlert) {
        errorAlert.textContent = 'Add at least one component to find suitable projects.';
        errorAlert.style.display = 'block';
      }
      return;
    }

    if (errorAlert) errorAlert.style.display = 'none';

    // Show loading state (Section 48)
    const btnFind = document.getElementById('btn-find-projects');
    const originalText = btnFind ? btnFind.textContent : 'FIND PROJECTS';
    if (btnFind) {
      btnFind.disabled = true;
      btnFind.textContent = 'Finding the best project matches...';
    }

    try {
      const result = await API.findProjects(valid);
      if (window.Projects) {
        window.Projects.renderRecommendations(result.recommendations, result.stats, valid);
        // Scroll to results
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          resultsSection.style.display = 'block';
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } catch (err) {
      if (errorAlert) {
        errorAlert.textContent = err.message || 'Failed to match projects. Please try again.';
        errorAlert.style.display = 'block';
      }
    } finally {
      if (btnFind) {
        btnFind.disabled = false;
        btnFind.textContent = originalText;
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

window.Components = Components;
