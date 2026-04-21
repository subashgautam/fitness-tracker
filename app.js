/**
 * IRONLOG v2 — Fitness Tracker
 * ─────────────────────────────────────────────────
 * Fixes in this version:
 *  1. Clear top-nav navigation (always visible)
 *  2. Visual feedback: toast + row flash + save pill on every action
 *  3. Previous weight display + "+Xkg vs last session" delta chip
 *  4. Full input validation (required fields, min values, error messages)
 *  5. Filterable Workout History page (by day + month)
 *  6. Volume calculation everywhere (exercise, day, weekly)
 *  7. Cardio: pace + speed auto-calculated; weekly summary bar
 *  8. Upgraded UI: cards, spacing, accent, stat deltas
 *  9. Mobile-first: sticky actions, bigger inputs, responsive tables
 * ─────────────────────────────────────────────────
 * Sections:
 *  §1  Storage
 *  §2  Default data & State
 *  §3  Utilities & Validation
 *  §4  Navigation
 *  §5  Dashboard
 *  §6  Workout UI
 *  §7  Cardio
 *  §8  History / Progress
 *  §9  Charts
 *  §10 Modals
 *  §11 Notifications
 *  §12 Init
 */

/* ══════════════════════════════════════════════════
   §1  STORAGE
   ══════════════════════════════════════════════════ */
const Storage = {
  KEY_DAYS:   'ironlog_days',
  KEY_LOGS:   'ironlog_workout_logs',
  KEY_CARDIO: 'ironlog_cardio',

  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; }
    catch { return null; }
  },
  set(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (e) { console.error('Storage write failed:', e); }
  },

  getDays()    { return this.get(this.KEY_DAYS) || defaultDays(); },
  setDays(d)   { this.set(this.KEY_DAYS, d); },
  getLogs()    { return this.get(this.KEY_LOGS) || []; },
  setLogs(l)   { this.set(this.KEY_LOGS, l); },
  getCardio()  { return this.get(this.KEY_CARDIO) || []; },
  setCardio(c) { this.set(this.KEY_CARDIO, c); },

  /**
   * Upsert a workout snapshot for today.
   * One record per dayId per date — auto-replaces if re-logging same day.
   */
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
        completed: ex.completed,
        sets: ex.sets.map(s => ({ ...s })),
      })),
      volume: calcDayVolume(exercises),
      savedAt: new Date().toISOString(),
    };
    const idx = logs.findIndex(l => l.dayId === dayId && l.date === snapshot.date);
    if (idx >= 0) logs[idx] = snapshot; else logs.push(snapshot);
    this.setLogs(logs);
  },

  /**
   * Return the last logged set data for a given exercise name (before today).
   * Used to show "previous weight" indicators.
   */
  getPrevSession(exerciseName, dayId) {
    const today = todayStr();
    const logs = this.getLogs()
      .filter(l => l.dayId === dayId && l.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));
    for (const log of logs) {
      const ex = log.exercises.find(e => e.name === exerciseName);
      if (ex) return { date: log.date, sets: ex.sets };
    }
    return null;
  },
};

/* ══════════════════════════════════════════════════
   §2  DEFAULT DATA & STATE
   ══════════════════════════════════════════════════ */
