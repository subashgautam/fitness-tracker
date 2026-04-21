/**
 * IRONLOG — Fitness Tracker
 * Single-file vanilla JS app with modular structure
 * Sections: Storage → State → Utils → UI → Workout → Cardio → Charts → Dashboard → Init
 */

/* ══════════════════════════════════════════════════
   SECTION 1: STORAGE (localStorage abstraction)
   ══════════════════════════════════════════════════ */
const Storage = {
  KEY_DAYS: 'ironlog_days',
  KEY_LOGS: 'ironlog_workout_logs',
  KEY_CARDIO: 'ironlog_cardio',

  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; }
    catch { return null; }
  },
  set(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (e) { console.error('Storage write failed:', e); }
  },

  getDays()     { return this.get(this.KEY_DAYS) || defaultDays(); },
  setDays(d)    { this.set(this.KEY_DAYS, d); },

  getLogs()     { return this.get(this.KEY_LOGS) || []; },
  setLogs(l)    { this.set(this.KEY_LOGS, l); },

  getCardio()   { return this.get(this.KEY_CARDIO) || []; },
  setCardio(c)  { this.set(this.KEY_CARDIO, c); },

  /** Save current day state as a workout log snapshot */
  logWorkout(dayId, dayName, exercises, date) {
    const logs = this.getLogs();
    const snapshot = {
      id: uid(),
      dayId,
      dayName,
      date: date || todayStr(),
      exercises: exercises.map(ex => ({
        name: ex.name,
        target: ex.target,
        sets: ex.sets.map(s => ({ ...s })),
        completed: ex.completed,
      })),
      volume: calcDayVolume(exercises),
      savedAt: new Date().toISOString(),
    };
    // Upsert: replace today's log for this dayId if it exists
    const idx = logs.findIndex(l => l.dayId === dayId && l.date === snapshot.date);
    if (idx >= 0) logs[idx] = snapshot; else logs.push(snapshot);
    this.setLogs(logs);
  },
};

/* ══════════════════════════════════════════════════
   SECTION 2: DEFAULT DATA & STATE
   ══════════════════════════════════════════════════ */
function defaultDays() {
  return [
    {
      id: 'day1',
      name: 'Day 1 — Push',
      exercises: [
        mkEx('Bench Press', 'Chest', [
          { reps: 10, weight: 60 }, { reps: 8, weight: 65 }, { reps: 6, weight: 70 }
        ]),
        mkEx('Overhead Press', 'Shoulders', [
          { reps: 10, weight: 40 }, { reps: 8, weight: 42.5 }, { reps: 8, weight: 42.5 }
        ]),
        mkEx('Incline Dumbbell Press', 'Upper Chest', [
          { reps: 12, weight: 24 }, { reps: 10, weight: 26 }, { reps: 10, weight: 26 }
        ]),
        mkEx('Lateral Raises', 'Side Delts', [
          { reps: 15, weight: 10 }, { reps: 15, weight: 10 }, { reps: 12, weight: 10 }
        ]),
        mkEx('Tricep Pushdown', 'Triceps', [
          { reps: 12, weight: 30 }, { reps: 12, weight: 32.5 }, { reps: 10, weight: 35 }
        ]),
      ],
    },
    {
      id: 'day2',
      name: 'Day 2 — Pull',
      exercises: [
        mkEx('Deadlift', 'Back/Hamstrings', [
          { reps: 5, weight: 100 }, { reps: 5, weight: 110 }, { reps: 3, weight: 120 }
        ]),
        mkEx('Pull-ups', 'Lats', [
          { reps: 8, weight: 0 }, { reps: 7, weight: 0 }, { reps: 6, weight: 0 }
        ]),
        mkEx('Barbell Row', 'Mid Back', [
          { reps: 10, weight: 60 }, { reps: 8, weight: 65 }, { reps: 8, weight: 65 }
        ]),
        mkEx('Face Pulls', 'Rear Delts', [
          { reps: 15, weight: 20 }, { reps: 15, weight: 20 }, { reps: 15, weight: 20 }
        ]),
        mkEx('Bicep Curls', 'Biceps', [
          { reps: 12, weight: 14 }, { reps: 10, weight: 16 }, { reps: 10, weight: 16 }
        ]),
      ],
    },
    {
      id: 'day3',
      name: 'Day 3 — Legs',
      exercises: [
        mkEx('Squat', 'Quads/Glutes', [
          { reps: 8, weight: 80 }, { reps: 8, weight: 85 }, { reps: 6, weight: 90 }
        ]),
        mkEx('Romanian Deadlift', 'Hamstrings', [
          { reps: 10, weight: 70 }, { reps: 10, weight: 72.5 }, { reps: 8, weight: 75 }
        ]),
        mkEx('Leg Press', 'Quads', [
          { reps: 12, weight: 120 }, { reps: 10, weight: 130 }, { reps: 10, weight: 130 }
        ]),
        mkEx('Leg Curl', 'Hamstrings', [
          { reps: 12, weight: 40 }, { reps: 12, weight: 42.5 }, { reps: 10, weight: 45 }
        ]),
        mkEx('Calf Raises', 'Calves', [
          { reps: 15, weight: 60 }, { reps: 15, weight: 60 }, { reps: 15, weight: 60 }
        ]),
      ],
    },
  ];
}

