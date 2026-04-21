# IRONLOG — Fitness Tracker

A fully static, single-page fitness tracker for strength training and cardio. No backend, no build step, no dependencies to install. Works entirely in the browser with localStorage.

---

## Features

- **3-Day Split Planner** (Push / Pull / Legs) — pre-loaded with exercises
- **Inline editing** for sets, reps and weight
- **Per-exercise volume** (sets × reps × weight) calculated live
- **Add / remove** exercises and days dynamically
- **Quick Add** modal for fast exercise entry
- **Duplicate previous workout** to reuse last session's weights
- **Cardio log** — Running, Treadmill, Cycling, Stairmaster with duration / distance / calories
- **Progress charts** — max weight and volume per exercise over time
- **Weekly volume bar chart** on the dashboard
- **Auto-save** — all changes persist instantly via localStorage
- **Dark industrial UI** — mobile responsive

---

## Project Structure

```
fitness-tracker/
├── index.html     # App shell + markup
├── style.css      # All styles (CSS variables, responsive)
├── app.js         # All logic (modular sections, no build required)
└── README.md
```

---

## Running Locally

Just open `index.html` in any modern browser — no server needed.

```bash
# Optional: serve with Python for a local server experience
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## Deploying to GitHub Pages

### Option A — Repository root

1. Create a new GitHub repository (e.g. `fitness-tracker`)
2. Upload the three files (`index.html`, `style.css`, `app.js`) to the root
3. Go to **Settings → Pages**
4. Under **Source**, select `Deploy from a branch`, choose `main` and `/ (root)`
5. Click **Save** — your site will be live at:
   `https://<your-username>.github.io/<repo-name>/`

### Option B — GitHub CLI

```bash
git init
git add .
git commit -m "init: IRONLOG fitness tracker"
gh repo create fitness-tracker --public --push --source=.
# Then enable Pages in repo settings as above
```

### Option C — Deploy via drag-and-drop (no Git)

Use [GitHub.dev](https://github.dev) or upload files directly through the GitHub web UI, then enable Pages in settings.

---

## Data Storage

All data is stored in your browser's **localStorage** under these keys:

| Key | Contents |
|---|---|
| `ironlog_days` | Workout days and all exercises |
| `ironlog_workout_logs` | Historical workout snapshots by date |
| `ironlog_cardio` | Cardio session log |

Data persists across page refreshes and browser restarts. To reset, open DevTools → Application → Local Storage → delete the three keys.

---

## Customising

- **Add your own exercises**: Click any day → `+ Add Exercise`, or use the `+ Quick Add Exercise` button on the Dashboard.
- **Rename days**: Click the day name at the top of each panel and type a new name.
- **Add new days**: Click `+ Add Day` in the Workout view.
- **Change default data**: Edit the `defaultDays()` function in `app.js`.

---

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## License

MIT — use freely, no attribution required.
