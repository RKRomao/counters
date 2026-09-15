/**
 * PulseCounters - Enterprise Dynamic Counters Web App
 * State management, Dual Theme (Light/Dark), Data Table & Grid Views,
 * Drag & Drop, Web Audio synthesizer, and local storage.
 */

// Corporate Color Palette for Counters
const COLOR_THEMES = [
  { name: 'Azul Corporativo', hex: '#2563eb', glow: 'rgba(37, 99, 235, 0.25)' },
  { name: 'Grafite Ardósia', hex: '#64748b', glow: 'rgba(100, 116, 139, 0.25)' },
  { name: 'Esmeralda Operacional', hex: '#059669', glow: 'rgba(5, 150, 105, 0.25)' },
  { name: 'Âmbar Executivo', hex: '#d97706', glow: 'rgba(217, 119, 6, 0.25)' },
  { name: 'Borgonha', hex: '#be123c', glow: 'rgba(190, 18, 60, 0.25)' },
  { name: 'Azul Petróleo', hex: '#0284c7', glow: 'rgba(2, 132, 199, 0.25)' }
];

// Initial Seed Data (Corporate metrics defaults)
const DEFAULT_COUNTERS = [
  {
    id: 'cnt_1',
    title: 'Copos de Água 💧',
    count: 5,
    step: 1,
    category: 'Saúde',
    target: 8,
    color: '#0284c7',
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
    color: '#2563eb',
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
    color: '#059669',
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
    color: '#64748b',
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 300000
  }
];

class PulseCountersApp {
  constructor() {
    this.counters = [];
    this.soundEnabled = true;
    this.theme = 'light'; // Default to clean corporate light
    this.viewMode = 'grid'; // 'grid' or 'table'
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'custom';
    this.selectedColor = COLOR_THEMES[0].hex;
    this.draggedCounterId = null;
    this.focusMode = false;

    // Audio Context (Synthesizer)
    this.audioCtx = null;

    // Pending Confirmation Callback
    this.pendingConfirmAction = null;

    this.init();
  }

  init() {
    this.loadState();
    this.initDOMElements();
    this.applyTheme();
    this.renderColorPicker();
    this.bindEvents();
    this.render();
  }

  // ==========================================
  // State & LocalStorage
  // ==========================================
  loadState() {
    try {
      // Load Theme preference
      const storedTheme = localStorage.getItem('pulse_counters_theme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        this.theme = storedTheme;
      }

      // Load View preference
      const storedView = localStorage.getItem('pulse_counters_view');
      if (storedView === 'table' || storedView === 'grid') {
        this.viewMode = storedView;
      }

      const stored = localStorage.getItem('pulse_counters_data');
      if (stored) {
        this.counters = JSON.parse(stored);
      } else {
        this.counters = [...DEFAULT_COUNTERS];
        this.saveState();
      }

      // Auto-migrate legacy bright colors to corporate palette
      const LEGACY_COLOR_MAP = {
        '#6366f1': '#2563eb',
        '#a855f7': '#64748b',
        '#f43f5e': '#be123c',
        '#06b6d4': '#0284c7',
        '#10b981': '#059669',
        '#f59e0b': '#d97706'
      };
      this.counters.forEach(c => {
        if (LEGACY_COLOR_MAP[c.color]) {
          c.color = LEGACY_COLOR_MAP[c.color];
        }
      });

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
      localStorage.setItem('pulse_counters_theme', this.theme);
      localStorage.setItem('pulse_counters_view', this.viewMode);
    } catch (e) {
      console.error('Erro ao salvar dados no LocalStorage:', e);
    }
  }

  // ==========================================
  // Theme Management (Light vs Dark)
  // ==========================================
  applyTheme() {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(this.theme === 'dark' ? 'theme-dark' : 'theme-light');
    if (this.focusMode) {
      document.body.classList.add('focus-mode');
    }

    if (this.themeIconSun && this.themeIconMoon && this.themeBtnLabel) {
      if (this.theme === 'dark') {
        this.themeIconSun.classList.add('hidden');
        this.themeIconMoon.classList.remove('hidden');
        this.themeBtnLabel.textContent = 'Modo Escuro';
      } else {
        this.themeIconSun.classList.remove('hidden');
        this.themeIconMoon.classList.add('hidden');
        this.themeBtnLabel.textContent = 'Modo Claro';
      }
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.saveState();
    this.applyTheme();
    this.playSound('up');
  }

  setViewMode(mode) {
    if (mode !== 'grid' && mode !== 'table') return;
    this.viewMode = mode;
    this.saveState();

    if (this.viewGridBtn && this.viewTableBtn) {
      this.viewGridBtn.classList.toggle('active', mode === 'grid');
      this.viewTableBtn.classList.toggle('active', mode === 'table');
    }

    this.render();
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
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'down') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'goal') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const noteOsc = this.audioCtx.createOscillator();
          const noteGain = this.audioCtx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(this.audioCtx.destination);