function mkEx(name, target, sets) {
  return {
    id: uid(),
    name,
    target,
    completed: false,
    sets: sets.map(s => ({ id: uid(), reps: s.reps, weight: s.weight })),
  };
}

/** Application state (mirrors localStorage, kept in sync) */
const State = {
  days: [],
  activeDayId: null,
  charts: {},

  init() {
    this.days = Storage.getDays();
    this.activeDayId = this.days[0]?.id || null;
  },

  save() {
    Storage.setDays(this.days);
  },

  getDay(id) { return this.days.find(d => d.id === id); },

  addDay(name) {
    const day = { id: uid(), name: name || `Day ${this.days.length + 1}`, exercises: [] };
    this.days.push(day);
    this.save();
    return day;
  },

  removeDay(id) {
    this.days = this.days.filter(d => d.id !== id);
    if (this.activeDayId === id) this.activeDayId = this.days[0]?.id || null;
    this.save();
  },

  addExercise(dayId, ex) {
    const day = this.getDay(dayId);
    if (!day) return;
    day.exercises.push(ex);
    this.save();
  },

  removeExercise(dayId, exId) {
    const day = this.getDay(dayId);
    if (!day) return;
    day.exercises = day.exercises.filter(e => e.id !== exId);
    this.save();
  },
};

/* ══════════════════════════════════════════════════
   SECTION 3: UTILITIES
   ══════════════════════════════════════════════════ */
function uid() { return Math.random().toString(36).slice(2, 9); }

function todayStr() { return new Date().toISOString().slice(0, 10); }

function fmtDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' });
}

function calcExVolume(ex) {
  return ex.sets.reduce((sum, s) => sum + (s.reps * s.weight), 0);
}

function calcDayVolume(exercises) {
  return exercises.reduce((sum, ex) => sum + calcExVolume(ex), 0);
}

function cardioIcon(type) {
  const map = { running: '🏃', treadmill: '🏃', cycling: '🚴', stairmaster: '🪜' };
  return map[type] || '💪';
}

function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { el.className = 'toast'; }, 2500);
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

/* ══════════════════════════════════════════════════
   SECTION 4: WORKOUT UI
   ══════════════════════════════════════════════════ */
function renderWorkoutView() {
  renderDayTabs();
  renderDayPanels();
}

function renderDayTabs() {
  const tabs = document.getElementById('dayTabs');
  tabs.innerHTML = '';
  State.days.forEach(day => {
    const tab = document.createElement('button');
    tab.className = 'day-tab' + (day.id === State.activeDayId ? ' active' : '');
    tab.dataset.dayId = day.id;
    tab.innerHTML = `<span>${day.name}</span>
      ${State.days.length > 1 ? `<span class="day-tab-close" data-close="${day.id}" title="Remove day">✕</span>` : ''}`;
    tab.addEventListener('click', e => {
      if (e.target.dataset.close) { removeDay(e.target.dataset.close); return; }
      State.activeDayId = day.id;
      renderWorkoutView();
    });
    tabs.appendChild(tab);
  });
}

