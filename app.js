/**
 * Fitness Tracker - Core Logic
 * Modular structure: Storage | State | UI | Analytics | Events
 * Auto-saves to localStorage on any input change.
 */
const STORAGE_KEY = 'fittrack_pro_v1';

const App = {
  state: {
    days: [],
    logs: [],      // Strength history: { date, dayId, exId, sets, reps, weight, completed }
    cardioLogs: [],
    theme: 'dark'
  },
  chart: null,

  init() {
    this.loadState();
    this.renderAll();
    this.setupEvents();
    this.initChart();
    document.documentElement.setAttribute('data-theme', this.state.theme);
  },

  // ---------- STORAGE ----------
  loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      this.state = JSON.parse(saved);
    } else {
      this.setDefaultDays();
    }
  },
  saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.updateAnalytics(); // Trigger chart update on save
  },
  setDefaultDays() {
    this.state.days = [
      { id: 'push', name: 'Day 1 - Push', exercises: [
        { id: 'ex1', name: 'Flat Barbell Chest Press', target: 'Chest', sets: 3, reps: 10, weight: 60, done: false },
        { id: 'ex2', name: 'Overhead Dumbbell Press', target: 'Shoulders', sets: 3, reps: 10, weight: 20, done: false }
      ]},
      { id: 'pull', name: 'Day 2 - Pull', exercises: [
        { id: 'ex3', name: 'Barbell Rows', target: 'Back', sets: 4, reps: 8, weight: 60, done: false },
        { id: 'ex4', name: 'Lat Pulldowns', target: 'Lats', sets: 3, reps: 10, weight: 45, done: false }
      ]},
      { id: 'legs', name: 'Day 3 - Legs', exercises: [
        { id: 'ex5', name: 'Barbell Squats', target: 'Quads', sets: 4, reps: 8, weight: 80, done: false },
        { id: 'ex6', name: 'Romanian Deadlifts', target: 'Hamstrings', sets: 3, reps: 10, weight: 70, done: false }
      ]}
    ];
    this.saveState();
  },

  // ---------- UI RENDERING ----------
  renderAll() {
    this.renderDays();
    this.renderCardio();
    this.updateAnalytics();
  },

  renderDays() {
    const container = document.getElementById('days-grid');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${Math.min(this.state.days.length, 3)}, 1fr)`;

    this.state.days.forEach(day => {
      const dayCard = document.createElement('div');
      dayCard.className = 'section-card';
      dayCard.innerHTML = `
        <div class="day-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 contenteditable="true" data-id="${day.id}" class="day-name">${day.name}</h3>
          <div>
            <button class="btn btn-secondary btn-sm" data-action="quick-add" data-day="${day.id}">+ Quick Add</button>
            <button class="btn btn-secondary btn-sm" data-action="duplicate-day" data-day="${day.id}">📋 Duplicate</button>
            <button class="btn btn-danger btn-sm" data-action="delete-day" data-day="${day.id}">🗑️</button>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="workout-table" data-day="${day.id}">
            <thead>
              <tr>
                <th width="50">Log</th>
                <th>Exercise</th>
                <th>Target</th>
                <th>Sets</th>
                <th>Reps</th>
                <th>Weight (kg)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${day.exercises.map(ex => `
                <tr data-ex="${ex.id}">
                  <td data-label="Log">
                    <input type="checkbox" class="log-toggle" data-ex="${ex.id}" data-day="${day.id}" ${ex.done ? 'checked' : ''}>
                  </td>
                  <td data-label="Exercise"><input type="text" value="${ex.name}" data-ex="${ex.id}" data-field="name" data-day="${day.id}"></td>
                  <td data-label="Target"><input type="text" value="${ex.target}" data-ex="${ex.id}" data-field="target" data-day="${day.id}"></td>
                  <td data-label="Sets"><input type="number" value="${ex.sets}" data-ex="${ex.id}" data-field="sets" data-day="${day.id}"></td>
                  <td data-label="Reps"><input type="number" value="${ex.reps}" data-ex="${ex.id}" data-field="reps" data-day="${day.id}"></td>
                  <td data-label="Weight"><input type="number" value="${ex.weight}" data-ex="${ex.id}" data-field="weight" data-day="${day.id}"></td>
                  <td data-label="Action"><button class="btn btn-danger btn-sm" data-action="delete-ex" data-day="${day.id}" data-ex="${ex.id}">×</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      container.appendChild(dayCard);
    });
  },

  renderCardio() {
    const list = document.getElementById('cardio-list');
    list.innerHTML = '';
    this.state.cardioLogs.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach((log, i) => {
      list.innerHTML += `
        <div class="cardio-entry">
          <span>🗓️ ${log.date} | 🏃 ${log.type}</span>
          <span>⏱️ ${log.duration}min | 📏 ${log.distance || '-'}km | 🔥 ${log.calories || '-'}cal</span>
        </div>`;
    });
    if (this.state.cardioLogs.length === 0) list.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">No cardio logs yet.</p>';
  },

  updateAnalytics() {
    // Calculate last 7 days volume
    const today = new Date();
    const dates = [];
    const volumes = [];
    let totalWeekVol = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      
      let dayVol = 0;
      this.state.logs.forEach(log => {
        if (log.date === dateStr && log.completed) {
          dayVol += (log.sets * log.reps * log.weight);
        }
      });
      totalWeekVol += dayVol;
      volumes.push(dayVol);
    }

    document.getElementById('analytics-summary').innerHTML = `
      <div class="stat-box">
        <div class="stat-value">${totalWeekVol.toLocaleString()}</div>
        <div class="stat-label">Total Volume (7d)</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${this.state.logs.length}</div>
        <div class="stat-label">Total Entries</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${this.state.days.length}</div>
        <div class="stat-label">Workout Days</div>
      </div>
    `;

    this.chart.data.labels = dates;
    this.chart.data.datasets[0].data = volumes;
    this.chart.update();
  },

  initChart() {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Training Volume (kg)',
          data: [],
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#2d313a' }, ticks: { color: '#8b949e' } },
          y: { grid: { color: '#2d313a' }, ticks: { color: '#8b949e' } }
        }
      }
    });
  },

  // ---------- EVENTS ----------
  setupEvents() {
    // Event Delegation for all interactive elements
    document.addEventListener('input', (e) => {
      if (e.target.matches('input[type="text"], input[type="number"]')) {
        const { day, ex, field } = e.target.dataset;
        if (day && ex && field) {
          const dayRef = this.state.days.find(d => d.id === day);
          const exRef = dayRef.exercises.find(e => e.id === ex);
          exRef[field] = field === 'name' || field === 'target' ? e.target.value : Number(e.target.value) || 0;
          this.saveState();
        }
      }
      if (e.target.matches('.day-name')) {
        const dayRef = this.state.days.find(d => d.id === e.target.dataset.id);
        if (dayRef) dayRef.name = e.target.innerText;
        this.saveState();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.matches('.log-toggle')) {
        const { day, ex } = e.target.dataset;
        const isDone = e.target.checked;
        const dayRef = this.state.days.find(d => d.id === day);
        const exRef = dayRef.exercises.find(e => e.id === ex);
        exRef.done = isDone;
        
        if (isDone) {
          // Log to history
          const log = {
            date: new Date().toISOString().split('T')[0],
            dayId: day,
            exId: ex,
            name: exRef.name,
            sets: exRef.sets,
            reps: exRef.reps,
            weight: exRef.weight,
            completed: true
          };
          this.state.logs.push(log);
        } else {
          // Remove today's log entry for this exercise
          const today = new Date().toISOString().split('T')[0];
          this.state.logs = this.state.logs.filter(l => !(l.date === today && l.dayId === day && l.exId === ex));
        }
        this.saveState();
      }
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const dayId = btn.dataset.day;

      if (action === 'delete-day') {
        this.state.days = this.state.days.filter(d => d.id !== dayId);
        this.renderAll();
      }
      if (action === 'duplicate-day') {
        const src = this.state.days.find(d => d.id === dayId);
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = `day_${Date.now()}`;
        copy.name = `${copy.name} (Copy)`;
        this.state.days.push(copy);
        this.renderAll();
      }
      if (action === 'quick-add') {
        document.getElementById('quick-add-target-day').value = dayId;
        document.getElementById('quick-add-modal').showModal();
      }
      if (action === 'delete-ex') {
        const dayRef = this.state.days.find(d => d.id === dayId);
        dayRef.exercises = dayRef.exercises.filter(e => e.id !== btn.dataset.ex);
        this.renderAll();
      }
    });

    document.getElementById('btn-add-day').addEventListener('click', () => {
      const id = `day_${Date.now()}`;
      this.state.days.push({ id, name: `Day ${this.state.days.length + 1}`, exercises: [] });
      this.renderAll();
    });

    document.getElementById('btn-theme').addEventListener('click', (e) => {
      this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', this.state.theme);
      e.target.innerText = this.state.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
      this.saveState();
    });

    // Cardio Form
    document.getElementById('cardio-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      this.state.cardioLogs.push({
        date: new Date().toISOString().split('T')[0],
        type: fd.get('type'),
        duration: Number(fd.get('duration')),
        distance: fd.get('distance') ? Number(fd.get('distance')) : null,
        calories: fd.get('calories') ? Number(fd.get('calories')) : null
      });
      e.target.reset();
      this.renderCardio();
      this.saveState();
    });

    // Quick Add Form
    document.getElementById('quick-add-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const dayId = document.getElementById('quick-add-target-day').value;
      const dayRef = this.state.days.find(d => d.id === dayId);
      dayRef.exercises.push({
        id: `ex_${Date.now()}`,
        name: document.getElementById('ex-name').value,
        target: document.getElementById('ex-target').value,
        sets: Number(document.getElementById('ex-sets').value),
        reps: Number(document.getElementById('ex-reps').value),
        weight: Number(document.getElementById('ex-weight').value) || 0,
        done: false
      });
      e.target.reset();
      document.getElementById('quick-add-modal').close();
      this.renderAll();
    });
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
