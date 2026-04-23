/**
 * FitTrack Pro - 5-Day Split Tracker
 * Handles: Exercise rotation, inline editing, auto-save, logging, weekly analytics
 */
const STORAGE_KEY = 'fittrack_pro_v1';
const LIBRARY = {
  day1: [
    {id:'d1_1', name:'Barbell Bench Press', muscle:'Chest'},
    {id:'d1_2', name:'Incline Dumbbell Press', muscle:'Chest'},
    {id:'d1_3', name:'Chest Fly', muscle:'Chest'},
    {id:'d1_4', name:'Decline Bench Press', muscle:'Chest'},
    {id:'d1_5', name:'Cable Crossover', muscle:'Chest'},
    {id:'d1_6', name:'Overhead Shoulder Press', muscle:'Shoulders'},
    {id:'d1_7', name:'Lateral Raises', muscle:'Shoulders'},
    {id:'d1_8', name:'Front Raises', muscle:'Shoulders'},
    {id:'d1_9', name:'Arnold Press', muscle:'Shoulders'},
    {id:'d1_10', name:'Machine Shoulder Press', muscle:'Shoulders'},
    {id:'d1_11', name:'Tricep Pushdown', muscle:'Triceps'},
    {id:'d1_12', name:'Overhead Tricep Extension', muscle:'Triceps'},
    {id:'d1_13', name:'Skull Crushers', muscle:'Triceps'},
    {id:'d1_14', name:'Dips (Triceps)', muscle:'Triceps'},
    {id:'d1_15', name:'Close-Grip Bench Press', muscle:'Triceps'}
  ],
  day2: [
    {id:'d2_1', name:'Deadlift', muscle:'Back'},
    {id:'d2_2', name:'Lat Pulldown', muscle:'Back'},
    {id:'d2_3', name:'Pull-Ups', muscle:'Back'},
    {id:'d2_4', name:'Seated Cable Row', muscle:'Back'},
    {id:'d2_5', name:'Bent Over Barbell Row', muscle:'Back'},
    {id:'d2_6', name:'Barbell Curl', muscle:'Biceps'},
    {id:'d2_7', name:'Dumbbell Curl', muscle:'Biceps'},
    {id:'d2_8', name:'Hammer Curl', muscle:'Biceps'},
    {id:'d2_9', name:'Preacher Curl', muscle:'Biceps'},
    {id:'d2_10', name:'Cable Curl', muscle:'Biceps'},
    {id:'d2_11', name:'Face Pulls', muscle:'Rear Delts'},
    {id:'d2_12', name:'Reverse Pec Deck', muscle:'Rear Delts'},
    {id:'d2_13', name:'Rear Delt Dumbbell Fly', muscle:'Rear Delts'},
    {id:'d2_14', name:'Cable Rear Delt Fly', muscle:'Rear Delts'},
    {id:'d2_15', name:'Bent Over Rear Delt Raise', muscle:'Rear Delts'}
  ],
  day3: [
    {id:'d3_1', name:'Squat (Barbell)', muscle:'Legs'},
    {id:'d3_2', name:'Leg Press', muscle:'Legs'},
    {id:'d3_3', name:'Romanian Deadlift', muscle:'Legs'},
    {id:'d3_4', name:'Walking Lunges', muscle:'Legs'},
    {id:'d3_5', name:'Leg Curl', muscle:'Legs'},
    {id:'d3_6', name:'Hanging Leg Raises', muscle:'Abs'},
    {id:'d3_7', name:'Cable Crunch', muscle:'Abs'},
    {id:'d3_8', name:'Plank', muscle:'Abs'},
    {id:'d3_9', name:'Russian Twists', muscle:'Abs'},
    {id:'d3_10', name:'Bicycle Crunch', muscle:'Abs'}
  ],
  day4: [
    {id:'d4_1', name:'Bench Press', muscle:'Upper Compound'},
    {id:'d4_2', name:'Pull-Ups', muscle:'Upper Compound'},
    {id:'d4_3', name:'Overhead Press', muscle:'Upper Compound'},
    {id:'d4_4', name:'Barbell Row', muscle:'Upper Compound'},
    {id:'d4_5', name:'Incline Dumbbell Press', muscle:'Upper Compound'},
    {id:'d4_6', name:'Lateral Raises', muscle:'Upper Iso'},
    {id:'d4_7', name:'Face Pulls', muscle:'Upper Iso'},
    {id:'d4_8', name:'Tricep Pushdown', muscle:'Upper Iso'},
    {id:'d4_9', name:'Dumbbell Curl', muscle:'Upper Iso'},
    {id:'d4_10', name:'Chest Fly', muscle:'Upper Iso'}
  ],
  day5: [
    {id:'d5_1', name:'Squat', muscle:'Lower Compound'},
    {id:'d5_2', name:'Deadlift', muscle:'Lower Compound'},
    {id:'d5_3', name:'Leg Press', muscle:'Lower Compound'},
    {id:'d5_4', name:'Romanian Deadlift', muscle:'Lower Compound'},
    {id:'d5_5', name:'Bulgarian Split Squat', muscle:'Lower Compound'},
    {id:'d5_6', name:'Leg Extension', muscle:'Lower Iso'},
    {id:'d5_7', name:'Leg Curl', muscle:'Lower Iso'},
    {id:'d5_8', name:'Calf Raises (Standing)', muscle:'Lower Iso'},
    {id:'d5_9', name:'Calf Raises (Seated)', muscle:'Lower Iso'},
    {id:'d5_10', name:'Glute Bridge / Hip Thrust', muscle:'Lower Iso'}
  ]
};

