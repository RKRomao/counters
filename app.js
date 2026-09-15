/**
 * PulseCounters - Dynamic Counters Web App
 * State management, Drag & Drop, Web Audio synthesizer, filtering, and local storage.
 */

// Color Palette Themes for Counters
const COLOR_THEMES = [
  { name: 'Indigo', hex: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
  { name: 'Cyan', hex: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
  { name: 'Esmeralda', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { name: 'Âmbar', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { name: 'Rosa', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
  { name: 'Roxo', hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' }
];

// Initial Seed Data (if first time opening)
const DEFAULT_COUNTERS = [
  {
    id: 'cnt_1',
    title: 'Copos de Água 💧',
    count: 5,
    step: 1,
    category: 'Saúde',
    target: 8,
    color: '#06b6d4',
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 1800000
  },
  {
    id: 'cnt_2',
    title: 'Tarefas Concluídas 🚀',
    count: 12,
    step: 1,
    category: 'Trabalho',
    target: 15,
    color: '#6366f1',
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 600000
  },
  {
    id: 'cnt_3',
    title: 'Páginas Lidas 📖',
    count: 35,
    step: 5,
    category: 'Estudo',
    target: 50,
    color: '#10b981',
    createdAt: Date.now() - 3600000 * 3,
    updatedAt: Date.now() - 1200000
  },
  {
    id: 'cnt_4',
    title: 'Pausas & Alongamento 🧘',
    count: 3,
    step: 1,
    category: 'Saúde',
    target: 4,
    color: '#a855f7',
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 300000
  }
];

class PulseCountersApp {
  constructor() {
    this.counters = [];
    this.soundEnabled = true;
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'custom';
    this.selectedColor = COLOR_THEMES[0].hex;
    this.draggedCounterId = null;

    // Audio Context (Synthesizer)
    this.audioCtx = null;

    // Pending Confirmation Callback
    this.pendingConfirmAction = null;

    this.init();
  }

  init() {
    this.loadState();
    this.initDOMElements();
    this.renderColorPicker();
    this.bindEvents();
    this.render();
  }

  // ==========================================
  // State & LocalStorage
  // ==========================================
  loadState() {
    try {
      const stored = localStorage.getItem('pulse_counters_data');
      if (stored) {
        this.counters = JSON.parse(stored);
      } else {
        this.counters = [...DEFAULT_COUNTERS];
        this.saveState();
      }

      const soundPref = localStorage.getItem('pulse_counters_sound');
      this.soundEnabled = soundPref !== null ? JSON.parse(soundPref) : true;
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      this.counters = [...DEFAULT_COUNTERS];
    }
  }

  saveState() {
    try {
      localStorage.setItem('pulse_counters_data', JSON.stringify(this.counters));
      localStorage.setItem('pulse_counters_sound', JSON.stringify(this.soundEnabled));
    } catch (e) {
      console.error('Erro ao salvar dados no LocalStorage:', e);
    }
  }

  // ==========================================
  // Web Audio Synthesizer Feedback
  // ==========================================
  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSound(type = 'up') {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      const now = this.audioCtx.currentTime;
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'up') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(560, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'down') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'goal') {
        // Goal achieved fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const noteOsc = this.audioCtx.createOscillator();
          const noteGain = this.audioCtx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(this.audioCtx.destination);

          const startTime = now + (idx * 0.07);
          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(freq, startTime);
          noteGain.gain.setValueAtTime(0.18, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

          noteOsc.start(startTime);
          noteOsc.stop(startTime + 0.18);
        });
      }
    } catch (err) {
      console.warn('Áudio não disponível:', err);
    }
  }

  // ==========================================
  // DOM Elements Initialization
  // ==========================================
  initDOMElements() {
    this.countersGrid = document.getElementById('countersGrid');
    this.emptyState = document.getElementById('emptyState');
    this.emptyStateTitle = document.getElementById('emptyStateTitle');
    this.emptyStateDesc = document.getElementById('emptyStateDesc');

    // Stats
    this.statTotalCounters = document.getElementById('statTotalCounters');
    this.statTotalSum = document.getElementById('statTotalSum');
    this.statMaxCount = document.getElementById('statMaxCount');
    this.statMaxName = document.getElementById('statMaxName');
    this.statGoalsReached = document.getElementById('statGoalsReached');

    // Controls
    this.searchInput = document.getElementById('searchInput');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.categoryTabs = document.getElementById('categoryTabs');
    this.sortSelect = document.getElementById('sortSelect');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.soundIconOn = document.getElementById('soundIconOn');
    this.soundIconOff = document.getElementById('soundIconOff');

    // Actions
    this.openNewModalBtn = document.getElementById('openNewModalBtn');
    this.emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
    this.exportDataBtn = document.getElementById('exportDataBtn');
    this.importDataBtn = document.getElementById('importDataBtn');
    this.importFileInput = document.getElementById('importFileInput');

    // Modal Form
    this.counterModal = document.getElementById('counterModal');
    this.counterForm = document.getElementById('counterForm');
    this.modalTitle = document.getElementById('modalTitle');
    this.formCounterId = document.getElementById('formCounterId');
    this.formTitle = document.getElementById('formTitle');
    this.formInitialValue = document.getElementById('formInitialValue');
    this.formStep = document.getElementById('formStep');
    this.formCategory = document.getElementById('formCategory');
    this.formTarget = document.getElementById('formTarget');
    this.colorPickerGrid = document.getElementById('colorPickerGrid');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.cancelModalBtn = document.getElementById('cancelModalBtn');

    // Confirm Modal
    this.confirmModal = document.getElementById('confirmModal');
    this.confirmTitle = document.getElementById('confirmTitle');
    this.confirmMessage = document.getElementById('confirmMessage');
    this.confirmCancelBtn = document.getElementById('confirmCancelBtn');
    this.confirmActionBtn = document.getElementById('confirmActionBtn');

    this.updateSoundIcon();
  }

  updateSoundIcon() {
    if (this.soundEnabled) {
      this.soundIconOn.classList.remove('hidden');
      this.soundIconOff.classList.add('hidden');
    } else {
      this.soundIconOn.classList.add('hidden');
      this.soundIconOff.classList.remove('hidden');
    }
  }

  renderColorPicker() {
    this.colorPickerGrid.innerHTML = '';
    COLOR_THEMES.forEach((theme) => {
      const el = document.createElement('div');
      el.className = `color-choice ${theme.hex === this.selectedColor ? 'selected' : ''}`;
      el.style.backgroundColor = theme.hex;
      el.setAttribute('data-color', theme.hex);
      el.title = theme.name;

      el.addEventListener('click', () => {
        document.querySelectorAll('.color-choice').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedColor = theme.hex;
      });

      this.colorPickerGrid.appendChild(el);
    });
  }

  // ==========================================
  // Event Bindings
  // ==========================================
  bindEvents() {
    // Sound Toggle
    this.soundToggleBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.updateSoundIcon();
      this.saveState();
      if (this.soundEnabled) this.playSound('up');
    });

    // Search
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.clearSearchBtn.classList.toggle('hidden', !this.searchQuery);
      this.render();
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.clearSearchBtn.classList.add('hidden');
      this.render();
    });

    // Sort Selection
    this.sortSelect.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render();
    });

    // Add Modal buttons
    const openAdd = () => this.openCounterModal();
    this.openNewModalBtn.addEventListener('click', openAdd);
    this.emptyStateAddBtn.addEventListener('click', openAdd);

    this.closeModalBtn.addEventListener('click', () => this.closeCounterModal());
    this.cancelModalBtn.addEventListener('click', () => this.closeCounterModal());

    // Counter Form Submit
    this.counterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Backup & Restore
    this.exportDataBtn.addEventListener('click', () => this.exportBackup());
    this.importDataBtn.addEventListener('click', () => this.importFileInput.click());
    this.importFileInput.addEventListener('change', (e) => this.handleImportFile(e));

    // Confirm Modal
    this.confirmCancelBtn.addEventListener('click', () => this.closeConfirmModal());
    this.confirmActionBtn.addEventListener('click', () => {
      if (typeof this.pendingConfirmAction === 'function') {
        this.pendingConfirmAction();
      }
      this.closeConfirmModal();
    });

    // Close modals on clicking outside overlay
    window.addEventListener('click', (e) => {
      if (e.target === this.counterModal) this.closeCounterModal();
      if (e.target === this.confirmModal) this.closeConfirmModal();
    });

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCounterModal();
        this.closeConfirmModal();
      }
    });
  }

  // ==========================================
  // Counter Operations
  // ==========================================
  increment(id, amount = 1) {
    const counter = this.counters.find(c => c.id === id);
    if (!counter) return;

    const prevCount = counter.count;
    counter.count += amount;
    counter.updatedAt = Date.now();

    // Check target reached
    if (counter.target && prevCount < counter.target && counter.count >= counter.target) {
      this.playSound('goal');
    } else {
      this.playSound(amount >= 0 ? 'up' : 'down');
    }

    this.saveState();
    this.updateCardDOM(id, amount >= 0 ? 'bump-up' : 'bump-down');
    this.updateStats();
  }

  setCount(id, exactValue) {
    const counter = this.counters.find(c => c.id === id);
    if (!counter) return;

    const parsed = parseInt(exactValue, 10);
    if (isNaN(parsed)) return;

    const prev = counter.count;
    counter.count = parsed;
    counter.updatedAt = Date.now();

    if (counter.target && prev < counter.target && counter.count >= counter.target) {
      this.playSound('goal');
    } else {
      this.playSound('up');
    }

    this.saveState();
    this.render();
  }

  resetCounter(id) {
    const counter = this.counters.find(c => c.id === id);
    if (!counter) return;

    this.showConfirmDialog(
      'Redefinir Contador',
      `Deseja zerar a contagem de "${counter.title}"?`,
      () => {
        counter.count = 0;
        counter.updatedAt = Date.now();
        this.playSound('down');
        this.saveState();
        this.render();
      }
    );
  }

  deleteCounter(id) {
    const counter = this.counters.find(c => c.id === id);
    if (!counter) return;

    this.showConfirmDialog(
      'Excluir Contador',
      `Tem certeza que deseja apagar permanentemente o contador "${counter.title}"?`,
      () => {
        this.counters = this.counters.filter(c => c.id !== id);
        this.playSound('down');
        this.saveState();
        this.render();
      }
    );
  }

  // ==========================================
  // Modal Handlers
  // ==========================================
  openCounterModal(counterId = null) {
    this.initAudio();
    if (counterId) {
      const counter = this.counters.find(c => c.id === counterId);
      if (!counter) return;
      this.modalTitle.textContent = 'Editar Contador';
      this.formCounterId.value = counter.id;
      this.formTitle.value = counter.title;
      this.formInitialValue.value = counter.count;
      this.formStep.value = counter.step || 1;
      this.formCategory.value = counter.category || '';
      this.formTarget.value = counter.target || '';
      this.selectedColor = counter.color || COLOR_THEMES[0].hex;
    } else {
      this.modalTitle.textContent = 'Novo Contador';
      this.formCounterId.value = '';
      this.counterForm.reset();
      this.formInitialValue.value = 0;
      this.formStep.value = 1;
      // Cycle initial color
      const randomColor = COLOR_THEMES[Math.floor(Math.random() * COLOR_THEMES.length)].hex;
      this.selectedColor = randomColor;
    }

    this.renderColorPicker();
    this.counterModal.classList.remove('hidden');
    setTimeout(() => this.formTitle.focus(), 50);
  }

  closeCounterModal() {
    this.counterModal.classList.add('hidden');
  }

  handleFormSubmit() {
    const id = this.formCounterId.value;
    const title = this.formTitle.value.trim();
    const count = parseInt(this.formInitialValue.value, 10) || 0;
    const step = Math.max(1, parseInt(this.formStep.value, 10) || 1);
    const category = this.formCategory.value.trim();
    const targetVal = parseInt(this.formTarget.value, 10);
    const target = isNaN(targetVal) || targetVal <= 0 ? null : targetVal;
    const color = this.selectedColor;

    if (!title) return;

    if (id) {
      // Edit existing
      const counter = this.counters.find(c => c.id === id);
      if (counter) {
        counter.title = title;
        counter.count = count;
        counter.step = step;
        counter.category = category;
        counter.target = target;
        counter.color = color;
        counter.updatedAt = Date.now();
      }
    } else {
      // Create new
      const newCounter = {
        id: 'cnt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title,
        count,
        step,
        category,
        target,
        color,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      // Place at front of list
      this.counters.unshift(newCounter);
    }

    this.playSound('up');
    this.saveState();
    this.closeCounterModal();
    this.render();
  }

  showConfirmDialog(title, message, actionCallback) {
    this.confirmTitle.textContent = title;
    this.confirmMessage.textContent = message;
    this.pendingConfirmAction = actionCallback;
    this.confirmModal.classList.remove('hidden');
  }

  closeConfirmModal() {
    this.confirmModal.classList.add('hidden');
    this.pendingConfirmAction = null;
  }

  // ==========================================
  // Backup / Export / Import
  // ==========================================
  exportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.counters, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `pulsecounters_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          this.counters = imported.map((item, idx) => ({
            id: item.id || 'cnt_' + Date.now() + '_' + idx,
            title: item.title || 'Contador',
            count: typeof item.count === 'number' ? item.count : 0,
            step: typeof item.step === 'number' ? item.step : 1,
            category: item.category || '',
            target: typeof item.target === 'number' ? item.target : null,
            color: item.color || COLOR_THEMES[0].hex,
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || Date.now()
          }));
          this.saveState();
          this.render();
          this.playSound('goal');
        } else {
          alert('Formato de arquivo inválido. O arquivo JSON deve conter uma lista de contadores.');
        }
      } catch (err) {
        alert('Erro ao carregar o arquivo JSON: ' + err.message);
      }
      this.importFileInput.value = '';
    };
    reader.readAsText(file);
  }

  // ==========================================
  // Drag & Drop Sorting
  // ==========================================
  attachDragEvents(cardEl, counterId) {
    cardEl.setAttribute('draggable', 'true');

    cardEl.addEventListener('dragstart', (e) => {
      this.draggedCounterId = counterId;
      cardEl.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', counterId);
    });

    cardEl.addEventListener('dragend', () => {
      cardEl.classList.remove('is-dragging');
      document.querySelectorAll('.counter-card').forEach(c => c.classList.remove('drag-over'));
      this.draggedCounterId = null;
    });

    cardEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (this.draggedCounterId && this.draggedCounterId !== counterId) {
        cardEl.classList.add('drag-over');
      }
    });

    cardEl.addEventListener('dragleave', () => {
      cardEl.classList.remove('drag-over');
    });

    cardEl.addEventListener('drop', (e) => {
      e.preventDefault();
      cardEl.classList.remove('drag-over');
      if (this.draggedCounterId && this.draggedCounterId !== counterId) {
        this.reorderCounters(this.draggedCounterId, counterId);
      }
    });
  }

  reorderCounters(sourceId, targetId) {
    const sourceIndex = this.counters.findIndex(c => c.id === sourceId);
    const targetIndex = this.counters.findIndex(c => c.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Move source to target position
    const [movedItem] = this.counters.splice(sourceIndex, 1);
    this.counters.splice(targetIndex, 0, movedItem);

    // Switch sort dropdown to custom
    this.sortBy = 'custom';
    this.sortSelect.value = 'custom';

    this.playSound('up');
    this.saveState();
    this.render();
  }

  // ==========================================
  // Filter & Sorting Logic
  // ==========================================
  getProcessedCounters() {
    let list = [...this.counters];

    // Filter by Category
    if (this.activeCategory !== 'all') {
      list = list.filter(c => (c.category || '').toLowerCase() === this.activeCategory.toLowerCase());
    }

    // Filter by Search Query
    if (this.searchQuery) {
      list = list.filter(c =>
        c.title.toLowerCase().includes(this.searchQuery) ||
        (c.category && c.category.toLowerCase().includes(this.searchQuery))
      );
    }

    // Sorting
    switch (this.sortBy) {
      case 'count-desc':
        list.sort((a, b) => b.count - a.count);
        break;
      case 'count-asc':
        list.sort((a, b) => a.count - b.count);
        break;
      case 'name-asc':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'name-desc':
        list.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'updated-desc':
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        break;
      case 'custom':
      default:
        // Maintains array order
        break;
    }

    return list;
  }

  // ==========================================
  // Rendering
  // ==========================================
  render() {
    this.renderCategoryTabs();
    this.renderCountersGrid();
    this.updateStats();
  }

  renderCategoryTabs() {
    // Collect unique categories
    const categories = new Set();
    this.counters.forEach(c => {
      if (c.category && c.category.trim()) {
        categories.add(c.category.trim());
      }
    });

    this.categoryTabs.innerHTML = '';

    // "Todos" Tab
    const allBtn = document.createElement('button');
    allBtn.className = `tab-btn ${this.activeCategory === 'all' ? 'active' : ''}`;
    allBtn.textContent = `Todos (${this.counters.length})`;
    allBtn.addEventListener('click', () => {
      this.activeCategory = 'all';
      this.render();
    });
    this.categoryTabs.appendChild(allBtn);

    categories.forEach(cat => {
      const countInCat = this.counters.filter(c => (c.category || '').toLowerCase() === cat.toLowerCase()).length;
      const tab = document.createElement('button');
      tab.className = `tab-btn ${this.activeCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`;
      tab.textContent = `${cat} (${countInCat})`;
      tab.addEventListener('click', () => {
        this.activeCategory = cat;
        this.render();
      });
      this.categoryTabs.appendChild(tab);
    });
  }

  renderCountersGrid() {
    const list = this.getProcessedCounters();
    this.countersGrid.innerHTML = '';

    if (list.length === 0) {
      this.emptyState.classList.remove('hidden');
      if (this.counters.length > 0) {
        this.emptyStateTitle.textContent = 'Nenhum resultado encontrado';
        this.emptyStateDesc.textContent = 'Nenhum contador corresponde à sua pesquisa ou filtro atual.';
        this.emptyStateAddBtn.classList.add('hidden');
      } else {
        this.emptyStateTitle.textContent = 'Nenhum contador adicionado';
        this.emptyStateDesc.textContent = 'Crie o seu primeiro contador manual para começar a monitorar suas metas!';
        this.emptyStateAddBtn.classList.remove('hidden');
      }
      return;
    }

    this.emptyState.classList.add('hidden');

    list.forEach(counter => {
      const card = this.createCounterCardElement(counter);
      this.countersGrid.appendChild(card);
    });
  }

  createCounterCardElement(counter) {
    const card = document.createElement('article');
    card.className = 'counter-card';
    card.id = `card_${counter.id}`;

    // Color theme styling
    const colorObj = COLOR_THEMES.find(t => t.hex === counter.color) || {
      hex: counter.color || '#6366f1',
      glow: 'rgba(99, 102, 241, 0.4)'
    };
    card.style.setProperty('--card-accent', colorObj.hex);
    card.style.setProperty('--card-accent-glow', colorObj.glow);

    // Header section
    const step = counter.step || 1;
    const hasTarget = counter.target && counter.target > 0;
    const progressPercent = hasTarget ? Math.min(100, Math.max(0, Math.round((counter.count / counter.target) * 100))) : 0;
    const isCompleted = hasTarget && counter.count >= counter.target;

    card.innerHTML = `
      <div class="counter-header">
        <div class="counter-drag-handle" title="Segure e arraste para reordenar" aria-label="Arrastar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5" r="1.2" fill="currentColor"></circle>
            <circle cx="9" cy="12" r="1.2" fill="currentColor"></circle>
            <circle cx="9" cy="19" r="1.2" fill="currentColor"></circle>
            <circle cx="15" cy="5" r="1.2" fill="currentColor"></circle>
            <circle cx="15" cy="12" r="1.2" fill="currentColor"></circle>
            <circle cx="15" cy="19" r="1.2" fill="currentColor"></circle>
          </svg>
        </div>

        <div class="counter-info">
          <h2 class="counter-title" title="${this.escapeHTML(counter.title)}">${this.escapeHTML(counter.title)}</h2>
          ${counter.category ? `<span class="counter-category">${this.escapeHTML(counter.category)}</span>` : ''}
        </div>

        <div class="counter-menu-actions">
          <button class="card-action-btn btn-reset-card" title="Zerar Contador" aria-label="Zerar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
          </button>
          <button class="card-action-btn btn-edit-card" title="Editar Configurações" aria-label="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="card-action-btn btn-delete-card" title="Excluir Contador" aria-label="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Main Number Display (Direct edit on click) -->
      <div class="counter-display" id="display_${counter.id}" title="Clique para digitar um valor diretamente">
        <span class="counter-value" id="val_${counter.id}">${counter.count}</span>
        <span class="counter-edit-hint">Clique para editar</span>
      </div>

      ${hasTarget ? `
        <div class="counter-progress-box">
          <div class="progress-labels">
            <span>Progresso: ${progressPercent}%</span>
            <span>Meta: ${counter.target}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${isCompleted ? 'goal-completed' : ''}" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      ` : ''}

      <!-- Main Count Action Controls -->
      <div class="counter-controls">
        <button class="btn-count-main minus" id="btnMinus_${counter.id}" aria-label="Diminuir ${step}">
          −
        </button>
        <button class="btn-count-main plus" id="btnPlus_${counter.id}" aria-label="Aumentar ${step}">
          +
        </button>
      </div>

      <!-- Quick Steps -->
      <div class="counter-quick-steps">
        <button class="btn-quick-step btn-step-m5" title="Subtrair 5">-5</button>
        <button class="btn-quick-step btn-step-m1" title="Subtrair 1">-1</button>
        <span class="counter-step-indicator" style="font-size:0.75rem; color:var(--text-dim);">Passo: ±${step}</span>
        <button class="btn-quick-step btn-step-p1" title="Adicionar 1">+1</button>
        <button class="btn-quick-step btn-step-p5" title="Adicionar 5">+5</button>
      </div>
    `;

    // Event Listeners for this card
    const displayEl = card.querySelector(`#display_${counter.id}`);
    displayEl.addEventListener('click', () => this.enterDirectEdit(counter.id));

    // Minus & Plus
    card.querySelector(`#btnMinus_${counter.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      this.increment(counter.id, -step);
    });

    card.querySelector(`#btnPlus_${counter.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      this.increment(counter.id, step);
    });

    // Secondary steps
    card.querySelector('.btn-step-m5').addEventListener('click', () => this.increment(counter.id, -5));
    card.querySelector('.btn-step-m1').addEventListener('click', () => this.increment(counter.id, -1));
    card.querySelector('.btn-step-p1').addEventListener('click', () => this.increment(counter.id, 1));
    card.querySelector('.btn-step-p5').addEventListener('click', () => this.increment(counter.id, 5));

    // Actions
    card.querySelector('.btn-reset-card').addEventListener('click', () => this.resetCounter(counter.id));
    card.querySelector('.btn-edit-card').addEventListener('click', () => this.openCounterModal(counter.id));
    card.querySelector('.btn-delete-card').addEventListener('click', () => this.deleteCounter(counter.id));

    // Enable Drag and Drop
    this.attachDragEvents(card, counter.id);

    return card;
  }

  // Direct Inline Value Edit
  enterDirectEdit(counterId) {
    const counter = this.counters.find(c => c.id === counterId);
    if (!counter) return;

    const displayContainer = document.getElementById(`display_${counterId}`);
    if (!displayContainer || displayContainer.querySelector('.counter-direct-input')) return;

    displayContainer.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'counter-direct-input';
    input.value = counter.count;

    displayContainer.appendChild(input);
    input.focus();
    input.select();

    const finishEdit = () => {
      const val = input.value;
      this.setCount(counterId, val);
    };

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.removeEventListener('blur', finishEdit);
        this.render();
      }
    });
  }

  // Animate single card without full re-render
  updateCardDOM(counterId, bumpClass) {
    const counter = this.counters.find(c => c.id === counterId);
    if (!counter) return;

    const valEl = document.getElementById(`val_${counterId}`);
    if (valEl) {
      valEl.textContent = counter.count;
      valEl.classList.remove('bump-up', 'bump-down');
      // Trigger reflow
      void valEl.offsetWidth;
      valEl.classList.add(bumpClass);
    }

    // Update progress bar if exists
    const card = document.getElementById(`card_${counterId}`);
    if (card && counter.target) {
      const progressPercent = Math.min(100, Math.max(0, Math.round((counter.count / counter.target) * 100)));
      const fillEl = card.querySelector('.progress-fill');
      const labelEl = card.querySelector('.progress-labels span:first-child');
      if (fillEl && labelEl) {
        fillEl.style.width = `${progressPercent}%`;
        labelEl.textContent = `Progresso: ${progressPercent}%`;
        if (counter.count >= counter.target) {
          fillEl.classList.add('goal-completed');
        } else {
          fillEl.classList.remove('goal-completed');
        }
      }
    }
  }

  updateStats() {
    const total = this.counters.length;
    let sum = 0;
    let max = { count: 0, title: '-' };
    let goals = 0;

    this.counters.forEach(c => {
      sum += c.count;
      if (c.count > max.count) {
        max = { count: c.count, title: c.title };
      }
      if (c.target && c.count >= c.target) {
        goals++;
      }
    });

    this.statTotalCounters.textContent = total;
    this.statTotalSum.textContent = sum.toLocaleString('pt-BR');
    this.statMaxCount.textContent = max.count.toLocaleString('pt-BR');
    this.statMaxName.textContent = max.title !== '-' ? max.title : '';
    this.statGoalsReached.textContent = goals;
  }

  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PulseCountersApp();
});
