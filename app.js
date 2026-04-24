/**
 * FitTrack Pro - 5-Day Split Tracker
 * Clean syntax, no template literal corruption risk
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
  state: { days: [], logs: [], theme: 'dark', weekStart: '' },
  chart: null,
  configDayId: null,

  init: function() {
    this.state.weekStart = new Date().toISOString().split('T')[0];
    this.loadState();
    this.renderDays();
    this.initChart();
    this.updateReport();
    this.setupEvents();
    var btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = this.state.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  },

  loadState: function() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        var p = JSON.parse(saved);
        this.state.days = p.days || [];
        this.state.logs = p.logs || [];
        if (p.theme) this.state.theme = p.theme;
        if (p.weekStart) this.state.weekStart = p.weekStart;
      } catch (e) { this.seedDays(); }
    } else { this.seedDays(); }
  },

  seedDays: function() {
    var self = this;
    this.state.days = Object.keys(LIBRARY).map(function(key) {
      var nameMap = {
        'day1': 'Day 1 - Push', 'day2': 'Day 2 - Pull', 'day3': 'Day 3 - Legs + Abs',
        'day4': 'Day 4 - Full Upper', 'day5': 'Day 5 - Full Lower'
      };
      return {
        id: key,
        name: nameMap[key] || key,
        activeIds: LIBRARY[key].map(function(e) { return e.id; }),
        exercises: LIBRARY[key].map(function(e) {
          var isAbs = e.muscle === 'Abs';
          return { 
            id: e.id, name: e.name, muscle: e.muscle,
            sets: isAbs ? 3 : 4, 
            reps: isAbs ? 30 : 10, 
            weight: 0, 
            done: false 
          };
        })
      };
    });
    this.saveState();
  },

  saveState: function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  },

  getActiveExercises: function(dayId) {
    var day = this.state.days.find(function(d) { return d.id === dayId; });
    if (!day) return [];
    return day.exercises.filter(function(e) { 
      return day.activeIds.indexOf(e.id) !== -1; 
    });
  },

  renderDays: function() {
    var grid = document.getElementById('days-grid');
    if (!grid) return;
    grid.innerHTML = '';
    var self = this;
    
    this.state.days.forEach(function(day) {
      var active = self.getActiveExercises(day.id);
      var card = document.createElement('div');
      card.className = 'section-card';
      
      var header = '<div class="day-header">' +
        '<h3>' + day.name + '</h3>' +
        '<div>' +
        '<button class="btn btn-secondary btn-sm" data-action="configure" data-day="' + day.id + '">⚙️ Configure</button>' +
        '<button class="btn btn-accent btn-sm" data-action="log-all" data-day="' + day.id + '">✅ Log All</button>' +
        '</div></div>';
      
      var tableStart = '<table class="workout-table" data-day="' + day.id + '">' +
        '<thead><tr><th>✅</th><th>Exercise</th><th>Target</th><th>Sets</th><th>Reps</th><th>Weight</th></tr></thead><tbody>';
      
      var rows = '';
      if (active.length === 0) {
        rows = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1rem">No exercises selected. Configure to add.</td></tr>';
      } else {
        active.forEach(function(ex) {
          rows += '<tr data-ex="' + ex.id + '">' +
            '<td data-label="Done"><input type="checkbox" class="log-toggle" data-day="' + day.id + '" data-ex="' + ex.id + '"' + (ex.done ? ' checked' : '') + '></td>' +
            '<td data-label="Exercise">' + ex.name + '</td>' +
            '<td data-label="Target">' + ex.muscle + '</td>' +
            '<td data-label="Sets"><input type="number" value="' + ex.sets + '" min="1" data-field="sets" data-day="' + day.id + '" data-ex="' + ex.id + '"></td>' +
            '<td data-label="Reps"><input type="number" value="' + ex.reps + '" min="1" data-field="reps" data-day="' + day.id + '" data-ex="' + ex.id + '"></td>' +
            '<td data-label="Weight"><input type="number" value="' + ex.weight + '" min="0" data-field="weight" data-day="' + day.id + '" data-ex="' + ex.id + '"></td>' +
            '</tr>';
        });
      }
      
      var tableEnd = '</tbody></table>';
      card.innerHTML = header + tableStart + rows + tableEnd;
      grid.appendChild(card);
    });
  },

  initChart: function() {
    var ctx = document.getElementById('volumeChart');
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
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#2a2e35' }, ticks: { color: '#9ca3af' } },
          y: { beginAtZero: true, grid: { color: '#2a2e35' }, ticks: { color: '#9ca3af' } }
        }
      }
    });
  },

  updateReport: function() {
    var today = new Date();
    var dates = [], volumes = [];
    var weekVol = 0;
    var self = this;

    for (var i = 6; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var ds = d.toISOString().split('T')[0];
      dates.push(ds.slice(5));
      
      var v = 0;
      this.state.logs.filter(function(l) { 
        return l.date === ds && l.completed; 
      }).forEach(function(l) { 
        v += (l.sets * l.reps * l.weight); 
      });
      weekVol += v;
      volumes.push(v);
    }

    var summary = document.getElementById('weekly-summary');
    if (summary) {
      var dayCounts = {};
      this.state.logs.forEach(function(l) {
        var dayName = 'Unknown';
        var dayObj = self.state.days.find(function(d) { return d.id === l.dayId; });
        if (dayObj && dayObj.name) {
          dayName = dayObj.name.split(' - ')[0];
        }
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
      });

      var html = '<div class="summary-row"><span>Total Volume (7d)</span><span class="summary-val">' + weekVol.toLocaleString() + ' kg</span></div>' +
        '<div class="summary-row"><span>Exercises Logged</span><span class="summary-val">' + this.state.logs.length + '</span></div>';
      
      ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'].forEach(function(name) {
        var count = dayCounts[name] || 0;
        html += '<div class="summary-row"><span>' + name + '</span><span class="summary-val">' + count + ' completed</span></div>';
      });
      summary.innerHTML = html;
    }

    if (this.chart) {
      this.chart.data.labels = dates;
      this.chart.data.datasets[0].data = volumes;
      this.chart.update();
    }
  },

  setupEvents: function() {
    var self = this;

    // Input auto-save
    document.addEventListener('input', function(e) {
      if (!e.target.matches('input[data-day][data-ex][data-field]')) return;
      var day = e.target.dataset.day;
      var ex = e.target.dataset.ex;
      var field = e.target.dataset.field;
      var d = self.state.days.find(function(x) { return x.id === day; });
      if (!d) return;
      var exRef = d.exercises.find(function(x) { return x.id === ex; });
      if (!exRef) return;
      
      var val = e.target.value;
      if (field === 'sets' || field === 'reps' || field === 'weight') {
        exRef[field] = parseFloat(val) || 0;
      } else {
        exRef[field] = val;
      }
      self.saveState();
    });

    // Checkbox logging
    document.addEventListener('change', function(e) {
      if (!e.target.matches('.log-toggle')) return;
      var day = e.target.dataset.day;
      var ex = e.target.dataset.ex;
      var d = self.state.days.find(function(x) { return x.id === day; });
      if (!d) return;
      var exRef = d.exercises.find(function(x) { return x.id === ex; });
      if (!exRef) return;

      exRef.done = e.target.checked;
      var today = new Date().toISOString().split('T')[0];
      
      if (e.target.checked) {
        var exists = self.state.logs.some(function(l) {
          return l.date === today && l.dayId === day && l.exId === ex;
        });
        if (!exists) {
          self.state.logs.push({
            date: today, dayId: day, exId: ex,
            name: exRef.name, sets: exRef.sets, reps: exRef.reps, 
            weight: exRef.weight, completed: true
          });
        }
      } else {
        self.state.logs = self.state.logs.filter(function(l) {
          return !(l.date === today && l.dayId === day && l.exId === ex);
        });
      }
      self.saveState();
    });

    // Button clicks
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var action = btn.dataset.action;
      var day = btn.dataset.day;

      if (action === 'configure') {
        self.configDayId = day;
        var modal = document.getElementById('config-modal');
        var title = document.getElementById('config-title');
        var list = document.getElementById('config-list');
        if (title && list) {
          var dayObj = self.state.days.find(function(d) { return d.id === day; });
          title.textContent = 'Configure ' + (dayObj ? dayObj.name : 'Day');
          list.innerHTML = '';
          var lib = LIBRARY[day] || [];
          var activeIds = (dayObj && dayObj.activeIds) || [];
          lib.forEach(function(item) {
            var checked = activeIds.indexOf(item.id) !== -1 ? 'checked' : '';
            list.innerHTML += '<label class="checkbox-item">' +
              '<input type="checkbox" value="' + item.id + '" ' + checked + '>' +
              '<span>' + item.name + ' <small style="color:var(--text-muted)">(' + item.muscle + ')</small></span>' +
              '</label>';
          });
          modal.showModal();
        }
      }
      
      if (action === 'log-all') {
        var today = new Date().toISOString().split('T')[0];
        var active = self.getActiveExercises(day);
        active.forEach(function(ex) {
          var exists = self.state.logs.some(function(l) {
            return l.date === today && l.dayId === day && l.exId === ex.id;
          });
          if (!exists) {
            self.state.logs.push({ 
              date: today, dayId: day, exId: ex.id, name: ex.name,
              sets: ex.sets, reps: ex.reps, weight: ex.weight, completed: true 
            });
          }
          ex.done = true;
        });
        self.renderDays();
        self.saveState();
      }
    });

    // Config form submit
    var configForm = document.getElementById('config-form');
    if (configForm) {
      configForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var checked = Array.from(document.querySelectorAll('#config-list input:checked'))
          .map(function(cb) { return cb.value; });
        var d = self.state.days.find(function(x) { return x.id === self.configDayId; });
        if (d) {
          d.activeIds = checked;
          d.exercises.forEach(function(ex) {
            if (checked.indexOf(ex.id) === -1) {
              var isAbs = ex.muscle === 'Abs';
              ex.sets = isAbs ? 3 : 4;
              ex.reps = isAbs ? 30 : 10;
              ex.weight = 0;
              ex.done = false;
            }
          });
        }
        document.getElementById('config-modal').close();
        self.renderDays();
        self.saveState();
      });
    }

    // Cancel modal
    var cancelBtn = document.getElementById('btn-cancel-config');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        document.getElementById('config-modal').close();
      });
    }

    // Theme toggle
    var themeBtn = document.getElementById('btn-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', function() {
        self.state.theme = self.state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', self.state.theme);
        themeBtn.textContent = self.state.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
        self.saveState();
        if (self.chart) {
          self.chart.data.datasets[0].borderColor = self.state.theme === 'dark' ? '#3b82f6' : '#2563eb';
          self.chart.update();
        }
      });
    }

    // New week button
    var resetBtn = document.getElementById('btn-reset-week');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (confirm('Start a new week? This resets checkboxes but keeps history.')) {
          self.state.days.forEach(function(d) {
            d.exercises.forEach(function(e) { e.done = false; });
          });
          self.state.weekStart = new Date().toISOString().split('T')[0];
          self.renderDays();
          self.saveState();
        }
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