const App = {
  state: {
    days: [],
    logs: [],
    theme: 'dark',
    weekStart: new Date().toISOString().split('T')[0]
  },
  chart: null,
  configDayId: null,

  init() {
    this.loadState();
    this.renderDays();
    this.initChart();
    this.updateReport();
    this.setupEvents();
    document.getElementById('btn-theme').textContent = this.state.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  },

  loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        this.state.days = p.days || [];
        this.state.logs = p.logs || [];
        this.state.weekStart = p.weekStart || this.state.weekStart;
      } catch (e) { this.seedDays(); }
    } else {
      this.seedDays();
    }
  },

  seedDays() {
    this.state.days = Object.keys(LIBRARY).map(key => ({
      id: key,
      name: key.replace('day', 'Day ').replace('1', '1 - Push').replace('2', '2 - Pull').replace('3', '3 - Legs + Abs').replace('4', '4 - Full Upper').replace('5', '5 - Full Lower'),
      // Default: ALL exercises active, sets/reps/weight preset
      activeIds: LIBRARY[key].map(e => e.id),
      exercises: LIBRARY[key].map(e => ({ ...e, sets: e.muscle === 'Abs' ? 3 : 4, reps: e.muscle === 'Abs' ? 30 : 10, weight: 0, done: false }))
    }));
    this.saveState();
  },

  saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  },

  getActiveExercises(dayId) {
    const day = this.state.days.find(d => d.id === dayId);
    if (!day) return [];
    return day.exercises.filter(e => day.activeIds.includes(e.id));
  },

  renderDays() {
    const grid = document.getElementById('days-grid');
    grid.innerHTML = '';
    this.state.days.forEach(day => {
      const active = this.getActiveExercises(day.id);
      const card = document.createElement('div');
      card.className = 'section-card';
      card.innerHTML = `
        <div class="day-header">
          <h3>${day.name}</h3>
          <div>
            <button class="btn btn-secondary btn-sm" data-action="configure" data-day="${day.id}">⚙️ Configure</button>
            <button class="btn btn-accent btn-sm" data-action="log-all" data-day="${day.id}">✅ Log All</button>
          </div>
        </div>
        <table class="workout-table" data-day="${day.id}">
          <thead><tr><th>✅</th><th>Exercise</th><th>Target</th><th>Sets</th><th>Reps</th><th>Weight</th></tr></thead>
          <tbody>
            ${active.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1rem;">No exercises selected. Configure to add.</td></tr>' : ''}
            ${active.map(ex => `
              <tr data-ex="${ex.id}">
                <td data-label="Done"><input type="checkbox" class="log-toggle" data-day="${day.id}" data-ex="${ex.id}" ${ex.done ? 'checked' : ''}></td>
                <td data-label="Exercise">${ex.name}</td>
                <td data-label="Target">${ex.muscle}</td>
                <td data-label="Sets"><input type="number" value="${ex.sets}" min="1" data-field="sets" data-day="${day.id}" data-ex="${ex.id}"></td>
                <td data-label="Reps"><input type="number" value="${ex.reps}" min="1" data-field="reps" data-day="${day.id}" data-ex="${ex.id}"></td>
                <td data-label="Weight"><input type="number" value="${ex.weight}" min="0" data-field="weight" data-day="${day.id}" data-ex="${ex.id}"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      grid.appendChild(card);
    });
  },

  initChart() {
    const ctx = document.getElementById('volumeChart');
    if (!ctx) return;
    this.chart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Training Volume (kg)',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.35,
          fill: true,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { grid: { color: '#2a2e35' }, ticks: { color: '#9ca3af' } },
          y: { beginAtZero: true, grid: { color: '#2a2e35' }, ticks: { color: '#9ca3af' } }
        }
      }
    });
  },

  updateReport() {
    const today = new Date();
    const dates = [], volumes = [];
    let weekVol = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      dates.push(ds.slice(5));
      let v = 0;
      this.state.logs.filter(l => l.date === ds && l.completed).forEach(l => v += (l.sets * l.reps * l.weight));
      weekVol += v; volumes.push(v);
    }

    // Summary per day
    const summary = document.getElementById('weekly-summary');
    const dayCounts = this.state.logs.reduce((acc, l) => {
      const day = this.state.days.find(d => d.id === l.dayId)?.name.split(' - ')[0] || 'Unknown';
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    summary.innerHTML = `
      <div class="summary-row"><span>Total Volume (7d)</span><span class="summary-val">${weekVol.toLocaleString()} kg</span></div>
      <div class="summary-row"><span>Exercises Logged</span><span class="summary-val">${this.state.logs.length}</span></div>
      ${Object.keys(LIBRARY).map(k => {
        const name = k.replace('day', 'Day ');
        const count = dayCounts[name] || 0;
        return `<div class="summary-row"><span>${name}</span><span class="summary-val">${count} completed</span></div>`;
      }).join('')}
    `;

    if (this.chart) {
      this.chart.data.labels = dates;
      this.chart.data.datasets[0].data = volumes;
      this.chart.update();
    }
  },

  setupEvents() {
    // 1. Inline Input Auto-Save
    document.addEventListener('input', (e) => {
      if (!e.target.matches('input[data-day][data-ex][data-field]')) return;
      const { day, ex, field } = e.target.dataset;
      const d = this.state.days.find(x => x.id === day);
      if (!d) return;
      const exRef = d.exercises.find(x => x.id === ex);
      if (!exRef) return;
      
      const val = e.target.value;
      exRef[field] = ['sets','reps','weight'].includes(field) ? (parseFloat(val) || 0) : val;
      this.saveState();
    });

    // 2. Checkbox Logging
    document.addEventListener('change', (e) => {
      if (!e.target.matches('.log-toggle')) return;
      const { day, ex } = e.target.dataset;
      const d = this.state.days.find(x => x.id === day);
      const exRef = d?.exercises.find(x => x.id === ex);
      if (!exRef) return;

      exRef.done = e.target.checked;
      const today = new Date().toISOString().split('T')[0];
      
      if (e.target.checked) {
        const exists = this.state.logs.some(l => l.date === today && l.dayId === day && l.exId === ex);
        if (!exists) {
          this.state.logs.push({
            date: today, dayId: day, exId: ex,
            name: exRef.name, sets: exRef.sets, reps: exRef.reps, weight: exRef.weight, completed: true
          });
        }
      } else {
        this.state.logs = this.state.logs.filter(l => !(l.date === today && l.dayId === day && l.exId === ex));
      }
      this.saveState();
    });

    // 3. Button Actions
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const { action, day } = btn.dataset;

      if (action === 'configure') {
        this.configDayId = day;
        const modal = document.getElementById('config-modal');
        document.getElementById('config-title').textContent = `Configure ${this.state.days.find(d => d.id === day)?.name || 'Day'}`;
        const list = document.getElementById('config-list');
        list.innerHTML = '';
        
        const lib = LIBRARY[day] || [];
        const activeIds = this.state.days.find(d => d.id === day)?.activeIds || [];
        lib.forEach(item => {
          list.innerHTML += `
            <label class="checkbox-item">
              <input type="checkbox" value="${item.id}" ${activeIds.includes(item.id) ? 'checked' : ''}>
              <span>${item.name} <small style="color:var(--text-muted)">(${item.muscle})</small></span>
            </label>`;
        });
        modal.showModal();
      }
      if (action === 'log-all') {
        const today = new Date().toISOString().split('T')[0];
        const active = this.getActiveExercises(day);
        active.forEach(ex => {
          const exists = this.state.logs.some(l => l.date === today && l.dayId === day && l.exId === ex.id);
          if (!exists) {
            this.state.logs.push({ date: today, dayId: day, exId: ex.id, name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight, completed: true });
          }
          ex.done = true;
        });
        this.renderDays();
        this.saveState();
      }
    });

    // 4. Config Modal Submit
    document.getElementById('config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const checked = Array.from(document.querySelectorAll('#config-list input:checked')).map(cb => cb.value);
      const d = this.state.days.find(x => x.id === this.configDayId);
      if (d) {
        d.activeIds = checked;
        // Preserve existing values, reset unchecked to defaults
        d.exercises.forEach(ex => {
          if (!checked.includes(ex.id)) {
            ex.sets = ex.muscle === 'Abs' ? 3 : 4;
            ex.reps = ex.muscle === 'Abs' ? 30 : 10;
            ex.weight = 0;
            ex.done = false;
          }
        });
      }
      document.getElementById('config-modal').close();
      this.renderDays();
      this.saveState();
    });

    // 5. Theme Toggle
    document.getElementById('btn-theme').addEventListener('click', () => {
      this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', this.state.theme);
      document.getElementById('btn-theme').textContent = this.state.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
      this.saveState();
      if (this.chart) {
        this.chart.data.datasets[0].borderColor = this.state.theme === 'dark' ? '#3b82f6' : '#2563eb';
        this.chart.update();
      }
    });

    // 6. New Week Button
    document.getElementById('btn-reset-week').addEventListener('click', () => {
      if(confirm('Start a new week? This resets all "done" checkboxes but keeps your exercise library and history.')) {
        this.state.days.forEach(d => d.exercises.forEach(e => e.done = false));
        this.state.weekStart = new Date().toISOString().split('T')[0];
        this.renderDays();
        this.saveState();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