function renderDayPanels() {
  const panels = document.getElementById('dayPanels');
  panels.innerHTML = '';
  State.days.forEach(day => {
    const panel = buildDayPanel(day);
    panels.appendChild(panel);
  });
}

function buildDayPanel(day) {
  const panel = document.createElement('div');
  panel.className = 'day-panel' + (day.id === State.activeDayId ? ' active' : '');
  panel.id = `panel-${day.id}`;

  const vol = calcDayVolume(day.exercises);

  panel.innerHTML = `
    <div class="day-panel-header">
      <input class="day-name-input" value="${escHtml(day.name)}" data-day-id="${day.id}" aria-label="Day name" />
      <span class="day-volume">Volume: ${vol.toLocaleString()} kg</span>
    </div>
    <div class="card">
      <div class="workout-table-wrap">
        <table class="workout-table" id="table-${day.id}">
          <thead>
            <tr>
              <th style="width:24px">✓</th>
              <th style="min-width:160px">Exercise</th>
              <th style="min-width:100px">Target</th>
              <th style="min-width:220px">Sets (reps × kg)</th>
              <th style="min-width:90px">Volume</th>
              <th style="width:40px"></th>
            </tr>
          </thead>
          <tbody id="tbody-${day.id}"></tbody>
        </table>
      </div>
      <div class="add-exercise-row">
        <button class="btn btn-ghost btn-sm" data-add-ex="${day.id}">+ Add Exercise</button>
      </div>
    </div>`;

  // Wire day name input
  panel.querySelector('.day-name-input').addEventListener('input', e => {
    day.name = e.target.value;
    State.save();
    document.querySelectorAll(`[data-day-id="${day.id}"]`).forEach(el => {
      if (el !== e.target) el.value = day.name;
    });
    // Update tab text
    const tabSpan = document.querySelector(`.day-tab[data-day-id="${day.id}"] span`);
    if (tabSpan) tabSpan.textContent = day.name;
  });

  // Wire add exercise
  panel.querySelector(`[data-add-ex="${day.id}"]`).addEventListener('click', () => {
    const ex = mkEx('New Exercise', 'Target', [{ reps: 10, weight: 0 }]);
    State.addExercise(day.id, ex);
    renderExerciseRow(day, ex, document.getElementById(`tbody-${day.id}`));
    updateDayVolume(day);
    // Auto-log
    autoLog(day);
    toast('Exercise added');
  });

  // Render existing exercises
  const tbody = panel.querySelector(`#tbody-${day.id}`);
  day.exercises.forEach(ex => renderExerciseRow(day, ex, tbody));

  return panel;
}

function renderExerciseRow(day, ex, tbody) {
  const tr = document.createElement('tr');
  tr.id = `ex-${ex.id}`;
  tr.className = ex.completed ? 'completed' : '';

  tr.innerHTML = `
    <td>
      <input type="checkbox" class="exercise-check" ${ex.completed ? 'checked' : ''} aria-label="Complete" />
    </td>
    <td class="exercise-name-cell">
      <input class="table-input name-input" value="${escHtml(ex.name)}" placeholder="Exercise" aria-label="Exercise name" />
    </td>
    <td>
      <input class="table-input" value="${escHtml(ex.target)}" placeholder="Muscle" aria-label="Target muscle" />
    </td>
    <td>
      <div class="sets-editor" id="sets-${ex.id}"></div>
    </td>
    <td>
      <span class="vol-badge" id="vol-${ex.id}">${calcExVolume(ex).toLocaleString()} kg</span>
    </td>
    <td>
      <button class="btn btn-danger btn-icon" aria-label="Remove exercise">✕</button>
    </td>`;

  // Checkbox
  tr.querySelector('.exercise-check').addEventListener('change', e => {
    ex.completed = e.target.checked;
    tr.className = ex.completed ? 'completed' : '';
    State.save();
    autoLog(day);
  });

  // Exercise name
  tr.querySelector('.name-input').addEventListener('input', e => {
    ex.name = e.target.value;
    State.save();
    autoLog(day);
  });

  // Target muscle
  tr.querySelectorAll('.table-input')[1].addEventListener('input', e => {
    ex.target = e.target.value;
    State.save();
  });

  // Remove exercise
  tr.querySelector('.btn-danger').addEventListener('click', () => {
    State.removeExercise(day.id, ex.id);
    tr.remove();
    updateDayVolume(day);
    autoLog(day);
    toast('Exercise removed');
  });

  tbody.appendChild(tr);

  // Render sets
  renderSetsEditor(day, ex);
}

