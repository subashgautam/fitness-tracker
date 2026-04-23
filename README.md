# 🏋️ FitTrack Pro - 5-Day Split Tracker

A zero-backend, static fitness tracker designed for GitHub Pages. Track your 5-day split, rotate exercises weekly, auto-save inputs, and generate weekly progress reports.

## ✨ Features
- 📅 **Exact 5-Day Split**: Push, Pull, Legs+Abs, Upper, Lower pre-loaded.
- 🔄 **Weekly Rotation**: Click `⚙️ Configure` on any day to toggle exercises in/out of your current schedule. Perfect for splitting heavy days across weeks.
- ✅ **Instant Logging**: Checkboxes mark exercises done and log them with today's date, weight, sets, and reps.
- 📊 **Weekly Report**: Shows volume per day, total weekly kg lifted, and a 7-day trend chart.
- 💾 **Auto-Save & Offline**: All data persists in `localStorage`. Works without internet after first load.
- 🌗 **Dark/Light Mode**: Seamless toggle with saved preference.
- 📱 **Fully Responsive**: Mobile-optimized tables and clean UI.

## 🚀 Deploy to GitHub Pages
1. Create a new GitHub repo.
2. Upload `index.html`, `style.css`, `app.js`, `README.md`.
3. Go to **Settings → Pages → Source → Deploy from branch → `main` → `/ (root)`**.
4. Live at: `https://YOUR_USERNAME.github.io/REPO_NAME/`

## 🛠️ How It Works
- **Rotation System**: `LIBRARY` stores all exercises. Each day tracks `activeIds` (what you want this week). Configure modal updates this list instantly.
- **Logging**: Checking a box adds a record to `state.logs` with today's timestamp. Unchecking removes it. Prevents duplicate daily entries.
- **Analytics**: Calculates `sets × reps × weight` for the last 7 days. Chart.js renders a smooth volume trend line.
- **Persistence**: `localStorage` saves state on every `input` or `change`. No server required.

## 🧩 Tips
- Click `✅ Log All` to quickly mark your entire session as done.
- Use `🔄 New Week` to reset checkboxes for the next training cycle without losing history.
- Clear data: DevTools → Application → Local Storage → Delete `fittrack_pro_v1`.

*Built for reliability, simplicity, and serious lifters.*