          const startTime = now + (idx * 0.06);
          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(freq, startTime);
          noteGain.gain.setValueAtTime(0.15, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

          noteOsc.start(startTime);
          noteOsc.stop(startTime + 0.16);
        });
      }
    } catch (err) {
      console.warn('Áudio indisponível:', err);
    }
  }

  // ==========================================
  // DOM Elements Initialization
  // ==========================================
  initDOMElements() {
    this.countersGrid = document.getElementById('countersGrid');
    this.countersTableContainer = document.getElementById('countersTableContainer');
    this.countersTableBody = document.getElementById('countersTableBody');
    this.emptyState = document.getElementById('emptyState');
    this.emptyStateTitle = document.getElementById('emptyStateTitle');
    this.emptyStateDesc = document.getElementById('emptyStateDesc');

    // Theme & View Controls
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.themeIconSun = document.getElementById('themeIconSun');
    this.themeIconMoon = document.getElementById('themeIconMoon');
    this.themeBtnLabel = document.getElementById('themeBtnLabel');
    this.viewGridBtn = document.getElementById('viewGridBtn');
    this.viewTableBtn = document.getElementById('viewTableBtn');

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
    this.focusModeBtn = document.getElementById('focusModeBtn');
    this.exitFocusFloatingBtn = document.getElementById('exitFocusFloatingBtn');

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

    if (this.viewGridBtn && this.viewTableBtn) {
      this.viewGridBtn.classList.toggle('active', this.viewMode === 'grid');
      this.viewTableBtn.classList.toggle('active', this.viewMode === 'table');
    }
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
    // Theme Toggle
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    // View Mode Toggle
    if (this.viewGridBtn) {
      this.viewGridBtn.addEventListener('click', () => this.setViewMode('grid'));
    }
    if (this.viewTableBtn) {
      this.viewTableBtn.addEventListener('click', () => this.setViewMode('table'));
    }

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

    // Focus Mode
    if (this.focusModeBtn) {
      this.focusModeBtn.addEventListener('click', () => this.toggleFocusMode());
    }
    if (this.exitFocusFloatingBtn) {
      this.exitFocusFloatingBtn.addEventListener('click', () => this.toggleFocusMode(false));
    }

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCounterModal();
        this.closeConfirmModal();
        if (this.focusMode) {
          this.toggleFocusMode(false);
        }
      }
    });
  }

  // ==========================================
  // Focus Mode
  // ==========================================
  toggleFocusMode(forceState = null) {
    this.focusMode = forceState !== null ? forceState : !this.focusMode;
    document.body.classList.toggle('focus-mode', this.focusMode);
    
    if (this.exitFocusFloatingBtn) {
      this.exitFocusFloatingBtn.classList.toggle('hidden', !this.focusMode);
    }
    if (this.focusModeBtn) {
      this.focusModeBtn.classList.toggle('active', this.focusMode);
    }

    this.playSound(this.focusMode ? 'goal' : 'up');
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
      `Tem certeza que deseja excluir o contador "${counter.title}"?`,
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
      this.selectedColor = COLOR_THEMES[0].hex;
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
  attachDragEvents(el, counterId) {
    el.setAttribute('draggable', 'true');

    el.addEventListener('dragstart', (e) => {
      this.draggedCounterId = counterId;
      el.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', counterId);
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('is-dragging');
      document.querySelectorAll('.counter-card, .corp-table-row').forEach(c => c.classList.remove('drag-over'));
      this.draggedCounterId = null;
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (this.draggedCounterId && this.draggedCounterId !== counterId) {
        el.classList.add('drag-over');
      }
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (this.draggedCounterId && this.draggedCounterId !== counterId) {
        this.reorderCounters(this.draggedCounterId, counterId);
      }
    });
  }

  reorderCounters(sourceId, targetId) {
    const sourceIndex = this.counters.findIndex(c => c.id === sourceId);
    const targetIndex = this.counters.findIndex(c => c.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [movedItem] = this.counters.splice(sourceIndex, 1);
    this.counters.splice(targetIndex, 0, movedItem);

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

    if (this.activeCategory !== 'all') {
      list = list.filter(c => (c.category || '').toLowerCase() === this.activeCategory.toLowerCase());
    }

    if (this.searchQuery) {
      list = list.filter(c =>
        c.title.toLowerCase().includes(this.searchQuery) ||
        (c.category && c.category.toLowerCase().includes(this.searchQuery))
      );
    }

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
        break;
    }

    return list;
  }

  // ==========================================
  // Rendering
  // ==========================================
  render() {
    this.renderCategoryTabs();

    const list = this.getProcessedCounters();
    const hasItems = list.length > 0;

    if (!hasItems) {
      this.countersGrid.classList.add('hidden');
      this.countersTableContainer.classList.add('hidden');
      this.emptyState.classList.remove('hidden');

      if (this.counters.length > 0) {
        this.emptyStateTitle.textContent = 'Nenhum resultado encontrado';
        this.emptyStateDesc.textContent = 'Nenhum contador corresponde à sua pesquisa ou filtro atual.';
        this.emptyStateAddBtn.classList.add('hidden');
      } else {
        this.emptyStateTitle.textContent = 'Nenhum contador adicionado';
        this.emptyStateDesc.textContent = 'Crie o seu primeiro indicador para começar a monitorar suas métricas corporativas!';
        this.emptyStateAddBtn.classList.remove('hidden');
      }
      this.updateStats();
      return;
    }

    this.emptyState.classList.add('hidden');

    if (this.viewMode === 'grid') {
      this.countersTableContainer.classList.add('hidden');
      this.countersGrid.classList.remove('hidden');
      this.renderCountersGrid(list);
    } else {
      this.countersGrid.classList.add('hidden');
      this.countersTableContainer.classList.remove('hidden');
      this.renderCountersTable(list);
    }

    this.updateStats();
  }

  renderCategoryTabs() {
    const categories = new Set();
    this.counters.forEach(c => {
      if (c.category && c.category.trim()) {
        categories.add(c.category.trim());
      }
    });

    this.categoryTabs.innerHTML = '';

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

  renderCountersGrid(list) {
    this.countersGrid.innerHTML = '';
    list.forEach(counter => {
      const card = this.createCounterCardElement(counter);
      this.countersGrid.appendChild(card);
    });
  }

  createCounterCardElement(counter) {
    const card = document.createElement('article');
    card.className = 'counter-card';
    card.id = `card_${counter.id}`;

    const colorObj = COLOR_THEMES.find(t => t.hex === counter.color) || {
      hex: counter.color || '#2563eb',
      glow: 'rgba(37, 99, 235, 0.25)'
    };
    card.style.setProperty('--card-accent', colorObj.hex);

    const step = counter.step || 1;
    const hasTarget = counter.target && counter.target > 0;
    const progressPercent = hasTarget ? Math.min(100, Math.max(0, Math.round((counter.count / counter.target) * 100))) : 0;
    const isCompleted = hasTarget && counter.count >= counter.target;

    card.innerHTML = `
      <div class="card-accent-bar" style="background-color: ${colorObj.hex};"></div>

      <div class="counter-header">
        <div class="counter-header-left">
          <div class="counter-drag-handle" title="Arrastar para reordenar" aria-label="Arrastar">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="6" r="1.2" fill="currentColor"></circle>
              <circle cx="9" cy="12" r="1.2" fill="currentColor"></circle>
              <circle cx="9" cy="18" r="1.2" fill="currentColor"></circle>
              <circle cx="15" cy="6" r="1.2" fill="currentColor"></circle>
              <circle cx="15" cy="12" r="1.2" fill="currentColor"></circle>
              <circle cx="15" cy="18" r="1.2" fill="currentColor"></circle>
            </svg>
          </div>

          <div class="counter-info">
            <h2 class="counter-title" title="${this.escapeHTML(counter.title)}">${this.escapeHTML(counter.title)}</h2>
            ${counter.category ? `<span class="counter-category">${this.escapeHTML(counter.category)}</span>` : ''}
          </div>
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

      <div class="counter-metric-row">
        <div class="counter-display" id="display_${counter.id}" title="Clique para editar valor">
          <span class="counter-value" id="val_${counter.id}">${counter.count}</span>
          <span class="counter-edit-hint">Editar</span>
        </div>

        <div class="counter-controls">
          <button class="btn-count-main minus" id="btnMinus_${counter.id}" aria-label="Diminuir ${step}">−</button>
          <button class="btn-count-main plus" id="btnPlus_${counter.id}" aria-label="Aumentar ${step}">+</button>
        </div>
      </div>

      ${hasTarget ? `
        <div class="counter-progress-box">
          <div class="progress-labels">
            <span class="progress-percent-badge ${isCompleted ? 'status-done' : ''}">
              ${isCompleted ? '✓ Concluído' : `Progresso: ${progressPercent}%`}
            </span>
            <span class="progress-target-label">Meta: <strong>${counter.target}</strong></span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${isCompleted ? 'goal-completed' : ''}" style="width: ${progressPercent}%; background-color: ${colorObj.hex};"></div>
          </div>
        </div>
      ` : ''}

      <div class="counter-quick-steps">
        <div class="quick-step-group">
          <button class="btn-quick-step btn-step-m5" title="Subtrair 5">-5</button>
          <button class="btn-quick-step btn-step-m1" title="Subtrair 1">-1</button>
        </div>
        <span class="counter-step-indicator">Passo: ±${step}</span>
        <div class="quick-step-group">
          <button class="btn-quick-step btn-step-p1" title="Adicionar 1">+1</button>
          <button class="btn-quick-step btn-step-p5" title="Adicionar 5">+5</button>
        </div>
      </div>
    `;

    // Direct edit
    card.querySelector(`#display_${counter.id}`).addEventListener('click', () => this.enterDirectEdit(counter.id));

    // Stepper
    card.querySelector(`#btnMinus_${counter.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      this.increment(counter.id, -step);
    });

    card.querySelector(`#btnPlus_${counter.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      this.increment(counter.id, step);
    });

    // Quick steps
    card.querySelector('.btn-step-m5').addEventListener('click', () => this.increment(counter.id, -5));
    card.querySelector('.btn-step-m1').addEventListener('click', () => this.increment(counter.id, -1));
    card.querySelector('.btn-step-p1').addEventListener('click', () => this.increment(counter.id, 1));
    card.querySelector('.btn-step-p5').addEventListener('click', () => this.increment(counter.id, 5));

    // Actions
    card.querySelector('.btn-reset-card').addEventListener('click', () => this.resetCounter(counter.id));
    card.querySelector('.btn-edit-card').addEventListener('click', () => this.openCounterModal(counter.id));
    card.querySelector('.btn-delete-card').addEventListener('click', () => this.deleteCounter(counter.id));

    this.attachDragEvents(card, counter.id);
    return card;
  }

  // ==========================================
  // Visualização 2: Tabela Corporativa (Table View)
  // ==========================================
  renderCountersTable(list) {
    this.countersTableBody.innerHTML = '';

    list.forEach(counter => {
      const row = this.createCounterTableRow(counter);
      this.countersTableBody.appendChild(row);
    });
  }

  createCounterTableRow(counter) {
    const row = document.createElement('tr');
    row.className = 'corp-table-row';
    row.id = `row_${counter.id}`;

    const colorObj = COLOR_THEMES.find(t => t.hex === counter.color) || {
      hex: counter.color || '#2563eb'
    };

    const step = counter.step || 1;
    const hasTarget = counter.target && counter.target > 0;
    const progressPercent = hasTarget ? Math.min(100, Math.max(0, Math.round((counter.count / counter.target) * 100))) : 0;
    const isCompleted = hasTarget && counter.count >= counter.target;

    row.innerHTML = `
      <td style="text-align: center; width: 40px;">
        <div class="counter-drag-handle" title="Arrastar">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="6" r="1.2" fill="currentColor"></circle>
            <circle cx="9" cy="12" r="1.2" fill="currentColor"></circle>
            <circle cx="9" cy="18" r="1.2" fill="currentColor"></circle>
            <circle cx="15" cy="6" r="1.2" fill="currentColor"></circle>
            <circle cx="15" cy="12" r="1.2" fill="currentColor"></circle>
            <circle cx="15" cy="18" r="1.2" fill="currentColor"></circle>
          </svg>
        </div>
      </td>
      <td>
        <div class="table-counter-title-group">
          <span class="table-color-dot" style="background-color: ${colorObj.hex};"></span>
          <span class="table-counter-title" title="${this.escapeHTML(counter.title)}">${this.escapeHTML(counter.title)}</span>
        </div>
      </td>
      <td>
        ${counter.category ? `<span class="counter-category">${this.escapeHTML(counter.category)}</span>` : '<span style="color:var(--text-dim);">-</span>'}
      </td>
      <td style="text-align: center;">
        <button class="table-val-btn" id="display_table_${counter.id}" title="Clique para editar valor">
          <strong id="val_table_${counter.id}">${counter.count}</strong>
        </button>
      </td>
      <td>
        ${hasTarget ? `
          <div class="table-progress-wrap">
            <div class="progress-track" style="height: 6px; width: 100px;">
              <div class="progress-fill ${isCompleted ? 'goal-completed' : ''}" style="width: ${progressPercent}%; background-color: ${colorObj.hex};"></div>
            </div>
            <span class="table-progress-text">${progressPercent}% (${counter.target})</span>
          </div>
        ` : '<span style="color:var(--text-dim); font-size:0.8rem;">Sem meta</span>'}
      </td>
      <td style="text-align: center;">
        <div class="table-stepper">
          <button class="table-btn-step minus" id="btnTableMinus_${counter.id}" title="Diminuir ${step}">−</button>
          <button class="table-btn-step plus" id="btnTablePlus_${counter.id}" title="Aumentar ${step}">+</button>
        </div>
      </td>
      <td style="text-align: right;">
        <div class="counter-menu-actions" style="justify-content: flex-end;">
          <button class="card-action-btn btn-reset-table" title="Zerar" aria-label="Zerar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
          </button>
          <button class="card-action-btn btn-edit-table" title="Editar" aria-label="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="card-action-btn btn-delete-table" title="Excluir" aria-label="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    // Direct edit in table
    row.querySelector(`#display_table_${counter.id}`).addEventListener('click', () => this.enterDirectEdit(counter.id));

    // Stepper
    row.querySelector(`#btnTableMinus_${counter.id}`).addEventListener('click', () => this.increment(counter.id, -step));
    row.querySelector(`#btnTablePlus_${counter.id}`).addEventListener('click', () => this.increment(counter.id, step));

    // Actions
    row.querySelector('.btn-reset-table').addEventListener('click', () => this.resetCounter(counter.id));
    row.querySelector('.btn-edit-table').addEventListener('click', () => this.openCounterModal(counter.id));
    row.querySelector('.btn-delete-table').addEventListener('click', () => this.deleteCounter(counter.id));

    this.attachDragEvents(row, counter.id);
    return row;
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

  // Update card and table without full re-render
  updateCardDOM(counterId, bumpClass) {
    const counter = this.counters.find(c => c.id === counterId);
    if (!counter) return;

    // Card View update
    const valEl = document.getElementById(`val_${counterId}`);
    if (valEl) {
      valEl.textContent = counter.count;
      valEl.classList.remove('bump-up', 'bump-down');
      void valEl.offsetWidth;
      valEl.classList.add(bumpClass);
    }

    const card = document.getElementById(`card_${counterId}`);
    if (card && counter.target) {
      const progressPercent = Math.min(100, Math.max(0, Math.round((counter.count / counter.target) * 100)));
      const fillEl = card.querySelector('.progress-fill');
      const badgeEl = card.querySelector('.progress-percent-badge');
      if (fillEl && badgeEl) {
        fillEl.style.width = `${progressPercent}%`;
        if (counter.count >= counter.target) {
          fillEl.classList.add('goal-completed');
          badgeEl.classList.add('status-done');
          badgeEl.textContent = '✓ Concluído';
        } else {
          fillEl.classList.remove('goal-completed');
          badgeEl.classList.remove('status-done');
          badgeEl.textContent = `Progresso: ${progressPercent}%`;
        }
      }
    }

    // Table View update
    const valTableEl = document.getElementById(`val_table_${counterId}`);
    if (valTableEl) {
      valTableEl.textContent = counter.count;
    }

    const row = document.getElementById(`row_${counterId}`);
    if (row && counter.target) {
      const progressPercent = Math.min(100, Math.max(0, Math.round((counter.count / counter.target) * 100)));
      const fillEl = row.querySelector('.progress-fill');
      const textEl = row.querySelector('.table-progress-text');
      if (fillEl && textEl) {
        fillEl.style.width = `${progressPercent}%`;
        textEl.textContent = `${progressPercent}% (${counter.target})`;
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