function renderSetsEditor(day, ex) {
  const container = document.getElementById(`sets-${ex.id}`);
  if (!container) return;
  container.innerHTML = '';

  ex.sets.forEach((set, i) => {
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
      <span class="set-label mono">${i + 1}</span>
      <input class="set-input" type="number" value="${set.reps}" min="1" aria-label="Reps" title="Reps" />
      <span class="set-sep">×</span>
      <input class="set-input" type="number" value="${set.weight}" min="0" step="0.5" aria-label="Weight kg" title="Weight (kg)" />
      <span class="set-sep mono" style="font-size:10px;color:var(--text-muted)">kg</span>
      ${ex.sets.length > 1 ? `<button class="set-delete" aria-label="Remove set">✕</button>` : ''}`;

    row.querySelectorAll('.set-input')[0].addEventListener('input', e => {
      set.reps = parseInt(e.target.value) || 0;
      State.save();
      updateExVol(ex);
      updateDayVolume(day);
      autoLog(day);
    });
    row.querySelectorAll('.set-input')[1].addEventListener('input', e => {
      set.weight = parseFloat(e.target.value) || 0;
      State.save();
      updateExVol(ex);
      updateDayVolume(day);
      autoLog(day);
    });

    const delBtn = row.querySelector('.set-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        ex.sets = ex.sets.filter(s => s.id !== set.id);
        State.save();
        renderSetsEditor(day, ex);
        updateExVol(ex);
        updateDayVolume(day);
        autoLog(day);
      });
    }
    container.appendChild(row);
  });

  // Add set button
  const addBtn = document.createElement('button');
  addBtn.className = 'add-set-btn';
  addBtn.textContent = '+ set';
  addBtn.addEventListener('click', () => {
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({ id: uid(), reps: last?.reps || 10, weight: last?.weight || 0 });
    State.save();
    renderSetsEditor(day, ex);
    updateExVol(ex);
    updateDayVolume(day);
    autoLog(day);
  });
  container.appendChild(addBtn);
}

function updateExVol(ex) {
  const el = document.getElementById(`vol-${ex.id}`);
  if (el) el.textContent = `${calcExVolume(ex).toLocaleString()} kg`;
}

function updateDayVolume(day) {
  const vol = calcDayVolume(day.exercises);
  const el = document.querySelector(`#panel-${day.id} .day-volume`);
  if (el) el.textContent = `Volume: ${vol.toLocaleString()} kg`;
}

function removeDay(id) {
  if (!confirm('Remove this day and all its exercises?')) return;
  State.removeDay(id);
  renderWorkoutView();
  toast('Day removed');
}

/** Auto-save workout log snapshot on any change */
function autoLog(day) {
  Storage.logWorkout(day.id, day.name, day.exercises);
}

/* ══════════════════════════════════════════════════
   SECTION 5: CARDIO
   ══════════════════════════════════════════════════ */
function initCardioDate() {
  document.getElementById('cardioDate').value = todayStr();
}

function logCardioSession() {
  const type = document.getElementById('cardioType').value;
  const date = document.getElementById('cardioDate').value || todayStr();
  const duration = parseFloat(document.getElementById('cardioDuration').value);
  const distance = parseFloat(document.getElementById('cardioDistance').value) || null;
  const calories = parseFloat(document.getElementById('cardioCalories').value) || null;
  const notes = document.getElementById('cardioNotes').value.trim();

  if (!duration || duration <= 0) { toast('Please enter a duration', true); return; }

  const sessions = Storage.getCardio();
  sessions.unshift({ id: uid(), type, date, duration, distance, calories, notes, loggedAt: new Date().toISOString() });
  Storage.setCardio(sessions);

  // Clear form (but keep type + date)
  document.getElementById('cardioDuration').value = '';
  document.getElementById('cardioDistance').value = '';
  document.getElementById('cardioCalories').value = '';
  document.getElementById('cardioNotes').value = '';

  renderCardioHistory();
  toast('Cardio session logged! 🏃');
}

function renderCardioHistory() {
  const container = document.getElementById('cardioHistory');
  const sessions = Storage.getCardio();

  if (!sessions.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏃</div><div class="empty-state-text">No cardio sessions logged yet.</div></div>`;
    return;
  }

  container.innerHTML = sessions.map(s => `
    <div class="cardio-entry">
      <div class="cardio-type-badge">${cardioIcon(s.type)}</div>
      <div class="cardio-info">
        <div class="cardio-date">${fmtDate(s.date)}</div>
        <div class="cardio-details">${capitalize(s.type)}</div>
        ${s.notes ? `<div class="cardio-notes-text">${escHtml(s.notes)}</div>` : ''}
      </div>
      <div class="cardio-stats">
        <div class="cardio-stat">
          <div class="cardio-stat-val">${s.duration}</div>
          <div class="cardio-stat-label">min</div>
        </div>
        ${s.distance ? `<div class="cardio-stat"><div class="cardio-stat-val">${s.distance}</div><div class="cardio-stat-label">km</div></div>` : ''}
        ${s.calories ? `<div class="cardio-stat"><div class="cardio-stat-val">${s.calories}</div><div class="cardio-stat-label">kcal</div></div>` : ''}
      </div>
      <button class="cardio-delete" data-id="${s.id}" aria-label="Delete">✕</button>
    </div>`).join('');

  container.querySelectorAll('.cardio-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const sessions = Storage.getCardio().filter(s => s.id !== btn.dataset.id);
      Storage.setCardio(sessions);
      renderCardioHistory();
      toast('Session deleted');
    });
  });
}

/* ══════════════════════════════════════════════════
   SECTION 6: PROGRESS / HISTORY VIEW
   ══════════════════════════════════════════════════ */
function renderHistoryView() {
  populateExerciseSelector();
  renderAllWorkoutLogs();
}

function populateExerciseSelector() {
  const sel = document.getElementById('exerciseSelector');
  const logs = Storage.getLogs();

  // Collect unique exercise names
  const names = new Set();
  logs.forEach(log => log.exercises.forEach(ex => names.add(ex.name)));

  // Also add from current days
  State.days.forEach(day => day.exercises.forEach(ex => names.add(ex.name)));

  sel.innerHTML = '<option value="">— Select Exercise —</option>';
  [...names].sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

function renderExerciseProgress(exerciseName) {
  const logs = Storage.getLogs();
  const wrap = document.getElementById('progressChartWrap');
  const tableEl = document.getElementById('exerciseHistoryTable');

  // Gather all entries for this exercise, sorted by date
  const entries = [];
  logs.forEach(log => {
    log.exercises.forEach(ex => {
      if (ex.name === exerciseName) {
        const maxWeight = ex.sets.reduce((m, s) => Math.max(m, s.weight), 0);
        const vol = ex.sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
        entries.push({ date: log.date, maxWeight, vol, sets: ex.sets });
      }
    });
  });
  entries.sort((a, b) => a.date.localeCompare(b.date));

  if (!entries.length) {
    wrap.style.display = 'none';
    tableEl.innerHTML = `<div class="no-workouts">No history for "${escHtml(exerciseName)}" yet.</div>`;
    return;
  }

  wrap.style.display = 'block';

  // Destroy old chart
  if (State.charts.progress) { State.charts.progress.destroy(); delete State.charts.progress; }

  const ctx = document.getElementById('progressChart').getContext('2d');
  State.charts.progress = new Chart(ctx, {
    type: 'line',
    data: {
      labels: entries.map(e => fmtDate(e.date)),
      datasets: [
        {
          label: 'Max Weight (kg)',
          data: entries.map(e => e.maxWeight),
          borderColor: '#e8ff47',
          backgroundColor: 'rgba(232,255,71,0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#e8ff47',
          tension: 0.3,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'Volume (kg)',
          data: entries.map(e => e.vol),
          borderColor: '#4d9fff',
          backgroundColor: 'rgba(77,159,255,0.04)',
          borderWidth: 2,
          pointBackgroundColor: '#4d9fff',
          tension: 0.3,
          fill: true,
          yAxisID: 'y1',
        },
      ],
    },
    options: chartOptions({ y: 'Max Weight (kg)', y1: 'Volume (kg)' }),
  });

  // History table
  tableEl.innerHTML = `
    <table class="history-table">
      <thead><tr><th>Date</th><th>Max Weight</th><th>Total Volume</th><th>Sets</th></tr></thead>
      <tbody>
        ${entries.reverse().map(e => `
          <tr>
            <td>${fmtDate(e.date)}</td>
            <td>${e.maxWeight} kg</td>
            <td>${e.vol.toLocaleString()} kg</td>
            <td>${e.sets.map(s => `${s.reps}×${s.weight}kg`).join(', ')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderAllWorkoutLogs() {
  const container = document.getElementById('allWorkoutLogs');
  const logs = Storage.getLogs().slice().sort((a, b) => b.date.localeCompare(a.date));

  if (!logs.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">No workouts logged yet. Start training!</div></div>`;
    return;
  }

  // Group by date
  const byDate = {};
  logs.forEach(log => {
    const key = log.date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(log);
  });

  container.innerHTML = Object.entries(byDate).map(([date, dayLogs]) => `
    <div class="log-group">
      <div class="log-group-date">📅 ${fmtDate(date)}</div>
      ${dayLogs.map(log => `
        <div style="margin-bottom:12px">
          <div style="font-weight:600;margin-bottom:8px;color:var(--text-secondary);font-size:13px">${escHtml(log.dayName)} — <span class="text-accent mono">${log.volume.toLocaleString()} kg total</span></div>
          ${log.exercises.map(ex => `
            <div class="log-exercise-row">
              <div class="log-ex-name">${escHtml(ex.name)}</div>
              <div class="log-ex-target">${escHtml(ex.target)}</div>
              <div class="log-ex-sets">${ex.sets.map((s, i) => `Set ${i+1}: ${s.reps}×${s.weight}kg`).join(' · ')}</div>
              <div class="log-ex-vol">${calcExVolume(ex).toLocaleString()} kg</div>
            </div>`).join('')}
        </div>`).join('')}
    </div>`).join('');
}

/* ══════════════════════════════════════════════════
   SECTION 7: CHARTS
   ══════════════════════════════════════════════════ */
function chartOptions({ y = '', y1 = null } = {}) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { labels: { color: '#888896', font: { family: 'DM Mono', size: 11 } } },
      tooltip: {
        backgroundColor: '#18181c',
        borderColor: '#2a2a32',
        borderWidth: 1,
        titleColor: '#f0f0f2',
        bodyColor: '#888896',
        titleFont: { family: 'DM Mono' },
        bodyFont: { family: 'DM Mono' },
      },
    },
    scales: {
      x: {
        ticks: { color: '#555560', font: { family: 'DM Mono', size: 11 } },
        grid: { color: '#1e1e24' },
      },
      y: {
        ticks: { color: '#555560', font: { family: 'DM Mono', size: 11 } },
        grid: { color: '#1e1e24' },
        title: { display: !!y, text: y, color: '#555560', font: { family: 'DM Mono', size: 11 } },
      },
    },
  };
  if (y1) {
    base.scales.y1 = {
      position: 'right',
      ticks: { color: '#4d9fff', font: { family: 'DM Mono', size: 11 } },
      grid: { drawOnChartArea: false },
      title: { display: true, text: y1, color: '#4d9fff', font: { family: 'DM Mono', size: 11 } },
    };
  }
  return base;
}

function renderWeeklyVolumeChart() {
  if (State.charts.weekly) { State.charts.weekly.destroy(); delete State.charts.weekly; }

  const last7 = getLast7Days();
  const logs = Storage.getLogs();

  const volumeByDay = {};
  last7.forEach(d => { volumeByDay[d] = 0; });
  logs.forEach(log => {
    if (volumeByDay.hasOwnProperty(log.date)) {
      volumeByDay[log.date] += log.volume;
    }
  });

  const ctx = document.getElementById('weeklyVolumeChart').getContext('2d');
  State.charts.weekly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: last7.map(d => { const dt = new Date(d + 'T00:00:00'); return dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' }); }),
      datasets: [{
        label: 'Volume (kg)',
        data: last7.map(d => volumeByDay[d]),
        backgroundColor: last7.map(d => d === todayStr() ? 'rgba(232,255,71,0.85)' : 'rgba(232,255,71,0.25)'),
        borderColor: 'rgba(232,255,71,0.6)',
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: chartOptions({ y: 'Volume (kg)' }),
  });
}

/* ══════════════════════════════════════════════════
   SECTION 8: DASHBOARD
   ══════════════════════════════════════════════════ */
function renderDashboard() {
  const logs = Storage.getLogs();
  const cardio = Storage.getCardio();
  const today = todayStr();
  const last7 = getLast7Days();

  // Today's volume
  const todayLogs = logs.filter(l => l.date === today);
  const todayVol = todayLogs.reduce((sum, l) => sum + l.volume, 0);
  document.getElementById('statTodayVolume').textContent = `${todayVol.toLocaleString()} kg`;

  // Weekly volume
  const weeklyVol = logs
    .filter(l => last7.includes(l.date))
    .reduce((sum, l) => sum + l.volume, 0);
  document.getElementById('statWeeklyVolume').textContent = `${weeklyVol.toLocaleString()} kg`;

  // Workouts this week (unique dates)
  const workoutDays = new Set(logs.filter(l => last7.includes(l.date)).map(l => l.date)).size;
  document.getElementById('statWorkoutsWeek').textContent = workoutDays;

  // Cardio this week
  const weeklyCardio = cardio.filter(s => last7.includes(s.date)).reduce((sum, s) => sum + s.duration, 0);
  document.getElementById('statCardioWeek').textContent = `${weeklyCardio} min`;

  // Chart
  renderWeeklyVolumeChart();

  // Recent activity
  renderRecentActivity(logs, cardio);
}

function renderRecentActivity(logs, cardio) {
  const container = document.getElementById('recentActivity');

  // Combine and sort recent items
  const items = [
    ...logs.map(l => ({ type: 'workout', date: l.date, name: l.dayName, vol: l.volume, icon: '🏋️' })),
    ...cardio.map(s => ({ type: 'cardio', date: s.date, name: capitalize(s.type), vol: s.duration, icon: cardioIcon(s.type), unit: 'min' })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  if (!items.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">No activity yet. Start your first workout!</div></div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="activity-item">
      <div class="activity-icon">${item.icon}</div>
      <div class="activity-info">
        <div class="activity-name">${escHtml(item.name)}</div>
        <div class="activity-meta">${fmtDate(item.date)}</div>
      </div>
      <div class="activity-vol">${item.type === 'workout' ? `${item.vol.toLocaleString()} kg` : `${item.vol} min`}</div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════
   SECTION 9: QUICK ADD MODAL
   ══════════════════════════════════════════════════ */
function openQuickAdd() {
  const sel = document.getElementById('qaDaySelect');
  sel.innerHTML = State.days.map(d => `<option value="${d.id}">${escHtml(d.name)}</option>`).join('');
  document.getElementById('quickAddModal').classList.add('open');
}
function closeQuickAdd() { document.getElementById('quickAddModal').classList.remove('open'); }

function confirmQuickAdd() {
  const dayId = document.getElementById('qaDaySelect').value;
  const name = document.getElementById('qaExerciseName').value.trim();
  const target = document.getElementById('qaTarget').value.trim();
  const sets = parseInt(document.getElementById('qaSets').value) || 3;
  const reps = parseInt(document.getElementById('qaReps').value) || 10;
  const weight = parseFloat(document.getElementById('qaWeight').value) || 0;

  if (!name) { toast('Exercise name required', true); return; }

  const day = State.getDay(dayId);
  if (!day) return;

  const ex = mkEx(name, target || 'General', Array.from({ length: sets }, () => ({ reps, weight })));
  State.addExercise(dayId, ex);

  // If we're on workout view and this day is active, render the row live
  if (State.activeDayId === dayId) {
    const tbody = document.getElementById(`tbody-${dayId}`);
    if (tbody) {
      renderExerciseRow(day, ex, tbody);
      updateDayVolume(day);
    }
  }
  autoLog(day);
  closeQuickAdd();
  toast(`"${name}" added to ${day.name}`);
}

/* ══════════════════════════════════════════════════
   SECTION 10: DUPLICATE LAST WORKOUT
   ══════════════════════════════════════════════════ */
function duplicateLastWorkout() {
  const day = State.getDay(State.activeDayId);
  if (!day) return;

  const logs = Storage.getLogs()
    .filter(l => l.dayId === day.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const last = logs[1] || logs[0]; // previous session
  if (!last || !last.exercises.length) { toast('No previous session to duplicate', true); return; }

  // Replace current exercises with clones from last session
  day.exercises = last.exercises.map(ex => ({
    id: uid(),
    name: ex.name,
    target: ex.target,
    completed: false,
    sets: ex.sets.map(s => ({ id: uid(), reps: s.reps, weight: s.weight })),
  }));

  State.save();
  renderWorkoutView();
  toast(`Duplicated ${last.exercises.length} exercises from ${fmtDate(last.date)}`);
}

/* ══════════════════════════════════════════════════
   SECTION 11: VIEW NAVIGATION
   ══════════════════════════════════════════════════ */
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`view-${viewId}`)?.classList.add('active');
  document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');

  // Lazy render per view
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'workout') renderWorkoutView();
  if (viewId === 'cardio') renderCardioHistory();
  if (viewId === 'history') renderHistoryView();
}

/* ══════════════════════════════════════════════════
   SECTION 12: HELPERS
   ══════════════════════════════════════════════════ */
function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function capitalize(s = '') { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ══════════════════════════════════════════════════
   SECTION 13: INIT
   ══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Init state from storage
  State.init();

  // Set current date
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  // Init cardio date picker to today
  initCardioDate();

  // ─── Navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // ─── Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
  });

  // ─── Quick Add
  document.getElementById('quickAddBtn').addEventListener('click', openQuickAdd);
  document.getElementById('closeQuickAdd').addEventListener('click', closeQuickAdd);
  document.getElementById('cancelQuickAdd').addEventListener('click', closeQuickAdd);
  document.getElementById('confirmQuickAdd').addEventListener('click', confirmQuickAdd);
  document.getElementById('quickAddModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeQuickAdd();
  });

  // ─── Add Day
  document.getElementById('addDayBtn').addEventListener('click', () => {
    const name = prompt('Name for new day:', `Day ${State.days.length + 1}`);
    if (name === null) return;
    const day = State.addDay(name || `Day ${State.days.length + 1}`);
    State.activeDayId = day.id;
    renderWorkoutView();
    toast(`"${day.name}" added`);
  });

  // ─── Duplicate workout
  document.getElementById('duplicateWorkoutBtn').addEventListener('click', duplicateLastWorkout);

  // ─── Cardio log button
  document.getElementById('logCardioBtn').addEventListener('click', logCardioSession);

  // ─── Exercise selector (progress view)
  document.getElementById('exerciseSelector').addEventListener('change', e => {
    if (e.target.value) renderExerciseProgress(e.target.value);
    else {
      document.getElementById('progressChartWrap').style.display = 'none';
      document.getElementById('exerciseHistoryTable').innerHTML = '';
    }
  });

  // ─── Initial view
  switchView('dashboard');
});