function defaultDays() {
  return [
    {
      id: 'day1',
      name: 'Day 1 — Push',
      exercises: [
        mkEx('Bench Press',          'Chest',       [{ reps:10,weight:60},{ reps:8,weight:65},{ reps:6,weight:70}]),
        mkEx('Overhead Press',       'Shoulders',   [{ reps:10,weight:40},{ reps:8,weight:42.5},{ reps:8,weight:42.5}]),
        mkEx('Incline DB Press',     'Upper Chest', [{ reps:12,weight:24},{ reps:10,weight:26},{ reps:10,weight:26}]),
        mkEx('Lateral Raises',       'Side Delts',  [{ reps:15,weight:10},{ reps:15,weight:10},{ reps:12,weight:10}]),
        mkEx('Tricep Pushdown',      'Triceps',     [{ reps:12,weight:30},{ reps:12,weight:32.5},{ reps:10,weight:35}]),
      ],
    },
    {
      id: 'day2',
      name: 'Day 2 — Pull',
      exercises: [
        mkEx('Deadlift',             'Back/Hams',   [{ reps:5,weight:100},{ reps:5,weight:110},{ reps:3,weight:120}]),
        mkEx('Pull-ups',             'Lats',        [{ reps:8,weight:0},{ reps:7,weight:0},{ reps:6,weight:0}]),
        mkEx('Barbell Row',          'Mid Back',    [{ reps:10,weight:60},{ reps:8,weight:65},{ reps:8,weight:65}]),
        mkEx('Face Pulls',           'Rear Delts',  [{ reps:15,weight:20},{ reps:15,weight:20},{ reps:15,weight:20}]),
        mkEx('Bicep Curls',          'Biceps',      [{ reps:12,weight:14},{ reps:10,weight:16},{ reps:10,weight:16}]),
      ],
    },
    {
      id: 'day3',
      name: 'Day 3 — Legs',
      exercises: [
        mkEx('Squat',                'Quads/Glutes',[{ reps:8,weight:80},{ reps:8,weight:85},{ reps:6,weight:90}]),
        mkEx('Romanian Deadlift',    'Hamstrings',  [{ reps:10,weight:70},{ reps:10,weight:72.5},{ reps:8,weight:75}]),
        mkEx('Leg Press',            'Quads',       [{ reps:12,weight:120},{ reps:10,weight:130},{ reps:10,weight:130}]),
        mkEx('Leg Curl',             'Hamstrings',  [{ reps:12,weight:40},{ reps:12,weight:42.5},{ reps:10,weight:45}]),
        mkEx('Calf Raises',          'Calves',      [{ reps:15,weight:60},{ reps:15,weight:60},{ reps:15,weight:60}]),
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

const State = {
  days: [],
  activeDayId: null,
  charts: {},

  init() {
    this.days = Storage.getDays();
    this.activeDayId = this.days[0]?.id || null;
  },

  save() { Storage.setDays(this.days); },

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
    if (day) { day.exercises.push(ex); this.save(); }
  },

  removeExercise(dayId, exId) {
    const day = this.getDay(dayId);
    if (day) { day.exercises = day.exercises.filter(e => e.id !== exId); this.save(); }
  },
};

/* ══════════════════════════════════════════════════
   §3  UTILITIES & VALIDATION
   ══════════════════════════════════════════════════ */
function uid()       { return Math.random().toString(36).slice(2, 9); }
function todayStr()  { return new Date().toISOString().slice(0, 10); }
function escHtml(s='') {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(s='') { return s.charAt(0).toUpperCase() + s.slice(1); }

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday:'short', month:'short', day:'numeric' });
}

function calcExVolume(ex) {
  return ex.sets.reduce((s, set) => s + (Number(set.reps)||0) * (Number(set.weight)||0), 0);
}
function calcDayVolume(exercises) {
  return exercises.reduce((s, ex) => s + calcExVolume(ex), 0);
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function cardioIcon(type) {
  return { running:'🏃', treadmill:'🏃', cycling:'🚴', stairmaster:'🪜' }[type] || '💪';
}

/** Clamp + validate a numeric input; show/hide error message */
function validateNum(el, errEl, { label='Value', min=0, max=Infinity, required=false } = {}) {
  const raw = el.value.trim();
  if (required && raw === '') {
    el.classList.add('invalid');
    if (errEl) errEl.textContent = `${label} is required`;
    return null;
  }
  const v = parseFloat(raw);
  if (required && (isNaN(v) || v < min)) {
    el.classList.add('invalid');
    if (errEl) errEl.textContent = `${label} must be ≥ ${min}`;
    return null;
  }
  el.classList.remove('invalid');
  if (errEl) errEl.textContent = '';
  return isNaN(v) ? (required ? min : null) : Math.min(Math.max(v, min), max);
}

/** Enforce bounds on a set-input live */
function clampSetInput(el, min, max) {
  let v = parseFloat(el.value);
  if (isNaN(v) || v < min) { el.value = min; el.classList.add('invalid'); }
  else if (v > max)         { el.value = max; el.classList.remove('invalid'); }
  else                      { el.classList.remove('invalid'); }
  return Math.min(Math.max(isNaN(v) ? min : v, min), max);
}

/* ══════════════════════════════════════════════════
   §4  NAVIGATION
   ══════════════════════════════════════════════════ */
function switchView(viewId) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Deactivate all nav items (both desktop and drawer)
  document.querySelectorAll('.tnav-item, .drawer-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`view-${viewId}`)?.classList.add('active');
  document.querySelectorAll(`[data-view="${viewId}"]`).forEach(el => el.classList.add('active'));

  // Lazy-render the destination view
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'workout')   renderWorkoutView();
  if (viewId === 'cardio')    { renderCardioWeeklySummary(); renderCardioHistory(); }
  if (viewId === 'history')   renderHistoryView();

  closeMobileDrawer();
}

/* ── Mobile hamburger drawer ── */
function openMobileDrawer() {
  document.getElementById('mobileDrawer').classList.add('open');
  document.getElementById('drawerOverlay').style.display = 'block';
  document.getElementById('hamburger').classList.add('open');
  document.getElementById('hamburger').setAttribute('aria-expanded', 'true');
}
function closeMobileDrawer() {
  document.getElementById('mobileDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').style.display = 'none';
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('hamburger').setAttribute('aria-expanded', 'false');
}

/* ══════════════════════════════════════════════════
   §5  DASHBOARD
   ══════════════════════════════════════════════════ */
function renderDashboard() {
  const logs   = Storage.getLogs();
  const cardio = Storage.getCardio();
  const today  = todayStr();
  const last7  = getLast7Days();

  /* — Greeting — */
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayOfWeek = new Date().toLocaleDateString('en-AU', { weekday: 'long' });
  document.getElementById('dashGreeting').textContent = `${greet} — ${dayOfWeek}`;

  /* — Today's volume — */
  const todayVol = logs
    .filter(l => l.date === today)
    .reduce((s, l) => s + l.volume, 0);
  document.getElementById('statTodayVolume').textContent = `${todayVol.toLocaleString()} kg`;

  /* — Weekly volume + delta vs previous week — */
  const prev7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const weekVol = logs.filter(l => last7.includes(l.date)).reduce((s,l) => s+l.volume, 0);
  const prevVol = logs.filter(l => prev7.includes(l.date)).reduce((s,l) => s+l.volume, 0);
  document.getElementById('statWeeklyVolume').textContent = `${weekVol.toLocaleString()} kg`;

  const deltaEl = document.getElementById('statVolDelta');
  if (prevVol > 0) {
    const diff = weekVol - prevVol;
    const pct  = Math.abs(Math.round((diff / prevVol) * 100));
    if (diff > 0)      deltaEl.innerHTML = `<span class="delta-up">▲ ${pct}% vs last week</span>`;
    else if (diff < 0) deltaEl.innerHTML = `<span class="delta-down">▼ ${pct}% vs last week</span>`;
    else               deltaEl.innerHTML = `<span class="delta-flat">= same as last week</span>`;
  } else {
    deltaEl.innerHTML = '';
  }

  /* — Workouts this week — */
  const workoutDays = new Set(logs.filter(l => last7.includes(l.date)).map(l => l.date)).size;
  document.getElementById('statWorkoutsWeek').textContent = workoutDays;

  /* — Cardio this week — */
  const weekCardio = cardio.filter(s => last7.includes(s.date)).reduce((s,c) => s+c.duration, 0);
  document.getElementById('statCardioWeek').textContent = `${weekCardio} min`;

  /* — Date range badge — */
  const [d0, d6] = [last7[0], last7[6]];
  document.getElementById('dashWeekRange').textContent =
    `${fmtDate(d0)} – ${fmtDate(d6)}`;

  renderWeeklyVolumeChart();
  renderRecentActivity(logs, cardio);
}

function renderRecentActivity(logs, cardio) {
  const container = document.getElementById('recentActivity');
  const items = [
    ...logs.map(l => ({ type:'workout', date:l.date, name:l.dayName, vol:l.volume, icon:'🏋️' })),
    ...cardio.map(s => ({ type:'cardio', date:s.date, name:capitalize(s.type), vol:s.duration, icon:cardioIcon(s.type) })),
  ].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 8);

  if (!items.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚡</div><div class="empty-text">No activity yet. Start your first workout!</div></div>`;
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="activity-item">
      <div class="activity-icon">${item.icon}</div>
      <div class="activity-info">
        <div class="activity-name">${escHtml(item.name)}</div>
        <div class="activity-meta">${fmtDate(item.date)}</div>
      </div>
      <div class="activity-vol">
        ${item.type === 'workout' ? `${item.vol.toLocaleString()} kg` : `${item.vol} min`}
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════
   §6  WORKOUT UI
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

    const closeBtn = State.days.length > 1
      ? `<span class="day-tab-close" data-close="${day.id}" title="Remove day">✕</span>`
      : '';
    tab.innerHTML = `<span>${escHtml(day.name)}</span>${closeBtn}`;

    tab.addEventListener('click', e => {
      if (e.target.dataset.close) { confirmRemoveDay(e.target.dataset.close); return; }
      State.activeDayId = day.id;
      renderWorkoutView();
    });
    tabs.appendChild(tab);
  });
}

function renderDayPanels() {
  const panels = document.getElementById('dayPanels');
  panels.innerHTML = '';
  State.days.forEach(day => panels.appendChild(buildDayPanel(day)));
}

function buildDayPanel(day) {
  const panel = document.createElement('div');
  panel.className = 'day-panel' + (day.id === State.activeDayId ? ' active' : '');
  panel.id = `panel-${day.id}`;

  const vol = calcDayVolume(day.exercises);
  const completeCount = day.exercises.filter(e => e.completed).length;

  panel.innerHTML = `
    <div class="day-panel-header">
      <input class="day-name-input" value="${escHtml(day.name)}" aria-label="Day name" />
      <span style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">
        ${completeCount}/${day.exercises.length} done
      </span>
      <span class="day-volume-badge" id="dayVol-${day.id}">
        ${vol.toLocaleString()} kg
      </span>
    </div>
    <div class="card" style="overflow:hidden">
      <div class="workout-table-wrap">
        <table class="workout-table" id="table-${day.id}">
          <thead>
            <tr>
              <th style="width:28px">✓</th>
              <th style="min-width:160px">Exercise</th>
              <th style="min-width:100px">Target</th>
              <th style="min-width:240px">Sets · Reps × Weight</th>
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

  /* Day name editable */
  panel.querySelector('.day-name-input').addEventListener('input', e => {
    day.name = e.target.value;
    State.save();
    // sync tab label
    const span = document.querySelector(`.day-tab[data-day-id="${day.id}"] span`);
    if (span) span.textContent = day.name;
    triggerSavePill();
  });

  /* Add exercise */
  panel.querySelector(`[data-add-ex]`).addEventListener('click', () => {
    const ex = mkEx('New Exercise', 'Target', [{ reps:10, weight:0 }]);
    State.addExercise(day.id, ex);
    renderExerciseRow(day, ex, document.getElementById(`tbody-${day.id}`));
    updateDayStats(day);
    autoLog(day);
    toast('Exercise added ✔');
  });

  /* Render existing exercises */
  const tbody = panel.querySelector(`#tbody-${day.id}`);
  day.exercises.forEach(ex => renderExerciseRow(day, ex, tbody));

  return panel;
}

function renderExerciseRow(day, ex, tbody) {
  // Get previous session data for this exercise (for delta display)
  const prev = Storage.getPrevSession(ex.name, day.id);
  const prevMaxWeight = prev
    ? prev.sets.reduce((m, s) => Math.max(m, s.weight), 0)
    : null;

  const tr = document.createElement('tr');
  tr.id = `ex-${ex.id}`;
  tr.className = ex.completed ? 'completed' : '';

  tr.innerHTML = `
    <td style="vertical-align:top;padding-top:12px">
      <input type="checkbox" class="exercise-check" ${ex.completed ? 'checked' : ''} aria-label="Mark complete" />
    </td>
    <td>
      <input class="table-input name-input" value="${escHtml(ex.name)}" placeholder="Exercise name" aria-label="Exercise name" />
      ${buildPrevWeightChip(ex, prevMaxWeight)}
    </td>
    <td>
      <input class="table-input" value="${escHtml(ex.target)}" placeholder="Muscle group" aria-label="Target muscle" />
    </td>
    <td>
      <div class="sets-editor" id="sets-${ex.id}"></div>
    </td>
    <td>
      <span class="vol-badge" id="vol-${ex.id}">${calcExVolume(ex).toLocaleString()} kg</span>
    </td>
    <td>
      <button class="btn btn-danger btn-icon" title="Remove exercise" aria-label="Remove">✕</button>
    </td>`;

  /* Checkbox → mark complete */
  tr.querySelector('.exercise-check').addEventListener('change', e => {
    ex.completed = e.target.checked;
    tr.className = ex.completed ? 'completed' : '';
    State.save();
    updateDayStats(day);
    autoLog(day);
    if (ex.completed) toast(`✔ ${ex.name} completed`);
  });

  /* Exercise name */
  tr.querySelector('.name-input').addEventListener('input', e => {
    ex.name = e.target.value;
    State.save();
    autoLog(day);
    triggerSavePill();
  });

  /* Target muscle */
  tr.querySelectorAll('.table-input')[1].addEventListener('input', e => {
    ex.target = e.target.value;
    State.save();
    triggerSavePill();
  });

  /* Remove exercise */
  tr.querySelector('.btn-danger').addEventListener('click', () => {
    State.removeExercise(day.id, ex.id);
    // flash red before remove
    tr.style.transition = 'opacity 200ms';
    tr.style.opacity = '0';
    setTimeout(() => { tr.remove(); updateDayStats(day); autoLog(day); }, 200);
    toast('Exercise removed');
  });

  tbody.appendChild(tr);
  renderSetsEditor(day, ex, prevMaxWeight);
}

/** Build the "prev: 60kg +5kg" chip under the exercise name */
function buildPrevWeightChip(ex, prevMaxWeight) {
  if (prevMaxWeight === null) return '';

  const curMax = ex.sets.reduce((m, s) => Math.max(m, s.weight), 0);
  const diff   = curMax - prevMaxWeight;

  let deltaHtml = '';
  if      (diff > 0)  deltaHtml = `<span class="delta-chip up">+${diff}kg</span>`;
  else if (diff < 0)  deltaHtml = `<span class="delta-chip down">${diff}kg</span>`;
  else                deltaHtml = `<span class="delta-chip flat">= same</span>`;

  return `<div class="prev-weight" id="prev-${ex.id}">prev: ${prevMaxWeight}kg ${deltaHtml}</div>`;
}

function renderSetsEditor(day, ex, prevMaxWeight) {
  const container = document.getElementById(`sets-${ex.id}`);
  if (!container) return;
  container.innerHTML = '';

  ex.sets.forEach((set, i) => {
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
      <span class="set-label">${i + 1}</span>
      <input class="set-input" type="number" value="${set.reps}" min="1" max="999" aria-label="Reps for set ${i+1}" title="Reps" />
      <span class="set-sep">×</span>
      <input class="set-input" type="number" value="${set.weight}" min="0" max="2000" step="0.5" aria-label="Weight for set ${i+1}" title="Weight (kg)" />
      <span class="set-input-label">kg</span>
      ${ex.sets.length > 1 ? `<button class="set-delete" aria-label="Remove set ${i+1}" title="Remove set">✕</button>` : ''}`;

    /* Reps input */
    const repsEl   = row.querySelectorAll('.set-input')[0];
    const weightEl = row.querySelectorAll('.set-input')[1];

    repsEl.addEventListener('change', () => {
      set.reps = clampSetInput(repsEl, 1, 999);
      State.save();
      updateExVol(ex);
      updateDayStats(day);
      autoLog(day);
      flashRow(ex.id);
    });
    repsEl.addEventListener('input', () => {
      set.reps = parseInt(repsEl.value) || 1;
      updateExVol(ex);
      updateDayStats(day);
    });

    /* Weight input */
    weightEl.addEventListener('change', () => {
      set.weight = clampSetInput(weightEl, 0, 2000);
      State.save();
      updateExVol(ex);
      updateDayStats(day);
      autoLog(day);
      flashRow(ex.id);
      // refresh prev-weight chip
      refreshPrevChip(ex, prevMaxWeight);
    });
    weightEl.addEventListener('input', () => {
      set.weight = parseFloat(weightEl.value) || 0;
      updateExVol(ex);
      updateDayStats(day);
    });

    /* Delete set */
    const delBtn = row.querySelector('.set-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        ex.sets = ex.sets.filter(s => s.id !== set.id);
        State.save();
        renderSetsEditor(day, ex, prevMaxWeight);
        updateExVol(ex);
        updateDayStats(day);
        autoLog(day);
      });
    }
    container.appendChild(row);
  });

  /* Add set button */
  const addBtn = document.createElement('button');
  addBtn.className = 'add-set-btn';
  addBtn.textContent = '+ set';
  addBtn.addEventListener('click', () => {
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({ id: uid(), reps: last?.reps || 10, weight: last?.weight || 0 });
    State.save();
    renderSetsEditor(day, ex, prevMaxWeight);
    updateExVol(ex);
    updateDayStats(day);
    autoLog(day);
  });
  container.appendChild(addBtn);
}

/** Update the volume badge for a single exercise */
function updateExVol(ex) {
  const el = document.getElementById(`vol-${ex.id}`);
  if (el) el.textContent = `${calcExVolume(ex).toLocaleString()} kg`;
}

/** Update day volume badge + completion counter */
function updateDayStats(day) {
  const vol = calcDayVolume(day.exercises);
  const el  = document.getElementById(`dayVol-${day.id}`);
  if (el) el.textContent = `${vol.toLocaleString()} kg`;

  // Update done counter in header
  const panel = document.getElementById(`panel-${day.id}`);
  if (panel) {
    const counter = panel.querySelector('.day-panel-header span:nth-child(2)');
    if (counter) {
      const done = day.exercises.filter(e => e.completed).length;
      counter.textContent = `${done}/${day.exercises.length} done`;
    }
  }
}

/** Refresh the prev-weight chip when user changes weight */
function refreshPrevChip(ex, prevMaxWeight) {
  const el = document.getElementById(`prev-${ex.id}`);
  if (!el) return;
  const curMax = ex.sets.reduce((m, s) => Math.max(m, s.weight), 0);
  if (prevMaxWeight === null) { el.innerHTML = ''; return; }
  const diff = curMax - prevMaxWeight;
  let deltaHtml = '';
  if      (diff > 0)  deltaHtml = `<span class="delta-chip up">+${diff}kg</span>`;
  else if (diff < 0)  deltaHtml = `<span class="delta-chip down">${diff}kg</span>`;
  else                deltaHtml = `<span class="delta-chip flat">= same</span>`;
  el.innerHTML = `prev: ${prevMaxWeight}kg ${deltaHtml}`;
}

/** Brief yellow flash on a row after save */
function flashRow(exId) {
  const tr = document.getElementById(`ex-${exId}`);
  if (!tr) return;
  tr.classList.remove('row-saved');
  void tr.offsetWidth; // reflow
  tr.classList.add('row-saved');
}

/** Snapshot current day to logs storage */
function autoLog(day) {
  Storage.logWorkout(day.id, day.name, day.exercises);
}

function confirmRemoveDay(id) {
  if (!confirm('Remove this day and all its exercises?')) return;
  State.removeDay(id);
  renderWorkoutView();
  toast('Day removed');
}

/* ══════════════════════════════════════════════════
   §7  CARDIO
   ══════════════════════════════════════════════════ */
function initCardioDate() {
  document.getElementById('cardioDate').value = todayStr();
}

/** Auto-compute pace and speed whenever duration/distance changes */
function updateCardioCalculations() {
  const dur  = parseFloat(document.getElementById('cardioDuration').value) || 0;
  const dist = parseFloat(document.getElementById('cardioDistance').value) || 0;

  const paceEl  = document.getElementById('cardioPace');
  const speedEl = document.getElementById('cardioSpeed');

  if (dur > 0 && dist > 0) {
    const paceMin  = dur / dist;                      // min per km
    const paceS    = Math.round((paceMin % 1) * 60);
    const paceFormatted = `${Math.floor(paceMin)}:${String(paceS).padStart(2,'0')}`;
    const speed    = (dist / dur * 60).toFixed(1);    // km/h

    paceEl.value  = paceFormatted;
    speedEl.value = `${speed} km/h`;
  } else {
    paceEl.value  = '—';
    speedEl.value = '—';
  }
}

function logCardioSession() {
  const type     = document.getElementById('cardioType').value;
  const date     = document.getElementById('cardioDate').value || todayStr();
  const durEl    = document.getElementById('cardioDuration');
  const distEl   = document.getElementById('cardioDistance');
  const calEl    = document.getElementById('cardioCalories');
  const notes    = document.getElementById('cardioNotes').value.trim();

  /* Validation */
  const duration = validateNum(durEl, null, { label:'Duration', min:1, max:600, required:true });
  if (duration === null) { toast('Duration is required (min 1 min)', true); durEl.focus(); return; }

  const distance = distEl.value ? Math.max(0, parseFloat(distEl.value)||0) : null;
  const calories = calEl.value  ? Math.max(0, parseFloat(calEl.value)||0)  : null;

  // Compute pace/speed for storage
  let pace = null, speed = null;
  if (duration > 0 && distance > 0) {
    const paceMin = duration / distance;
    const paceS   = Math.round((paceMin % 1) * 60);
    pace  = `${Math.floor(paceMin)}:${String(paceS).padStart(2,'0')} min/km`;
    speed = parseFloat((distance / duration * 60).toFixed(1));
  }

  const sessions = Storage.getCardio();
  sessions.unshift({ id:uid(), type, date, duration, distance, calories, pace, speed, notes, loggedAt: new Date().toISOString() });
  Storage.setCardio(sessions);

  // Reset numeric + notes fields, keep type + date
  durEl.value  = '';
  distEl.value = '';
  calEl.value  = '';
  document.getElementById('cardioNotes').value = '';
  document.getElementById('cardioPace').value  = '—';
  document.getElementById('cardioSpeed').value = '—';

  renderCardioWeeklySummary();
  renderCardioHistory();
  toast('Cardio session logged! 🏃');
}

function renderCardioWeeklySummary() {
  const last7   = getLast7Days();
  const sessions = Storage.getCardio().filter(s => last7.includes(s.date));

  const totalDur  = sessions.reduce((s,c) => s + c.duration, 0);
  const totalDist = sessions.reduce((s,c) => s + (c.distance||0), 0);

  document.getElementById('cardioWeekDur').textContent  = `${totalDur} min`;
  document.getElementById('cardioWeekDist').textContent = `${totalDist.toFixed(1)} km`;
  document.getElementById('cardioWeekSess').textContent = sessions.length;
}

function renderCardioHistory() {
  const container = document.getElementById('cardioHistory');
  const filter    = document.getElementById('cardioFilter')?.value || '';
  let sessions    = Storage.getCardio();
  if (filter) sessions = sessions.filter(s => s.type === filter);

  if (!sessions.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏃</div><div class="empty-text">${filter ? `No ${filter} sessions found.` : 'No cardio sessions logged yet.'}</div></div>`;
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
        ${s.speed    ? `<div class="cardio-stat"><div class="cardio-stat-val">${s.speed}</div><div class="cardio-stat-label">km/h</div></div>` : ''}
        ${s.pace     ? `<div class="cardio-stat"><div class="cardio-stat-val" style="font-size:13px">${s.pace.split(' ')[0]}</div><div class="cardio-stat-label">min/km</div></div>` : ''}
        ${s.calories ? `<div class="cardio-stat"><div class="cardio-stat-val">${s.calories}</div><div class="cardio-stat-label">kcal</div></div>` : ''}
      </div>
      <button class="cardio-delete" data-id="${s.id}" aria-label="Delete session">✕</button>
    </div>`).join('');

  container.querySelectorAll('.cardio-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const all = Storage.getCardio().filter(s => s.id !== btn.dataset.id);
      Storage.setCardio(all);
      renderCardioWeeklySummary();
      renderCardioHistory();
      toast('Session deleted');
    });
  });
}

/* ══════════════════════════════════════════════════
   §8  HISTORY / PROGRESS
   ══════════════════════════════════════════════════ */
function renderHistoryView() {
  populateExerciseSelector();
  populateLogFilterDay();
  renderAllWorkoutLogs();
}

function populateExerciseSelector() {
  const sel  = document.getElementById('exerciseSelector');
  const logs = Storage.getLogs();
  const names = new Set();
  logs.forEach(l => l.exercises.forEach(e => names.add(e.name)));
  State.days.forEach(d => d.exercises.forEach(e => names.add(e.name)));

  const prev = sel.value;
  sel.innerHTML = '<option value="">— Pick an exercise —</option>';
  [...names].sort().forEach(n => {
    const o = document.createElement('option');
    o.value = n; o.textContent = n;
    sel.appendChild(o);
  });
  if (prev && names.has(prev)) { sel.value = prev; renderExerciseProgress(prev); }
}

function populateLogFilterDay() {
  const sel = document.getElementById('logFilterDay');
  const prev = sel.value;
  sel.innerHTML = '<option value="">All Days</option>';
  State.days.forEach(d => {
    const o = document.createElement('option');
    o.value = d.id; o.textContent = d.name;
    sel.appendChild(o);
  });
  if (prev) sel.value = prev;
}

function renderExerciseProgress(exerciseName) {
  const logs  = Storage.getLogs();
  const wrap  = document.getElementById('progressChartWrap');
  const table = document.getElementById('exerciseHistoryTable');

  // Gather all sessions for this exercise
  const entries = [];
  logs.forEach(log => {
    log.exercises.forEach(ex => {
      if (ex.name === exerciseName) {
        const maxW = ex.sets.reduce((m,s) => Math.max(m,s.weight), 0);
        const vol  = ex.sets.reduce((s,set) => s + set.reps*set.weight, 0);
        entries.push({ date:log.date, maxWeight:maxW, vol, sets:ex.sets });
      }
    });
  });
  entries.sort((a,b) => a.date.localeCompare(b.date));

  if (!entries.length) {
    wrap.style.display = 'none';
    table.innerHTML = `<div class="no-workouts">No history for "<strong>${escHtml(exerciseName)}</strong>" yet.</div>`;
    return;
  }

  wrap.style.display = 'block';
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
          borderColor: '#c8f135',
          backgroundColor: 'rgba(200,241,53,0.07)',
          borderWidth: 2.5,
          pointBackgroundColor: '#c8f135',
          pointRadius: 4,
          tension: 0.35,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'Volume (kg)',
          data: entries.map(e => e.vol),
          borderColor: '#5199ff',
          backgroundColor: 'rgba(81,153,255,0.04)',
          borderWidth: 2,
          pointBackgroundColor: '#5199ff',
          pointRadius: 3,
          tension: 0.35,
          fill: true,
          yAxisID: 'y1',
        },
      ],
    },
    options: buildChartOptions({ y:'Max Weight (kg)', y1:'Volume (kg)' }),
  });

  // Build history table (newest first)
  const rows = entries.slice().reverse().map((e, i) => {
    const prevEntry = entries[entries.length - 2 - i];
    let wDelta = '';
    if (prevEntry) {
      const d = e.maxWeight - prevEntry.maxWeight;
      if (d > 0) wDelta = `<span class="delta-chip up" style="margin-left:6px">+${d}kg</span>`;
      else if (d < 0) wDelta = `<span class="delta-chip down" style="margin-left:6px">${d}kg</span>`;
    }
    return `<tr>
      <td>${fmtDate(e.date)}</td>
      <td>${e.maxWeight}kg${wDelta}</td>
      <td>${e.vol.toLocaleString()} kg</td>
      <td style="font-size:11px;color:var(--text-muted)">${e.sets.map(s=>`${s.reps}×${s.weight}kg`).join(' · ')}</td>
    </tr>`;
  }).join('');

  table.innerHTML = `
    <table class="history-table" style="margin-top:16px">
      <thead><tr><th>Date</th><th>Max Weight</th><th>Volume</th><th>Sets</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderAllWorkoutLogs() {
  const container = document.getElementById('allWorkoutLogs');
  const filterDay = document.getElementById('logFilterDay')?.value || '';
  const filterMon = document.getElementById('logFilterMonth')?.value || '';

  let logs = Storage.getLogs().slice().sort((a,b) => b.date.localeCompare(a.date));
  if (filterDay) logs = logs.filter(l => l.dayId === filterDay);
  if (filterMon) logs = logs.filter(l => l.date.startsWith(filterMon));

  if (!logs.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">No workouts found for these filters.</div></div>`;
    return;
  }

  // Group by date
  const byDate = {};
  logs.forEach(l => { (byDate[l.date] = byDate[l.date] || []).push(l); });

  container.innerHTML = Object.entries(byDate).map(([date, dayLogs]) => `
    <div class="log-group">
      <div class="log-group-date">📅 ${fmtDate(date)}</div>
      ${dayLogs.map(log => `
        <div class="log-day-block">
          <div class="log-day-name">${escHtml(log.dayName)} — <span class="text-accent mono">${log.volume.toLocaleString()} kg total</span></div>
          ${log.exercises.map(ex => `
            <div class="log-exercise-row">
              <div class="log-ex-name">${escHtml(ex.name)}</div>
              <div class="log-ex-target">${escHtml(ex.target)}</div>
              <div class="log-ex-sets">${ex.sets.map((s,i)=>`Set ${i+1}: ${s.reps}×${s.weight}kg`).join(' · ')}</div>
              <div class="log-ex-vol">${calcExVolume(ex).toLocaleString()} kg</div>
            </div>`).join('')}
        </div>`).join('')}
    </div>`).join('');
}

/* ══════════════════════════════════════════════════
   §9  CHARTS
   ══════════════════════════════════════════════════ */
function buildChartOptions({ y='', y1=null } = {}) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: {
      legend: { labels: { color:'#8888a0', font:{ family:'DM Mono', size:11 } } },
      tooltip: {
        backgroundColor:'#17171c', borderColor:'#252530', borderWidth:1,
        titleColor:'#f1f1f3', bodyColor:'#8888a0',
        titleFont:{ family:'DM Mono' }, bodyFont:{ family:'DM Mono' },
        padding: 10,
      },
    },
    scales: {
      x: {
        ticks: { color:'#4f4f65', font:{ family:'DM Mono', size:10 } },
        grid:  { color:'#1a1a20' },
      },
      y: {
        ticks: { color:'#4f4f65', font:{ family:'DM Mono', size:10 } },
        grid:  { color:'#1a1a20' },
        title: { display:!!y, text:y, color:'#4f4f65', font:{ family:'DM Mono', size:10 } },
      },
    },
  };
  if (y1) {
    base.scales.y1 = {
      position: 'right',
      ticks: { color:'#5199ff', font:{ family:'DM Mono', size:10 } },
      grid:  { drawOnChartArea: false },
      title: { display:true, text:y1, color:'#5199ff', font:{ family:'DM Mono', size:10 } },
    };
  }
  return base;
}

function renderWeeklyVolumeChart() {
  if (State.charts.weekly) { State.charts.weekly.destroy(); delete State.charts.weekly; }

  const last7 = getLast7Days();
  const logs  = Storage.getLogs();
  const volByDay = {};
  last7.forEach(d => { volByDay[d] = 0; });
  logs.forEach(l => { if (volByDay.hasOwnProperty(l.date)) volByDay[l.date] += l.volume; });

  const today = todayStr();
  const ctx   = document.getElementById('weeklyVolumeChart').getContext('2d');
  State.charts.weekly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: last7.map(d => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-AU', { weekday:'short', day:'numeric' });
      }),
      datasets: [{
        label: 'Volume (kg)',
        data: last7.map(d => volByDay[d]),
        backgroundColor: last7.map(d =>
          d === today ? 'rgba(200,241,53,0.85)' : 'rgba(200,241,53,0.22)'
        ),
        borderColor: 'rgba(200,241,53,0.5)',
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: buildChartOptions({ y:'Volume (kg)' }),
  });
}

/* ══════════════════════════════════════════════════
   §10 MODALS
   ══════════════════════════════════════════════════ */

/* ── Quick Add ── */
function openQuickAdd() {
  const sel = document.getElementById('qaDaySelect');
  sel.innerHTML = State.days.map(d => `<option value="${d.id}">${escHtml(d.name)}</option>`).join('');
  document.getElementById('qaExerciseName').value = '';
  document.getElementById('qaTarget').value        = '';
  document.getElementById('qaSets').value          = '3';
  document.getElementById('qaReps').value          = '10';
  document.getElementById('qaWeight').value        = '0';
  clearModalErrors('quickAddModal');
  openModal('quickAddModal');
  document.getElementById('qaExerciseName').focus();
}
function closeQuickAdd() { closeModal('quickAddModal'); }

function confirmQuickAdd() {
  const nameEl   = document.getElementById('qaExerciseName');
  const setsEl   = document.getElementById('qaSets');
  const repsEl   = document.getElementById('qaReps');
  const weightEl = document.getElementById('qaWeight');

  let valid = true;

  /* Validate name */
  if (!nameEl.value.trim()) {
    nameEl.classList.add('invalid');
    document.getElementById('qaNameError').textContent = 'Exercise name is required';
    valid = false;
  } else {
    nameEl.classList.remove('invalid');
    document.getElementById('qaNameError').textContent = '';
  }

  /* Validate sets */
  const sets = parseInt(setsEl.value);
  if (!sets || sets < 1) {
    setsEl.classList.add('invalid');
    document.getElementById('qaSetsError').textContent = 'Min 1 set';
    valid = false;
  } else {
    setsEl.classList.remove('invalid');
    document.getElementById('qaSetsError').textContent = '';
  }

  /* Validate reps */
  const reps = parseInt(repsEl.value);
  if (!reps || reps < 1) {
    repsEl.classList.add('invalid');
    document.getElementById('qaRepsError').textContent = 'Min 1 rep';
    valid = false;
  } else {
    repsEl.classList.remove('invalid');
    document.getElementById('qaRepsError').textContent = '';
  }

  if (!valid) return;

  const weight = Math.max(0, parseFloat(weightEl.value) || 0);
  const dayId  = document.getElementById('qaDaySelect').value;
  const day    = State.getDay(dayId);
  if (!day) return;

  const ex = mkEx(
    nameEl.value.trim(),
    document.getElementById('qaTarget').value.trim() || 'General',
    Array.from({ length: sets }, () => ({ reps, weight }))
  );
  State.addExercise(dayId, ex);

  // Live-inject row if we're on the matching panel
  if (State.activeDayId === dayId) {
    const tbody = document.getElementById(`tbody-${dayId}`);
    if (tbody) { renderExerciseRow(day, ex, tbody); updateDayStats(day); }
  }
  autoLog(day);
  closeQuickAdd();
  toast(`"${ex.name}" added to ${day.name} ✔`);
}

/* ── Add Day modal ── */
function openAddDayModal() {
  document.getElementById('newDayName').value = '';
  document.getElementById('newDayNameError').textContent = '';
  openModal('addDayModal');
  document.getElementById('newDayName').focus();
}
function closeAddDayModal() { closeModal('addDayModal'); }

function confirmAddDay() {
  const nameEl = document.getElementById('newDayName');
  const name   = nameEl.value.trim();
  if (!name) {
    nameEl.classList.add('invalid');
    document.getElementById('newDayNameError').textContent = 'Day name is required';
    return;
  }
  nameEl.classList.remove('invalid');
  const day = State.addDay(name);
  State.activeDayId = day.id;
  renderWorkoutView();
  closeAddDayModal();
  toast(`"${name}" added ✔`);
}

/* ── Generic modal helpers ── */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function clearModalErrors(modalId) {
  document.querySelectorAll(`#${modalId} .field-error`).forEach(el => { el.textContent = ''; });
  document.querySelectorAll(`#${modalId} .invalid`).forEach(el => el.classList.remove('invalid'));
}

/* ── Duplicate last workout ── */
function duplicateLastWorkout() {
  const day = State.getDay(State.activeDayId);
  if (!day) { toast('No active day', true); return; }

  const logs = Storage.getLogs()
    .filter(l => l.dayId === day.id)
    .sort((a,b) => b.date.localeCompare(a.date));

  const last = logs.find(l => l.date < todayStr()) || logs[0];
  if (!last?.exercises.length) { toast('No previous session to duplicate', true); return; }

  day.exercises = last.exercises.map(ex => ({
    id: uid(), name:ex.name, target:ex.target, completed:false,
    sets: ex.sets.map(s => ({ id:uid(), reps:s.reps, weight:s.weight })),
  }));

  State.save();
  renderWorkoutView();
  toast(`Duplicated ${last.exercises.length} exercises from ${fmtDate(last.date)} ✔`);
}

/* ══════════════════════════════════════════════════
   §11 NOTIFICATIONS
   ══════════════════════════════════════════════════ */
function toast(msg, type = '') {
  // type: '' (success/default) | 'error' | 'info'
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast show${type ? ' ' + type : ''}`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}

function triggerSavePill() {
  const el = document.getElementById('saveIndicator');
  el.textContent = '✔ Saved';
  el.classList.add('show');
  clearTimeout(window._saveTimer);
  window._saveTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

/* ══════════════════════════════════════════════════
   §12 INIT
   ══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* — Bootstrap state — */
  State.init();

  /* — Date in topnav — */
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-AU', {
    weekday:'short', month:'short', day:'numeric',
  });

  /* — Cardio date default — */
  initCardioDate();

  /* ── Navigation ── */
  document.querySelectorAll('.tnav-item[data-view], .drawer-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  /* ── Mobile hamburger ── */
  document.getElementById('hamburger').addEventListener('click', e => {
    e.stopPropagation();
    const drawer = document.getElementById('mobileDrawer');
    drawer.classList.contains('open') ? closeMobileDrawer() : openMobileDrawer();
  });
  document.getElementById('drawerOverlay').addEventListener('click', closeMobileDrawer);

  /* ── Quick Add ── */
  document.getElementById('quickAddBtn').addEventListener('click', openQuickAdd);
  document.getElementById('closeQuickAdd').addEventListener('click', closeQuickAdd);
  document.getElementById('cancelQuickAdd').addEventListener('click', closeQuickAdd);
  document.getElementById('confirmQuickAdd').addEventListener('click', confirmQuickAdd);
  document.getElementById('quickAddModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeQuickAdd();
  });
  // Allow Enter key in name field
  document.getElementById('qaExerciseName').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmQuickAdd();
  });

  /* ── Add Day modal ── */
  document.getElementById('addDayBtn').addEventListener('click', openAddDayModal);
  document.getElementById('closeAddDay').addEventListener('click', closeAddDayModal);
  document.getElementById('cancelAddDay').addEventListener('click', closeAddDayModal);
  document.getElementById('confirmAddDay').addEventListener('click', confirmAddDay);
  document.getElementById('addDayModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAddDayModal();
  });
  document.getElementById('newDayName').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmAddDay();
  });

  /* ── Duplicate workout ── */
  document.getElementById('duplicateWorkoutBtn').addEventListener('click', duplicateLastWorkout);

  /* ── Cardio live calculations ── */
  ['cardioDuration', 'cardioDistance'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCardioCalculations);
  });

  /* ── Log cardio ── */
  document.getElementById('logCardioBtn').addEventListener('click', logCardioSession);

  /* ── Cardio type filter ── */
  document.getElementById('cardioFilter').addEventListener('change', () => {
    renderCardioWeeklySummary();
    renderCardioHistory();
  });

  /* ── Exercise progress selector ── */
  document.getElementById('exerciseSelector').addEventListener('change', e => {
    if (e.target.value) renderExerciseProgress(e.target.value);
    else {
      document.getElementById('progressChartWrap').style.display = 'none';
      document.getElementById('exerciseHistoryTable').innerHTML  = '';
    }
  });

  /* ── Workout log filters ── */
  document.getElementById('logFilterDay').addEventListener('change', renderAllWorkoutLogs);
  document.getElementById('logFilterMonth').addEventListener('change', renderAllWorkoutLogs);

  /* ── Keyboard: close modals on Escape ── */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal('quickAddModal');
    closeModal('addDayModal');
    closeMobileDrawer();
  });

  /* ── Initial view ── */
  switchView('dashboard');
});
